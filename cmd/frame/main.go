package main

import (
	"fmt"
	"os"
)

var version = "dev"

func main() {
	cmd := "serve"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
		// Strip the subcommand so flag.Parse in config.Load doesn't choke
		os.Args = append(os.Args[:1], os.Args[2:]...)
	}

	switch cmd {
	case "serve":
		cmdServe()
	case "dev":
		cmdDev()
	case "seed":
		cmdSeed()
	case "smoke":
		cmdSmoke()
	case "stop":
		cmdStop()
	case "status":
		cmdStatus()
	case "build":
		cmdBuild()
	case "version":
		fmt.Println("frame", version)
	case "help", "-h", "--help":
		printHelp()
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n\n", cmd)
		printHelp()
		os.Exit(1)
	}
}

func printHelp() {
	fmt.Println(`Usage: frame <command> [flags]

Commands:
  serve     Start the HTTP server (default if no command given)
  dev       Start server + Vite dev server, ctrl-c kills both
  seed      Create test characters, eras, wardrobe, and LoRAs
  stop      Kill any running frame processes
  status    Show running state, ports, Fig/Bifrost connection
  smoke     Run smoke tests against a running server
  build     Rebuild frontend dist
  version   Print version`)
}
