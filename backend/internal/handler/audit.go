package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/finchley-foodbank/foodbank/internal/model"
	"github.com/finchley-foodbank/foodbank/internal/repository"
)

type AuditHandler struct {
	auditRepo *repository.AuditRepository
}

func NewAuditHandler(auditRepo *repository.AuditRepository) *AuditHandler {
	return &AuditHandler{auditRepo: auditRepo}
}

// List returns paginated audit logs with optional filtering
func (h *AuditHandler) List(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	query := r.URL.Query()

	limit := 50
	if l := query.Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	offset := 0
	if o := query.Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	tableName := query.Get("table")

	var recordID *uuid.UUID
	if rid := query.Get("record_id"); rid != "" {
		if parsed, err := uuid.Parse(rid); err == nil {
			recordID = &parsed
		}
	}

	logs, total, err := h.auditRepo.List(r.Context(), tableName, recordID, limit, offset)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if logs == nil {
		logs = []model.AuditLog{}
	}

	response := model.AuditLogListResponse{
		Logs:   logs,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetByRecord returns audit logs for a specific record
func (h *AuditHandler) GetByRecord(w http.ResponseWriter, r *http.Request) {
	tableName := chi.URLParam(r, "table")
	recordIDStr := chi.URLParam(r, "id")

	recordID, err := uuid.Parse(recordIDStr)
	if err != nil {
		http.Error(w, "Invalid record ID", http.StatusBadRequest)
		return
	}

	logs, err := h.auditRepo.GetByRecordID(r.Context(), tableName, recordID)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if logs == nil {
		logs = []model.AuditLog{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}
