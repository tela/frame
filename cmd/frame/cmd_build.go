package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
)

func cmdBuild() {
	fmt.Println("Building frontend...")

	cmd := exec.Command("pnpm", "run", "build")
	cmd.Dir = "ui"
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		log.Fatalf("build failed: %v", err)
	}

	fmt.Println("Frontend built to internal/frontend/dist/")
}
