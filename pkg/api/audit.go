package api

import (
	"net/http"
	"strconv"
)

func (a *API) queryAuditLog(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	entityType := q.Get("entity_type")
	entityID := q.Get("entity_id")

	limit := 50
	if l := q.Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil {
			limit = v
		}
	}
	offset := 0
	if o := q.Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil {
			offset = v
		}
	}

	events, err := a.Audit.Query(entityType, entityID, limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, events)
}
