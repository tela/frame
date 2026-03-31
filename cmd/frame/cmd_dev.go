package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"syscall"
)

const (
	devPort = "7890"
	devRoot = ".dev"
)

func cmdDev() {
	fmt.Println("Starting Frame dev environment...")
	fmt.Printf("  port: %s  root: %s\n", devPort, devRoot)

	// Ensure .dev directory exists
	os.MkdirAll(devRoot, 0755)

	// Start the Go server in background with explicit dev port and root
	serverCmd := exec.Command(os.Args[0], "serve", "--port", devPort, "--root", devRoot)
	serverCmd.Stdout = os.Stdout
	serverCmd.Stderr = os.Stderr
	if err := serverCmd.Start(); err != nil {
		log.Fatalf("start server: %v", err)
	}
	fmt.Printf("  Go server started (pid %d)\n", serverCmd.Process.Pid)

	// Start Vite dev server
	viteCmd := exec.Command("pnpm", "run", "dev")
	viteCmd.Dir = "ui"
	viteCmd.Stdout = os.Stdout
	viteCmd.Stderr = os.Stderr
	if err := viteCmd.Start(); err != nil {
		serverCmd.Process.Kill()
		log.Fatalf("start vite: %v", err)
	}
	fmt.Printf("  Vite dev server started (pid %d)\n", viteCmd.Process.Pid)
	fmt.Println("  Press Ctrl-C to stop both")

	// Wait for signal
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig

	fmt.Println("\nShutting down...")
	serverCmd.Process.Signal(syscall.SIGTERM)
	viteCmd.Process.Signal(syscall.SIGTERM)
	serverCmd.Wait()
	viteCmd.Wait()
	fmt.Println("Done.")
}
