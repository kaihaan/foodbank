package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/finchley-foodbank/foodbank/internal/handler/middleware"
	"github.com/finchley-foodbank/foodbank/internal/service"
)

type RecoveryHandler struct {
	backupService *service.BackupService
}

func NewRecoveryHandler(backupService *service.BackupService) *RecoveryHandler {
	return &RecoveryHandler{backupService: backupService}
}

// Backup exports the database as JSON or CSV
// GET /api/admin/backup?format=json (default)
// GET /api/admin/backup?format=csv
func (h *RecoveryHandler) Backup(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "json"
	}

	// Determine who is creating the backup
	createdBy := "recovery-token"
	if staff := middleware.GetStaffFromContext(ctx); staff != nil {
		createdBy = staff.Email
	}

	switch format {
	case "json":
		backup, err := h.backupService.CreateBackup(ctx, createdBy)
		if err != nil {
			log.Printf("Backup failed: %v", err)
			writeError(w, http.StatusInternalServerError, "backup failed")
			return
		}

		filename := fmt.Sprintf("foodbank-backup-%s.json", time.Now().Format("2006-01-02"))
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
		json.NewEncoder(w).Encode(backup)

	case "csv":
		zipData, err := h.backupService.ExportCSV(ctx)
		if err != nil {
			log.Printf("CSV export failed: %v", err)
			writeError(w, http.StatusInternalServerError, "csv export failed")
			return
		}

		filename := fmt.Sprintf("foodbank-backup-%s.zip", time.Now().Format("2006-01-02"))
		w.Header().Set("Content-Type", "application/zip")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(zipData)))
		w.Write(zipData)

	default:
		writeError(w, http.StatusBadRequest, "invalid format, use 'json' or 'csv'")
	}
}

// Restore imports data from a JSON backup
// POST /api/admin/restore
// Body: JSON backup file
func (h *RecoveryHandler) Restore(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var backup service.Backup
	if err := json.NewDecoder(r.Body).Decode(&backup); err != nil {
		writeError(w, http.StatusBadRequest, "invalid backup file format")
		return
	}

	// Validate backup version
	if backup.Version == "" {
		writeError(w, http.StatusBadRequest, "invalid backup: missing version")
		return
	}

	log.Printf("Starting restore from backup created at %s by %s", backup.CreatedAt, backup.CreatedBy)

	if err := h.backupService.RestoreBackup(ctx, &backup); err != nil {
		log.Printf("Restore failed: %v", err)
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("restore failed: %v", err))
		return
	}

	log.Printf("Restore completed successfully")
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Database restored successfully",
		"stats": map[string]int{
			"staff":                 len(backup.Staff),
			"clients":               len(backup.Clients),
			"attendance":            len(backup.Attendance),
			"audit_log":             len(backup.AuditLog),
			"registration_requests": len(backup.RegistrationRequests),
			"verification_codes":    len(backup.VerificationCodes),
		},
	})
}

// Status checks database connectivity
// GET /api/admin/recovery/status
func (h *RecoveryHandler) Status(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	err := h.backupService.CheckDatabaseConnection(ctx)

	response := map[string]interface{}{
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}

	if err != nil {
		response["database"] = "unavailable"
		response["error"] = err.Error()
		writeJSON(w, http.StatusServiceUnavailable, response)
		return
	}

	response["database"] = "connected"
	writeJSON(w, http.StatusOK, response)
}
