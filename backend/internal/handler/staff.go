package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/finchley-foodbank/foodbank/internal/handler/middleware"
	"github.com/finchley-foodbank/foodbank/internal/model"
	"github.com/finchley-foodbank/foodbank/internal/service"
)

type StaffHandler struct {
	staffService *service.StaffService
}

func NewStaffHandler(staffService *service.StaffService) *StaffHandler {
	return &StaffHandler{staffService: staffService}
}

// writeJSON writes a JSON response
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// writeError writes a JSON error response
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// Me returns the current user's staff profile, creating it if it doesn't exist.
func (h *StaffHandler) Me(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	auth0ID := middleware.GetAuth0ID(ctx)
	email := middleware.GetAuth0Email(ctx)
	name := middleware.GetAuth0Name(ctx)

	if auth0ID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// Use email as name fallback
	if name == "" {
		name = email
	}

	staff, created, err := h.staffService.FindOrCreate(ctx, auth0ID, name, email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	if created {
		writeJSON(w, http.StatusCreated, staff)
	} else {
		writeJSON(w, http.StatusOK, staff)
	}
}

// Get returns a staff member by ID.
func (h *StaffHandler) Get(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid staff ID")
		return
	}

	staff, err := h.staffService.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "staff not found")
		return
	}

	writeJSON(w, http.StatusOK, staff)
}

// List returns all staff members.
// Admins see all staff (including deactivated), regular staff see only active.
func (h *StaffHandler) List(w http.ResponseWriter, r *http.Request) {
	currentStaff := middleware.GetStaffFromContext(r.Context())

	var staff []model.Staff
	var err error

	// Admins can see all staff including deactivated
	if currentStaff != nil && currentStaff.Role == model.RoleAdmin {
		// Check for ?all=true query param
		if r.URL.Query().Get("all") == "true" {
			staff, err = h.staffService.ListAll(r.Context())
		} else {
			staff, err = h.staffService.List(r.Context())
		}
	} else {
		staff, err = h.staffService.List(r.Context())
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, staff)
}

// Update updates a staff member's profile.
func (h *StaffHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid staff ID")
		return
	}

	var req model.UpdateStaffRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	staff, err := h.staffService.Update(r.Context(), id, req.Name, req.Email, req.Mobile, req.Address, req.Theme)
	if err != nil {
		writeError(w, http.StatusNotFound, "staff not found")
		return
	}

	writeJSON(w, http.StatusOK, staff)
}

// Create invites a new staff member (admin only).
func (h *StaffHandler) Create(w http.ResponseWriter, r *http.Request) {
	currentStaff := middleware.GetStaffFromContext(r.Context())
	if currentStaff == nil {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	var req model.InviteStaffRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate required fields
	if req.Name == "" || req.Email == "" || req.Role == "" {
		writeError(w, http.StatusBadRequest, "name, email, and role are required")
		return
	}

	staff, ticketURL, err := h.staffService.InviteStaff(r.Context(), req, currentStaff.ID)
	if err != nil {
		if errors.Is(err, service.ErrInvalidRole) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, service.ErrAuth0NotConfigured) {
			writeError(w, http.StatusServiceUnavailable, "Auth0 Management API not configured")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response := map[string]interface{}{
		"staff":      staff,
		"ticket_url": ticketURL,
		"message":    "Invitation sent to " + req.Email,
	}

	writeJSON(w, http.StatusCreated, response)
}

// Deactivate deactivates a staff member (admin only).
func (h *StaffHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	currentStaff := middleware.GetStaffFromContext(r.Context())
	if currentStaff == nil {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid staff ID")
		return
	}

	err = h.staffService.DeactivateStaff(r.Context(), id, currentStaff.ID)
	if err != nil {
		if errors.Is(err, service.ErrCannotDeactivateSelf) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, service.ErrCannotDeactivateLastAdmin) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "staff deactivated"})
}

// Reactivate reactivates a staff member (admin only).
func (h *StaffHandler) Reactivate(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid staff ID")
		return
	}

	err = h.staffService.ReactivateStaff(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Return the updated staff record
	staff, err := h.staffService.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, staff)
}

// UpdateRole changes a staff member's role (admin only).
func (h *StaffHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	currentStaff := middleware.GetStaffFromContext(r.Context())
	if currentStaff == nil {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid staff ID")
		return
	}

	var req model.UpdateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	staff, err := h.staffService.UpdateRole(r.Context(), id, req.Role, currentStaff.ID)
	if err != nil {
		if errors.Is(err, service.ErrInvalidRole) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, service.ErrCannotChangeOwnRole) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, service.ErrCannotDeactivateLastAdmin) {
			writeError(w, http.StatusBadRequest, "cannot demote the last admin")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, staff)
}

// GetMFAStatus returns the current user's MFA enrollment status.
func (h *StaffHandler) GetMFAStatus(w http.ResponseWriter, r *http.Request) {
	auth0ID := middleware.GetAuth0ID(r.Context())
	if auth0ID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	status, err := h.staffService.GetMFAStatus(r.Context(), auth0ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, status)
}

// EnrollMFA starts MFA enrollment for the current user.
func (h *StaffHandler) EnrollMFA(w http.ResponseWriter, r *http.Request) {
	auth0ID := middleware.GetAuth0ID(r.Context())
	if auth0ID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	ticketURL, err := h.staffService.EnrollMFA(r.Context(), auth0ID)
	if err != nil {
		if errors.Is(err, service.ErrAuth0NotConfigured) {
			writeError(w, http.StatusServiceUnavailable, "MFA enrollment not available")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"ticket_url": ticketURL})
}

// DisableMFA disables MFA for the current user.
func (h *StaffHandler) DisableMFA(w http.ResponseWriter, r *http.Request) {
	auth0ID := middleware.GetAuth0ID(r.Context())
	if auth0ID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	err := h.staffService.DisableMFA(r.Context(), auth0ID)
	if err != nil {
		if errors.Is(err, service.ErrAuth0NotConfigured) {
			writeError(w, http.StatusServiceUnavailable, "MFA management not available")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "MFA disabled"})
}
