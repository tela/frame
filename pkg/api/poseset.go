package api

import (
	"encoding/json"
	"net/http"
)

func (a *API) getPoseSetStatus(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	eraID := r.URL.Query().Get("era_id")
	if eraID == "" {
		writeError(w, http.StatusBadRequest, "era_id query parameter is required")
		return
	}

	status, err := a.PoseSet.GetStatus(charID, eraID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, status)
}

func (a *API) updatePoseSetImage(w http.ResponseWriter, r *http.Request) {
	charID := r.PathValue("id")
	var req struct {
		EraID    string `json:"era_id"`
		PoseID   string `json:"pose_id"`
		OutfitID string `json:"outfit_id"`
		ImageID  string `json:"image_id"`
		Status   string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.EraID == "" || req.PoseID == "" {
		writeError(w, http.StatusBadRequest, "era_id and pose_id are required")
		return
	}
	if req.OutfitID == "" {
		req.OutfitID = "nude"
	}

	if req.ImageID != "" {
		if err := a.PoseSet.SetImage(charID, req.EraID, req.PoseID, req.OutfitID, req.ImageID, req.Status); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	} else if req.Status != "" {
		if err := a.PoseSet.UpdateStatus(charID, req.EraID, req.PoseID, req.OutfitID, req.Status); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	if a.Audit != nil && req.Status != "" {
		a.Audit.Log("pose_set", charID, "status_changed", strPtr("status"), nil, strPtr(req.Status),
			map[string]string{"era_id": req.EraID, "pose_id": req.PoseID, "outfit_id": req.OutfitID})
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func strPtr(s string) *string { return &s }

func (a *API) listStandardPoses(w http.ResponseWriter, r *http.Request) {
	poses, err := a.PoseSet.ListPoses()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, poses)
}

func (a *API) listStandardOutfits(w http.ResponseWriter, r *http.Request) {
	outfits, err := a.PoseSet.ListOutfits()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, outfits)
}
