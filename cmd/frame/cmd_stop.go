package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func cmdStop() {
	// Find frame processes (excluding this one)
	out, err := exec.Command("pgrep", "-f", "frame serve").Output()
	if err != nil {
		fmt.Println("No running frame serve processes found.")
	} else {
		pids := strings.Fields(strings.TrimSpace(string(out)))
		myPid := fmt.Sprintf("%d", os.Getpid())
		killed := 0
		for _, pid := range pids {
			if pid == myPid {
				continue
			}
			cmd := exec.Command("kill", pid)
			if err := cmd.Run(); err == nil {
				fmt.Printf("Killed frame serve (pid %s)\n", pid)
				killed++
			}
		}
		if killed == 0 {
			fmt.Println("No running frame serve processes found.")
		}
	}

	// Kill Vite dev server if running
	out, err = exec.Command("pgrep", "-f", "vite.*ui").Output()
	if err == nil {
		pids := strings.Fields(strings.TrimSpace(string(out)))
		for _, pid := range pids {
			cmd := exec.Command("kill", pid)
			if err := cmd.Run(); err == nil {
				fmt.Printf("Killed vite dev server (pid %s)\n", pid)
			}
		}
	}
}
