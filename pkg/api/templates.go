package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/template"
)

func (a *API) listTemplates(w http.ResponseWriter, r *http.Request) {
	templates, err := a.Templates.List()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if templates == nil {
		templates = []template.Template{}
	}
	writeJSON(w, http.StatusOK, templates)
}

func (a *API) createTemplate(w http.ResponseWriter, r *http.Request) {
	var t template.Template
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if t.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if t.ID == "" {
		t.ID = id.New()
	}
	if t.Parameters == "" {
		t.Parameters = "{}"
	}
	if t.FacetTags == "" {
		t.FacetTags = "[]"
	}
	now := time.Now().UTC()
	t.CreatedAt = now
	t.UpdatedAt = now
	if err := a.Templates.Create(&t); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func (a *API) getTemplate(w http.ResponseWriter, r *http.Request) {
	tmplID := r.PathValue("id")
	t, err := a.Templates.Get(tmplID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if t == nil {
		writeError(w, http.StatusNotFound, "template not found")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (a *API) updateTemplate(w http.ResponseWriter, r *http.Request) {
	tmplID := r.PathValue("id")
	var t template.Template
	if err := json.NewDecoder(r.Body).Decode(&t); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	t.ID = tmplID
	if err := a.Templates.Update(&t); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (a *API) deleteTemplate(w http.ResponseWriter, r *http.Request) {
	tmplID := r.PathValue("id")
	if err := a.Templates.Delete(tmplID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (a *API) duplicateTemplate(w http.ResponseWriter, r *http.Request) {
	srcID := r.PathValue("id")
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Name == "" {
		req.Name = "Copy"
	}
	dup, err := a.Templates.Duplicate(srcID, id.New(), req.Name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, dup)
}
