package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type browseEntry struct {
	Name          string `json:"name"`
	IsDir         bool   `json:"is_dir"`
	Size          int64  `json:"size,omitempty"`
	ChildrenCount int    `json:"children_count,omitempty"`
}

type browseResponse struct {
	Path    string        `json:"path"`
	Entries []browseEntry `json:"entries"`
}

var imageExtensions = map[string]bool{
	".png": true, ".jpg": true, ".jpeg": true, ".webp": true,
	".tiff": true, ".tif": true,
}

func (a *API) handleBrowse(w http.ResponseWriter, r *http.Request) {
	requestedPath := r.URL.Query().Get("path")
	if requestedPath == "" {
		requestedPath = a.defaultBrowseRoot()
	}

	// Security: resolve symlinks and verify the path is within allowed roots
	absPath, err := filepath.Abs(requestedPath)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid path")
		return
	}

	if !a.isAllowedBrowsePath(absPath) {
		writeError(w, http.StatusForbidden, "path is outside allowed roots")
		return
	}

	info, err := os.Stat(absPath)
	if err != nil {
		writeError(w, http.StatusNotFound, "path not found")
		return
	}
	if !info.IsDir() {
		writeError(w, http.StatusBadRequest, "path is not a directory")
		return
	}

	dirEntries, err := os.ReadDir(absPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read directory")
		return
	}

	var entries []browseEntry
	for _, de := range dirEntries {
		name := de.Name()
		// Skip hidden files/dirs
		if strings.HasPrefix(name, ".") {
			continue
		}

		if de.IsDir() {
			// Count image children
			childCount := countImages(filepath.Join(absPath, name))
			entries = append(entries, browseEntry{
				Name:          name,
				IsDir:         true,
				ChildrenCount: childCount,
			})
		} else {
			ext := strings.ToLower(filepath.Ext(name))
			if imageExtensions[ext] {
				fi, _ := de.Info()
				size := int64(0)
				if fi != nil {
					size = fi.Size()
				}
				entries = append(entries, browseEntry{
					Name:  name,
					IsDir: false,
					Size:  size,
				})
			}
		}
	}

	writeJSON(w, http.StatusOK, browseResponse{
		Path:    absPath,
		Entries: entries,
	})
}

func countImages(dir string) int {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return 0
	}
	count := 0
	for _, e := range entries {
		if !e.IsDir() && !strings.HasPrefix(e.Name(), ".") {
			ext := strings.ToLower(filepath.Ext(e.Name()))
			if imageExtensions[ext] {
				count++
			}
		}
	}
	return count
}

func (a *API) defaultBrowseRoot() string {
	// In dev: use {root}/imports/ if it exists
	importsDir := filepath.Join(a.RootPath, "imports")
	if info, err := os.Stat(importsDir); err == nil && info.IsDir() {
		return importsDir
	}
	return a.RootPath
}

// isWithinDir checks whether absPath is inside root after resolving symlinks.
// Uses filepath.Rel instead of strings.HasPrefix to prevent prefix-spoofing
// (e.g., /allowed-evil/../secret matching /allowed).
func isWithinDir(absPath, root string) bool {
	// Resolve symlinks for both paths so a symlink can't escape.
	realPath, err := filepath.EvalSymlinks(absPath)
	if err != nil {
		realPath = absPath // path may not exist yet (export); fall back
	}
	realRoot, err := filepath.EvalSymlinks(root)
	if err != nil {
		realRoot = root
	}
	rel, err := filepath.Rel(realRoot, realPath)
	if err != nil {
		return false
	}
	// Rel returns ".." prefix if the path escapes root.
	return !strings.HasPrefix(rel, "..")
}

func (a *API) isAllowedBrowsePath(absPath string) bool {
	// Allow browsing within the root path
	if isWithinDir(absPath, a.RootPath) {
		return true
	}
	// Allow browsing the home directory imports folder (dev convenience)
	home, err := os.UserHomeDir()
	if err == nil {
		devImports := filepath.Join(home, ".frame-dev", "imports")
		if isWithinDir(absPath, devImports) {
			return true
		}
	}
	return false
}
