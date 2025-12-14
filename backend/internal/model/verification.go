package model

import (
	"time"

	"github.com/google/uuid"
)

// VerificationCode represents an email verification code
type VerificationCode struct {
	ID         uuid.UUID  `json:"id"`
	StaffID    uuid.UUID  `json:"staff_id"`
	Code       string     `json:"-"` // Never expose in JSON
	ExpiresAt  time.Time  `json:"expires_at"`
	Attempts   int        `json:"attempts"`
	VerifiedAt *time.Time `json:"verified_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

// VerifyCodeRequest is the input for verifying a code
type VerifyCodeRequest struct {
	Code string `json:"code"`
}

// VerificationStatus represents the email verification status for a staff member
type VerificationStatus struct {
	EmailVerified   bool       `json:"email_verified"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
}
