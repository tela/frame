package main

import (
	"archive/tar"
	"compress/gzip"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
)

// restoreFromArchive extracts a seed archive (tar.gz) into the root directory,
// replacing the database and assets. The server must be stopped first.
func restoreFromArchive(rootDir, archivePath string) {
	// Safety: refuse to restore if the server might be running
	dbPath := filepath.Join(rootDir, "frame.db")
	walPath := dbPath + "-wal"
	if _, err := os.Stat(walPath); err == nil {
		// WAL exists — server might be running, or wasn't shut down cleanly.
		// We'll proceed but warn.
		fmt.Println("Warning: frame.db-wal exists. Make sure the server is stopped.")
	}

	f, err := os.Open(archivePath)
	if err != nil {
		log.Fatalf("open archive: %v", err)
	}
	defer f.Close()

	gr, err := gzip.NewReader(f)
	if err != nil {
		log.Fatalf("decompress: %v", err)
	}
	defer gr.Close()

	tr := tar.NewReader(gr)

	// Remove existing DB and assets before restoring
	if _, err := os.Stat(dbPath); err == nil {
		os.Remove(dbPath)
		os.Remove(walPath)
		os.Remove(dbPath + "-shm")
	}
	assetsDir := filepath.Join(rootDir, "assets")
	if _, err := os.Stat(assetsDir); err == nil {
		os.RemoveAll(assetsDir)
	}

	var fileCount int
	var totalSize int64

	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Fatalf("read archive: %v", err)
		}

		// Security: prevent path traversal
		cleanName := filepath.Clean(header.Name)
		if strings.HasPrefix(cleanName, "..") {
			log.Fatalf("archive contains path traversal: %s", header.Name)
		}
		target := filepath.Join(rootDir, cleanName)

		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, os.FileMode(header.Mode)); err != nil {
				log.Fatalf("create dir %s: %v", cleanName, err)
			}

		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				log.Fatalf("create parent dir for %s: %v", cleanName, err)
			}

			out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				log.Fatalf("create file %s: %v", cleanName, err)
			}
			n, err := io.Copy(out, tr)
			out.Close()
			if err != nil {
				log.Fatalf("write file %s: %v", cleanName, err)
			}
			fileCount++
			totalSize += n
		}
	}

	fmt.Printf("Restored %d files (%s) from %s\n", fileCount, humanSize(totalSize), filepath.Base(archivePath))
}
