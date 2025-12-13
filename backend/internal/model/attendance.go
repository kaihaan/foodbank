package model

import (
	"time"

	"github.com/google/uuid"
)

type Attendance struct {
	ID         uuid.UUID `json:"id"`
	ClientID   uuid.UUID `json:"client_id"`
	VerifiedBy uuid.UUID `json:"verified_by"`
	VerifiedAt time.Time `json:"verified_at"`
}

type AttendanceWithDetails struct {
	Attendance
	ClientName   string `json:"client_name"`
	VerifiedName string `json:"verified_by_name"`
}
