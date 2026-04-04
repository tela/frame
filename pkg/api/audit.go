package api

import (
	"net/http"
	"strconv"

	"github.com/tela/frame/pkg/audit"
)

func (a *API) queryAuditLog(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	params := &audit.QueryParams{
		EntityType: q.Get("entity_type"),
		EntityID:   q.Get("entity_id"),
		Action:     q.Get("action"),
		Search:     q.Get("q"),
		DateFrom:   q.Get("date_from"),
		DateTo:     q.Get("date_to"),
	}

	if l := q.Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil {
			params.Limit = v
		}
	}
	if o := q.Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil {
			params.Offset = v
		}
	}

	events, err := a.Audit.QueryFiltered(params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, events)
}
