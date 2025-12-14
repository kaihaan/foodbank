package model

import (
	"time"

	"github.com/google/uuid"
)

type RegistrationRequest struct {
	ID             uuid.UUID  `json:"id"`
	Name           string     `json:"name"`
	Email          string     `json:"email"`
	Mobile         *string    `json:"mobile,omitempty"`
	Address        *string    `json:"address,omitempty"`
	Status         string     `json:"status"`
	ApprovalToken  string     `json:"-"` // Never expose in JSON
	TokenExpiresAt time.Time  `json:"-"`
	CreatedAt      time.Time  `json:"created_at"`
	ReviewedAt     *time.Time `json:"reviewed_at,omitempty"`
	ReviewedBy     *uuid.UUID `json:"reviewed_by,omitempty"`
}

const (
	RequestStatusPending  = "pending"
	RequestStatusApproved = "approved"
	RequestStatusRejected = "rejected"
)

// CreateRegistrationRequestRequest is the input for submitting a new registration request
type CreateRegistrationRequestRequest struct {
	Name    string  `json:"name"`
	Email   string  `json:"email"`
	Mobile  *string `json:"mobile,omitempty"`
	Address *string `json:"address,omitempty"`
}

// TokenActionResponse is returned when looking up a request by token
type TokenActionResponse struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Mobile    *string   `json:"mobile,omitempty"`
	Address   *string   `json:"address,omitempty"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	Valid     bool      `json:"valid"`
	Expired   bool      `json:"expired"`
}
