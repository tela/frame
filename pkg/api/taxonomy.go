package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/tag"
)

func (a *API) getFamilyTaxonomy(w http.ResponseWriter, r *http.Request) {
	familyID := r.PathValue("id")
	taxonomy, err := a.Tags.GetFamilyTaxonomy(familyID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if taxonomy == nil {
		writeError(w, http.StatusNotFound, "family not found")
		return
	}
	writeJSON(w, http.StatusOK, taxonomy)
}

func (a *API) listNamespaces(w http.ResponseWriter, r *http.Request) {
	familyID := r.PathValue("id")
	namespaces, err := a.Tags.ListNamespaces(familyID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if namespaces == nil {
		namespaces = []tag.Namespace{}
	}
	writeJSON(w, http.StatusOK, namespaces)
}

func (a *API) createNamespace(w http.ResponseWriter, r *http.Request) {
	familyID := r.PathValue("id")
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	ns := &tag.Namespace{
		ID:          id.New(),
		FamilyID:    familyID,
		Name:        req.Name,
		Description: req.Description,
		CreatedAt:   time.Now().UTC(),
	}
	if err := a.Tags.CreateNamespace(ns); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, ns)
}

func (a *API) deleteNamespace(w http.ResponseWriter, r *http.Request) {
	nsID := r.PathValue("nsId")
	if err := a.Tags.DeleteNamespace(nsID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (a *API) listAllowedValues(w http.ResponseWriter, r *http.Request) {
	nsID := r.PathValue("nsId")
	values, err := a.Tags.ListAllowedValues(nsID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if values == nil {
		values = []tag.AllowedValue{}
	}
	writeJSON(w, http.StatusOK, values)
}

func (a *API) createAllowedValue(w http.ResponseWriter, r *http.Request) {
	nsID := r.PathValue("nsId")
	var req struct {
		Value       string `json:"value"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Value == "" {
		writeError(w, http.StatusBadRequest, "value is required")
		return
	}

	v := &tag.AllowedValue{
		ID:          id.New(),
		NamespaceID: nsID,
		Value:       req.Value,
		Description: req.Description,
		CreatedAt:   time.Now().UTC(),
	}
	if err := a.Tags.CreateAllowedValue(v); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, v)
}

func (a *API) deleteAllowedValue(w http.ResponseWriter, r *http.Request) {
	valID := r.PathValue("valId")
	if err := a.Tags.DeleteAllowedValue(valID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (a *API) validateTag(w http.ResponseWriter, r *http.Request) {
	familyID := r.URL.Query().Get("family")
	namespace := r.URL.Query().Get("namespace")
	value := r.URL.Query().Get("value")

	if familyID == "" || namespace == "" || value == "" {
		writeError(w, http.StatusBadRequest, "family, namespace, and value query params required")
		return
	}

	valid, err := a.Tags.ValidateTag(familyID, namespace, value)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"valid": valid})
}
