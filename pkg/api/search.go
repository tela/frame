package api

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/tela/frame/pkg/image"
)

func (a *API) searchImages(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	params := &image.SearchParams{
		CharacterID:  q.Get("character"),
		EraID:        q.Get("era"),
		Source:       q.Get("source"),
		SetType:      q.Get("set_type"),
		TriageStatus: q.Get("triage_status"),
		Query:        q.Get("q"),
		DateFrom:     q.Get("date_from"),
		DateTo:       q.Get("date_to"),
		SortBy:       q.Get("sort"),
	}

	if tags := q.Get("tags"); tags != "" {
		params.Tags = strings.Split(tags, ",")
	}

	if ratingStr := q.Get("rating_min"); ratingStr != "" {
		if v, err := strconv.Atoi(ratingStr); err == nil {
			params.RatingMin = v
		}
	}

	if limitStr := q.Get("limit"); limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil {
			params.Limit = v
		}
	}

	if offsetStr := q.Get("offset"); offsetStr != "" {
		if v, err := strconv.Atoi(offsetStr); err == nil {
			params.Offset = v
		}
	}

	if hasChar := q.Get("has_character"); hasChar != "" {
		v := hasChar == "true"
		params.HasCharacter = &v
	}

	results, err := a.Images.Search(params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, results)
}
