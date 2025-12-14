package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/finchley-foodbank/foodbank/internal/handler/middleware"
	"github.com/finchley-foodbank/foodbank/internal/model"
	"github.com/finchley-foodbank/foodbank/internal/repository"
	"github.com/finchley-foodbank/foodbank/internal/service"
)

type RegistrationRequestHandler struct {
	service *service.RegistrationRequestService
}

func NewRegistrationRequestHandler(svc *service.RegistrationRequestService) *RegistrationRequestHandler {
	return &RegistrationRequestHandler{service: svc}
}

// Submit creates a new registration request (public endpoint)
func (h *RegistrationRequestHandler) Submit(w http.ResponseWriter, r *http.Request) {
	var req model.CreateRegistrationRequestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate required fields
	if req.Name == "" || req.Email == "" {
		writeError(w, http.StatusBadRequest, "name and email are required")
		return
	}

	request, err := h.service.Submit(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrPendingRequestExists) {
			writeError(w, http.StatusConflict, "a registration request already exists for this email")
			return
		}
		if errors.Is(err, service.ErrStaffAlreadyExists) {
			writeError(w, http.StatusConflict, "a staff member with this email already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to submit registration request")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Registration request submitted successfully",
		"id":      request.ID,
	})
}

// List returns all pending registration requests (admin only)
func (h *RegistrationRequestHandler) List(w http.ResponseWriter, r *http.Request) {
	requests, err := h.service.ListPending(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list requests")
		return
	}

	writeJSON(w, http.StatusOK, requests)
}

// CountPending returns the count of pending requests (admin only)
func (h *RegistrationRequestHandler) CountPending(w http.ResponseWriter, r *http.Request) {
	count, err := h.service.CountPending(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count requests")
		return
	}

	writeJSON(w, http.StatusOK, map[string]int{"count": count})
}

// ApproveByID approves a registration request by ID (admin only)
func (h *RegistrationRequestHandler) ApproveByID(w http.ResponseWriter, r *http.Request) {
	currentStaff := middleware.GetStaffFromContext(r.Context())
	if currentStaff == nil {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request ID")
		return
	}

	staff, err := h.service.ApproveByID(r.Context(), id, currentStaff.ID)
	if err != nil {
		if errors.Is(err, repository.ErrRegistrationRequestNotFound) {
			writeError(w, http.StatusNotFound, "request not found")
			return
		}
		if errors.Is(err, service.ErrRequestNotPending) {
			writeError(w, http.StatusBadRequest, "request is not pending")
			return
		}
		if errors.Is(err, service.ErrAuth0NotConfigured) {
			writeError(w, http.StatusServiceUnavailable, "Auth0 not configured")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Request approved",
		"staff":   staff,
	})
}

// RejectByID rejects a registration request by ID (admin only)
func (h *RegistrationRequestHandler) RejectByID(w http.ResponseWriter, r *http.Request) {
	currentStaff := middleware.GetStaffFromContext(r.Context())
	if currentStaff == nil {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid request ID")
		return
	}

	err = h.service.RejectByID(r.Context(), id, currentStaff.ID)
	if err != nil {
		if errors.Is(err, repository.ErrRegistrationRequestNotFound) {
			writeError(w, http.StatusNotFound, "request not found")
			return
		}
		if errors.Is(err, service.ErrRequestNotPending) {
			writeError(w, http.StatusBadRequest, "request is not pending")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Request rejected"})
}

// GetByToken retrieves a registration request by token (public - for email links)
func (h *RegistrationRequestHandler) GetByToken(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "token is required")
		return
	}

	response, err := h.service.GetByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, repository.ErrRegistrationRequestNotFound) {
			writeError(w, http.StatusNotFound, "request not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get request")
		return
	}

	writeJSON(w, http.StatusOK, response)
}

// ApproveByToken approves a registration request by token (public - for email links)
func (h *RegistrationRequestHandler) ApproveByToken(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "token is required")
		return
	}

	staff, err := h.service.ApproveByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, repository.ErrRegistrationRequestNotFound) {
			writeError(w, http.StatusNotFound, "request not found")
			return
		}
		if errors.Is(err, service.ErrTokenExpired) {
			writeError(w, http.StatusGone, "token has expired")
			return
		}
		if errors.Is(err, service.ErrRequestNotPending) {
			writeError(w, http.StatusBadRequest, "request has already been processed")
			return
		}
		if errors.Is(err, service.ErrAuth0NotConfigured) {
			writeError(w, http.StatusServiceUnavailable, "service temporarily unavailable")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Request approved successfully",
		"staff":   staff,
	})
}

// RejectByToken rejects a registration request by token (public - for email links)
func (h *RegistrationRequestHandler) RejectByToken(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "token is required")
		return
	}

	err := h.service.RejectByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, repository.ErrRegistrationRequestNotFound) {
			writeError(w, http.StatusNotFound, "request not found")
			return
		}
		if errors.Is(err, service.ErrTokenExpired) {
			writeError(w, http.StatusGone, "token has expired")
			return
		}
		if errors.Is(err, service.ErrRequestNotPending) {
			writeError(w, http.StatusBadRequest, "request has already been processed")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Request rejected"})
}
