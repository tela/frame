package config

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"github.com/BurntSushi/toml"
)

// Config holds the application configuration.
type Config struct {
	Port       int    `toml:"port"`
	Root       string `toml:"-"`          // resolved drive root, not stored in TOML
	BifrostURL string `toml:"bifrost_url"` // Bifrost service URL for image generation
	FigURL     string `toml:"fig_url"`     // Fig studio URL for character/media sync
	FigSecret  string `toml:"fig_secret"`  // Shared secret for Fig→Frame auth (optional)
}

// defaults
const (
	DefaultPort       = 7890
	DefaultBifrostURL = "http://localhost:9090"
	DefaultFigURL     = "http://localhost:7700"
	ConfigFileName    = "frame.toml"
)

// fileConfig is the TOML file structure.
type fileConfig struct {
	Port       int    `toml:"port"`
	BifrostURL string `toml:"bifrost_url"`
	FigURL     string `toml:"fig_url"`
	FigSecret  string `toml:"fig_secret"`
}

// Load resolves configuration from CLI flags and the TOML config file.
// Priority: CLI flags > TOML file > defaults.
func Load() (*Config, error) {
	portFlag := flag.Int("port", 0, "HTTP server port (overrides config file)")
	rootFlag := flag.String("root", "", "Drive root directory (overrides auto-detection)")
	bifrostFlag := flag.String("bifrost", "", "Bifrost service URL (overrides config file)")
	figFlag := flag.String("fig", "", "Fig studio URL (overrides config file)")
	flag.Parse()

	root, err := resolveRoot(*rootFlag)
	if err != nil {
		return nil, fmt.Errorf("resolve drive root: %w", err)
	}

	cfg := &Config{
		Port:       DefaultPort,
		BifrostURL: DefaultBifrostURL,
		FigURL:     DefaultFigURL,
		Root:       root,
	}

	// Load TOML config if it exists
	configPath := filepath.Join(root, ConfigFileName)
	if _, err := os.Stat(configPath); err == nil {
		var fc fileConfig
		if _, err := toml.DecodeFile(configPath, &fc); err != nil {
			return nil, fmt.Errorf("parse %s: %w", configPath, err)
		}
		if fc.Port != 0 {
			cfg.Port = fc.Port
		}
		if fc.BifrostURL != "" {
			cfg.BifrostURL = fc.BifrostURL
		}
		if fc.FigURL != "" {
			cfg.FigURL = fc.FigURL
		}
		if fc.FigSecret != "" {
			cfg.FigSecret = fc.FigSecret
		}
	}

	// Environment variable overrides
	if env := os.Getenv("BIFROST_URL"); env != "" {
		cfg.BifrostURL = env
	}
	if env := os.Getenv("FIG_URL"); env != "" {
		cfg.FigURL = env
	}
	if env := os.Getenv("FIG_SECRET"); env != "" {
		cfg.FigSecret = env
	}

	// CLI flags override everything
	if *portFlag != 0 {
		cfg.Port = *portFlag
	}
	if *bifrostFlag != "" {
		cfg.BifrostURL = *bifrostFlag
	}
	if *figFlag != "" {
		cfg.FigURL = *figFlag
	}

	return cfg, nil
}

// resolveRoot finds the drive root directory.
// Priority: explicit flag > directory containing the binary > current working directory.
func resolveRoot(explicit string) (string, error) {
	if explicit != "" {
		abs, err := filepath.Abs(explicit)
		if err != nil {
			return "", err
		}
		return abs, nil
	}

	// Check next to the executable
	exe, err := os.Executable()
	if err == nil {
		exeDir := filepath.Dir(exe)
		if hasConfigFile(exeDir) {
			return exeDir, nil
		}
	}

	// Check current working directory
	cwd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("get working directory: %w", err)
	}
	if hasConfigFile(cwd) {
		return cwd, nil
	}

	// Fall back to CWD even without config file (first run)
	return cwd, nil
}

func hasConfigFile(dir string) bool {
	_, err := os.Stat(filepath.Join(dir, ConfigFileName))
	return err == nil
}
