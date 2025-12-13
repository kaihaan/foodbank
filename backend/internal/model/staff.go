package model

import (
	"time"

	"github.com/google/uuid"
)

type Staff struct {
	ID            uuid.UUID  `json:"id"`
	Auth0ID       string     `json:"auth0_id"`
	Name          string     `json:"name"`
	Email         string     `json:"email"`
	Mobile        *string    `json:"mobile,omitempty"`
	Address       *string    `json:"address,omitempty"`
	Theme         string     `json:"theme"`
	Role          string     `json:"role"`
	IsActive      bool       `json:"is_active"`
	CreatedAt     time.Time  `json:"created_at"`
	CreatedBy     *uuid.UUID `json:"created_by,omitempty"`
	DeactivatedAt *time.Time `json:"deactivated_at,omitempty"`
	DeactivatedBy *uuid.UUID `json:"deactivated_by,omitempty"`
}

const (
	RoleAdmin = "admin"
	RoleStaff = "staff"
)

// InviteStaffRequest is used to invite a new staff member
type InviteStaffRequest struct {
	Name    string  `json:"name"`
	Email   string  `json:"email"`
	Role    string  `json:"role"`
	Mobile  *string `json:"mobile,omitempty"`
	Address *string `json:"address,omitempty"`
}

// CreateStaffRequest is used for internal staff creation (legacy)
type CreateStaffRequest struct {
	Name    string  `json:"name"`
	Email   string  `json:"email"`
	Mobile  *string `json:"mobile,omitempty"`
	Address *string `json:"address,omitempty"`
}

type UpdateStaffRequest struct {
	Name    string  `json:"name"`
	Email   string  `json:"email"`
	Mobile  *string `json:"mobile,omitempty"`
	Address *string `json:"address,omitempty"`
	Theme   string  `json:"theme"`
}

// UpdateRoleRequest is used to change a staff member's role
type UpdateRoleRequest struct {
	Role string `json:"role"`
}

// MFAStatus represents the MFA enrollment status for a user
type MFAStatus struct {
	Enrolled bool     `json:"enrolled"`
	Factors  []string `json:"factors"`
}
