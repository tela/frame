package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/tela/frame/pkg/database"
)

// Server is the Frame HTTP server.
type Server struct {
	mux     *http.ServeMux
	db      *database.DB
	version string
}

// New creates a new Server.
func New(db *database.DB, version string) *Server {
	s := &Server{
		mux:     http.NewServeMux(),
		db:      db,
		version: version,
	}
	s.mux.HandleFunc("GET /health", s.handleHealth)
	return s
}

// Mux returns the underlying ServeMux for registering additional routes.
func (s *Server) Mux() *http.ServeMux {
	return s.mux
}

// DB returns the database connection.
func (s *Server) DB() *database.DB {
	return s.db
}

// ListenAndServe starts the server and blocks until shutdown.
// It handles SIGINT and SIGTERM for graceful shutdown to protect SQLite.
func (s *Server) ListenAndServe(port int) error {
	addr := fmt.Sprintf(":%d", port)
	srv := &http.Server{
		Addr:    addr,
		Handler: s.mux,
	}

	// Channel to capture server errors
	errCh := make(chan error, 1)
	go func() {
		ln, err := net.Listen("tcp", addr)
		if err != nil {
			errCh <- err
			return
		}
		log.Printf("frame %s listening on http://localhost:%d", s.version, port)
		errCh <- srv.Serve(ln)
	}()

	// Wait for interrupt or server error
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return err
	case sig := <-sigCh:
		log.Printf("received %s, shutting down...", sig)
	}

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}

	return nil
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"version": s.version,
	})
}
