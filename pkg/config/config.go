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
	Port int    `toml:"port"`
	Root string `toml:"-"` // resolved drive root, not stored in TOML
}

// defaults
const (
	DefaultPort     = 7890
	ConfigFileName  = "frame.toml"
)

// fileConfig is the TOML file structure.
type fileConfig struct {
	Port int `toml:"port"`
}

// Load resolves configuration from CLI flags and the TOML config file.
// Priority: CLI flags > TOML file > defaults.
func Load() (*Config, error) {
	portFlag := flag.Int("port", 0, "HTTP server port (overrides config file)")
	rootFlag := flag.String("root", "", "Drive root directory (overrides auto-detection)")
	flag.Parse()

	root, err := resolveRoot(*rootFlag)
	if err != nil {
		return nil, fmt.Errorf("resolve drive root: %w", err)
	}

	cfg := &Config{
		Port: DefaultPort,
		Root: root,
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
	}

	// CLI flags override everything
	if *portFlag != 0 {
		cfg.Port = *portFlag
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
