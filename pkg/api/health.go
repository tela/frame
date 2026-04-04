package api

import (
	"net/http"
	"runtime"
)

func (a *API) handleHealth(w http.ResponseWriter, r *http.Request) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	status := "healthy"
	checks := map[string]any{
		"database":  "ok",
		"bifrost":   "unavailable",
	}

	// Check database
	if err := a.Characters.Ping(); err != nil {
		status = "degraded"
		checks["database"] = err.Error()
	}

	// Check Bifrost
	if a.Bifrost != nil && a.Bifrost.Available() {
		checks["bifrost"] = "connected"
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status": status,
		"checks": checks,
		"memory": map[string]any{
			"alloc_mb":      m.Alloc / 1024 / 1024,
			"sys_mb":        m.Sys / 1024 / 1024,
			"goroutines":    runtime.NumGoroutine(),
		},
	})
}
