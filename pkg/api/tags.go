package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/tela/frame/pkg/id"
	"github.com/tela/frame/pkg/tag"
)

// --- Families ---

func (a *API) listTagFamilies(w http.ResponseWriter, r *http.Request) {
	families, err := a.Tags.ListFamilies()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if families == nil {
		families = []tag.Family{}
	}
	writeJSON(w, http.StatusOK, families)
}

func (a *API) createTagFamily(w http.ResponseWriter, r *http.Request) {
	var f tag.Family
	if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if f.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if f.ID == "" {
		f.ID = id.New()
	}
	f.CreatedAt = time.Now().UTC()
	if err := a.Tags.CreateFamily(&f); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, f)
}

func (a *API) updateTagFamily(w http.ResponseWriter, r *http.Request) {
	familyID := r.PathValue("id")
	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Color       string `json:"color"`
		SortOrder   int    `json:"sort_order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if err := a.Tags.UpdateFamily(familyID, req.Name, req.Description, req.Color, req.SortOrder); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (a *API) deleteTagFamily(w http.ResponseWriter, r *http.Request) {
	familyID := r.PathValue("id")
	if err := a.Tags.DeleteFamily(familyID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// --- Tags ---

func (a *API) listTags(w http.ResponseWriter, r *http.Request) {
	familyID := r.URL.Query().Get("family")
	var fp *string
	if familyID != "" {
		fp = &familyID
	}
	tags, err := a.Tags.ListTags(fp)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if tags == nil {
		tags = []tag.TagSummary{}
	}
	writeJSON(w, http.StatusOK, tags)
}

func (a *API) addImageTag(w http.ResponseWriter, r *http.Request) {
	imageID := r.PathValue("id")
	var req struct {
		TagNamespace string  `json:"tag_namespace"`
		TagValue     string  `json:"tag_value"`
		FamilyID     *string `json:"family_id,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if err := a.Tags.AddTag(imageID, req.TagNamespace, req.TagValue, "manual", req.FamilyID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"status": "added"})
}

func (a *API) removeImageTag(w http.ResponseWriter, r *http.Request) {
	imageID := r.PathValue("id")
	namespace := r.URL.Query().Get("namespace")
	value := r.URL.Query().Get("value")
	if err := a.Tags.RemoveTag(imageID, namespace, value); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "removed"})
}

func (a *API) getImageTags(w http.ResponseWriter, r *http.Request) {
	imageID := r.PathValue("id")
	tags, err := a.Tags.GetImageTags(imageID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if tags == nil {
		tags = []tag.Tag{}
	}
	writeJSON(w, http.StatusOK, tags)
}

func (a *API) bulkTag(w http.ResponseWriter, r *http.Request) {
	var req tag.BulkTagRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	affected, err := a.Tags.BulkTag(&req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"affected": affected})
}

func (a *API) renameTag(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Namespace string `json:"namespace"`
		OldValue  string `json:"old_value"`
		NewValue  string `json:"new_value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	affected, err := a.Tags.RenameTag(req.Namespace, req.OldValue, req.NewValue)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"affected": affected})
}

func (a *API) mergeTag(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Namespace string `json:"namespace"`
		FromValue string `json:"from_value"`
		ToValue   string `json:"to_value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	affected, err := a.Tags.MergeTag(req.Namespace, req.FromValue, req.ToValue)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"affected": affected})
}

func (a *API) deleteTag(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Namespace string `json:"namespace"`
		Value     string `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	affected, err := a.Tags.DeleteTag(req.Namespace, req.Value)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"affected": affected})
}
