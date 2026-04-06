package main

import (
	"archive/tar"
	"compress/gzip"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/tela/frame/pkg/config"
)

func cmdSeedExport() {
	fs := flag.NewFlagSet("seed-export", flag.ExitOnError)
	outputFlag := fs.String("o", "", "Output file path (default: seed-YYYYMMDD.tar.gz)")
	rootFlag := fs.String("root", "", "Drive root directory")
	fs.Parse(os.Args[1:])

	if *rootFlag != "" {
		os.Args = []string{os.Args[0], "--root", *rootFlag}
	} else {
		os.Args = os.Args[:1]
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// Determine output path
	output := *outputFlag
	if output == "" {
		output = fmt.Sprintf("seed-%s.tar.gz", time.Now().Format("20060102"))
	}
	if !filepath.IsAbs(output) {
		cwd, _ := os.Getwd()
		output = filepath.Join(cwd, output)
	}

	dbPath := filepath.Join(cfg.Root, "frame.db")
	assetsDir := filepath.Join(cfg.Root, "assets")

	// Verify source files exist
	if _, err := os.Stat(dbPath); err != nil {
		log.Fatalf("database not found at %s", dbPath)
	}

	// Create the archive
	outFile, err := os.Create(output)
	if err != nil {
		log.Fatalf("create output file: %v", err)
	}
	defer outFile.Close()

	gw := gzip.NewWriter(outFile)
	defer gw.Close()

	tw := tar.NewWriter(gw)
	defer tw.Close()

	var fileCount int
	var totalSize int64

	// Add frame.db
	dbSize, err := addFileToTar(tw, dbPath, "frame.db")
	if err != nil {
		log.Fatalf("add database: %v", err)
	}
	fileCount++
	totalSize += dbSize
	fmt.Printf("  frame.db (%s)\n", humanSize(dbSize))

	// Add assets/ directory tree
	if info, err := os.Stat(assetsDir); err == nil && info.IsDir() {
		err = filepath.Walk(assetsDir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			// Skip hidden files
			if strings.HasPrefix(info.Name(), ".") {
				if info.IsDir() {
					return filepath.SkipDir
				}
				return nil
			}

			relPath, err := filepath.Rel(cfg.Root, path)
			if err != nil {
				return err
			}

			if info.IsDir() {
				return addDirToTar(tw, relPath, info)
			}

			size, err := addFileToTar(tw, path, relPath)
			if err != nil {
				return err
			}
			fileCount++
			totalSize += size
			return nil
		})
		if err != nil {
			log.Fatalf("walk assets: %v", err)
		}
	}

	// Add stylist session data if present
	stylistDir := filepath.Join(cfg.Root, "stylist-sessions")
	if info, err := os.Stat(stylistDir); err == nil && info.IsDir() {
		filepath.Walk(stylistDir, func(path string, info os.FileInfo, err error) error {
			if err != nil || info.IsDir() {
				if info != nil && info.IsDir() {
					relPath, _ := filepath.Rel(cfg.Root, path)
					return addDirToTar(tw, relPath, info)
				}
				return nil
			}
			relPath, _ := filepath.Rel(cfg.Root, path)
			size, _ := addFileToTar(tw, path, relPath)
			fileCount++
			totalSize += size
			return nil
		})
	}

	// Add stylist-profile.md if present
	profilePath := filepath.Join(cfg.Root, "stylist-profile.md")
	if _, err := os.Stat(profilePath); err == nil {
		size, _ := addFileToTar(tw, profilePath, "stylist-profile.md")
		fileCount++
		totalSize += size
	}

	fmt.Printf("\nExported %d files (%s) to %s\n", fileCount, humanSize(totalSize), output)
}

func addFileToTar(tw *tar.Writer, srcPath, tarPath string) (int64, error) {
	f, err := os.Open(srcPath)
	if err != nil {
		return 0, err
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		return 0, err
	}

	header := &tar.Header{
		Name:    tarPath,
		Size:    info.Size(),
		Mode:    int64(info.Mode()),
		ModTime: info.ModTime(),
	}
	if err := tw.WriteHeader(header); err != nil {
		return 0, err
	}

	n, err := io.Copy(tw, f)
	return n, err
}

func addDirToTar(tw *tar.Writer, tarPath string, info os.FileInfo) error {
	header := &tar.Header{
		Name:     tarPath + "/",
		Typeflag: tar.TypeDir,
		Mode:     int64(info.Mode()),
		ModTime:  info.ModTime(),
	}
	return tw.WriteHeader(header)
}

func humanSize(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
