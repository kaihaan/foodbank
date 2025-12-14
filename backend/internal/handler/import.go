package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/finchley-foodbank/foodbank/internal/handler/middleware"
	"github.com/finchley-foodbank/foodbank/internal/model"
	"github.com/finchley-foodbank/foodbank/internal/service"
)

type ImportHandler struct {
	importService *service.ImportService
}

func NewImportHandler(importService *service.ImportService) *ImportHandler {
	return &ImportHandler{importService: importService}
}

// Template returns a CSV template for client imports
// GET /api/admin/import/template
func (h *ImportHandler) Template(w http.ResponseWriter, r *http.Request) {
	template := h.importService.GenerateCSVTemplate()

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=client-import-template.csv")
	w.Write([]byte(template))
}

// Validate validates CSV data without importing
// POST /api/admin/import/validate
func (h *ImportHandler) Validate(w http.ResponseWriter, r *http.Request) {
	var req model.ValidateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if len(req.Clients) == 0 {
		writeError(w, http.StatusBadRequest, "No clients to validate")
		return
	}

	if len(req.Clients) > 10000 {
		writeError(w, http.StatusBadRequest, "Too many rows (max 10,000)")
		return
	}

	result, err := h.importService.ValidateRows(r.Context(), req.Clients)
	if err != nil {
		log.Printf("Validation error: %v", err)
		writeError(w, http.StatusInternalServerError, "Validation failed")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// Import imports clients from validated CSV data
// POST /api/admin/import/clients
func (h *ImportHandler) Import(w http.ResponseWriter, r *http.Request) {
	// Get current staff from context
	staff := middleware.GetStaffFromContext(r.Context())
	if staff == nil {
		writeError(w, http.StatusForbidden, "Staff record required")
		return
	}

	var req model.ImportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if len(req.Clients) == 0 {
		writeError(w, http.StatusBadRequest, "No clients to import")
		return
	}

	if len(req.Clients) > 10000 {
		writeError(w, http.StatusBadRequest, "Too many rows (max 10,000)")
		return
	}

	// Default batch size
	batchSize := req.BatchSize
	if batchSize <= 0 {
		batchSize = 50
	}

	log.Printf("Starting import of %d clients by %s (batch size: %d, skip duplicates: %v)",
		len(req.Clients), staff.Email, batchSize, req.SkipDuplicates)

	result, err := h.importService.ImportClients(
		r.Context(),
		req.Clients,
		staff.ID,
		batchSize,
		req.SkipDuplicates,
	)
	if err != nil {
		log.Printf("Import error: %v", err)
		writeError(w, http.StatusInternalServerError, "Import failed")
		return
	}

	log.Printf("Import completed: %d imported, %d skipped, %d failed",
		result.Imported, result.Skipped, result.Failed)

	writeJSON(w, http.StatusOK, result)
}
