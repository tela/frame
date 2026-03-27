package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"time"
)

func cmdStatus() {
	fmt.Println("Frame Status")
	fmt.Println("============")

	// Check if frame server is running
	out, err := exec.Command("pgrep", "-f", "frame serve").Output()
	if err != nil || strings.TrimSpace(string(out)) == "" {
		fmt.Println("  Server:  not running")
	} else {
		pids := strings.Fields(strings.TrimSpace(string(out)))
		fmt.Printf("  Server:  running (pid %s)\n", pids[0])
	}

	// Check port 7890
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get("http://localhost:7890/health")
	if err != nil {
		fmt.Println("  Port:    7890 not responding")
	} else {
		resp.Body.Close()
		fmt.Println("  Port:    7890 healthy")
	}

	// Check Vite dev server
	out, err = exec.Command("pgrep", "-f", "vite.*ui").Output()
	if err != nil || strings.TrimSpace(string(out)) == "" {
		fmt.Println("  Vite:    not running")
	} else {
		fmt.Println("  Vite:    running")
	}

	// Check Fig connection
	resp, err = client.Get("http://localhost:7890/api/v1/fig/status")
	if err == nil {
		defer resp.Body.Close()
		var figStatus struct {
			Available bool   `json:"available"`
			State     string `json:"state"`
			Reason    string `json:"reason"`
		}
		json.NewDecoder(resp.Body).Decode(&figStatus)
		if figStatus.Available {
			fmt.Println("  Fig:     connected")
		} else if figStatus.Reason != "" {
			fmt.Printf("  Fig:     %s\n", figStatus.Reason)
		} else {
			fmt.Printf("  Fig:     %s\n", figStatus.State)
		}
	} else {
		fmt.Println("  Fig:     unknown (server not responding)")
	}

	// Check Bifrost connection
	resp, err = client.Get("http://localhost:7890/api/v1/bifrost/status")
	if err == nil {
		defer resp.Body.Close()
		var bfStatus struct {
			Available bool `json:"available"`
		}
		json.NewDecoder(resp.Body).Decode(&bfStatus)
		if bfStatus.Available {
			fmt.Println("  Bifrost: connected")
		} else {
			fmt.Println("  Bifrost: offline")
		}
	} else {
		fmt.Println("  Bifrost: unknown (server not responding)")
	}
}
