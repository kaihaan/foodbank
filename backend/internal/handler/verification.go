package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/finchley-foodbank/foodbank/internal/handler/middleware"
	"github.com/finchley-foodbank/foodbank/internal/model"
	"github.com/finchley-foodbank/foodbank/internal/service"
)

type VerificationHandler struct {
	verificationService *service.VerificationService
}

func NewVerificationHandler(verificationService *service.VerificationService) *VerificationHandler {
	return &VerificationHandler{verificationService: verificationService}
}

// SendCode sends a verification code to the current user's email
func (h *VerificationHandler) SendCode(w http.ResponseWriter, r *http.Request) {
	staff := middleware.GetStaffFromContext(r.Context())
	if staff == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	err := h.verificationService.SendCode(r.Context(), staff.ID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrAlreadyVerified):
			writeError(w, http.StatusBadRequest, "email already verified")
		case errors.Is(err, service.ErrRateLimited):
			writeError(w, http.StatusTooManyRequests, "too many requests, please wait before trying again")
		case errors.Is(err, service.ErrEmailNotConfigured):
			writeError(w, http.StatusServiceUnavailable, "email service not available")
		default:
			writeError(w, http.StatusInternalServerError, "failed to send verification code")
		}
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "verification code sent"})
}

// VerifyCode verifies a code submitted by the user
func (h *VerificationHandler) VerifyCode(w http.ResponseWriter, r *http.Request) {
	staff := middleware.GetStaffFromContext(r.Context())
	if staff == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req model.VerifyCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Code == "" {
		writeError(w, http.StatusBadRequest, "code is required")
		return
	}

	if len(req.Code) != 6 {
		writeError(w, http.StatusBadRequest, "code must be 6 digits")
		return
	}

	err := h.verificationService.VerifyCode(r.Context(), staff.ID, req.Code)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrAlreadyVerified):
			writeError(w, http.StatusBadRequest, "email already verified")
		case errors.Is(err, service.ErrCodeExpired):
			writeError(w, http.StatusGone, "verification code has expired")
		case errors.Is(err, service.ErrInvalidCode):
			writeError(w, http.StatusBadRequest, "invalid verification code")
		case errors.Is(err, service.ErrTooManyAttempts):
			writeError(w, http.StatusTooManyRequests, "too many incorrect attempts, please request a new code")
		default:
			writeError(w, http.StatusInternalServerError, "failed to verify code")
		}
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "email verified successfully"})
}

// GetStatus returns the verification status for the current user
func (h *VerificationHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	staff := middleware.GetStaffFromContext(r.Context())
	if staff == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	status, err := h.verificationService.GetStatus(r.Context(), staff.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get verification status")
		return
	}

	writeJSON(w, http.StatusOK, status)
}
