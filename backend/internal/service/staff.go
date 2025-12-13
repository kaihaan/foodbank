package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/finchley-foodbank/foodbank/internal/auth0"
	"github.com/finchley-foodbank/foodbank/internal/model"
	"github.com/finchley-foodbank/foodbank/internal/repository"
)

var (
	ErrCannotDeactivateSelf     = errors.New("cannot deactivate yourself")
	ErrCannotChangeOwnRole      = errors.New("cannot change your own role")
	ErrCannotDeactivateLastAdmin = errors.New("cannot deactivate the last admin")
	ErrInvalidRole              = errors.New("invalid role: must be 'admin' or 'staff'")
	ErrAuth0NotConfigured       = errors.New("auth0 management API not configured")
)

type StaffService struct {
	repo        *repository.StaffRepository
	auth0Client *auth0.Client
}

func NewStaffService(repo *repository.StaffRepository, auth0Client *auth0.Client) *StaffService {
	return &StaffService{
		repo:        repo,
		auth0Client: auth0Client,
	}
}

// FindOrCreate finds a staff member by Auth0 ID, or creates one if they don't exist.
// Used for auto-registration on first login.
// Also updates name/email if they were empty and are now available from Auth0.
func (s *StaffService) FindOrCreate(ctx context.Context, auth0ID, name, email string) (*model.Staff, bool, error) {
	staff, err := s.repo.GetByAuth0ID(ctx, auth0ID)
	if err == nil {
		// Staff exists - check if we should update name/email from Auth0
		needsUpdate := false
		updatedName := staff.Name
		updatedEmail := staff.Email

		// Update name if it was empty or is the same as email (placeholder)
		if name != "" && (staff.Name == "" || staff.Name == staff.Email) {
			updatedName = name
			needsUpdate = true
		}

		// Update email if it was empty
		if email != "" && staff.Email == "" {
			updatedEmail = email
			needsUpdate = true
		}

		if needsUpdate {
			staff, err = s.repo.Update(ctx, staff.ID, updatedName, updatedEmail, staff.Mobile, staff.Address, staff.Theme)
			if err != nil {
				return nil, false, err
			}
		}

		return staff, false, nil
	}
	if !errors.Is(err, repository.ErrStaffNotFound) {
		return nil, false, err
	}

	// Staff doesn't exist, create them with default 'staff' role
	staff, err = s.repo.Create(ctx, auth0ID, name, email, nil, nil, nil)
	if err != nil {
		return nil, false, err
	}
	return staff, true, nil
}

func (s *StaffService) GetByID(ctx context.Context, id uuid.UUID) (*model.Staff, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *StaffService) GetByAuth0ID(ctx context.Context, auth0ID string) (*model.Staff, error) {
	return s.repo.GetByAuth0ID(ctx, auth0ID)
}

func (s *StaffService) Update(ctx context.Context, id uuid.UUID, name, email string, mobile, address *string, theme string) (*model.Staff, error) {
	return s.repo.Update(ctx, id, name, email, mobile, address, theme)
}

func (s *StaffService) List(ctx context.Context) ([]model.Staff, error) {
	return s.repo.List(ctx)
}

func (s *StaffService) ListAll(ctx context.Context) ([]model.Staff, error) {
	return s.repo.ListAll(ctx)
}

// InviteStaff creates a new staff member in Auth0 and local database,
// then sends an invitation email for them to set their password.
func (s *StaffService) InviteStaff(ctx context.Context, req model.InviteStaffRequest, invitedBy uuid.UUID) (*model.Staff, string, error) {
	// Validate role
	if req.Role != model.RoleAdmin && req.Role != model.RoleStaff {
		return nil, "", ErrInvalidRole
	}

	// Check if Auth0 client is configured
	if s.auth0Client == nil || !s.auth0Client.IsConfigured() {
		return nil, "", ErrAuth0NotConfigured
	}

	// Create user in Auth0
	auth0User, err := s.auth0Client.CreateUser(req.Email, req.Name)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create Auth0 user: %w", err)
	}

	// Create local staff record
	staff, err := s.repo.CreateWithRole(ctx, auth0User.UserID, req.Name, req.Email, req.Role, req.Mobile, req.Address, &invitedBy)
	if err != nil {
		// TODO: Consider rolling back Auth0 user creation on failure
		return nil, "", fmt.Errorf("failed to create staff record: %w", err)
	}

	// Send password set email (invitation)
	ticketURL, err := s.auth0Client.SendPasswordSetEmail(auth0User.UserID)
	if err != nil {
		// User is created but invitation failed - they can request password reset
		return staff, "", fmt.Errorf("staff created but failed to send invitation: %w", err)
	}

	return staff, ticketURL, nil
}

// DeactivateStaff blocks the user in Auth0 and marks them as inactive locally.
func (s *StaffService) DeactivateStaff(ctx context.Context, id uuid.UUID, deactivatedBy uuid.UUID) error {
	// Cannot deactivate yourself
	if id == deactivatedBy {
		return ErrCannotDeactivateSelf
	}

	// Get the staff member to deactivate
	staff, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Check if this is the last admin
	if staff.Role == model.RoleAdmin {
		count, err := s.repo.CountAdmins(ctx)
		if err != nil {
			return fmt.Errorf("failed to count admins: %w", err)
		}
		if count <= 1 {
			return ErrCannotDeactivateLastAdmin
		}
	}

	// Block in Auth0 if configured
	if s.auth0Client != nil && s.auth0Client.IsConfigured() {
		if err := s.auth0Client.BlockUser(staff.Auth0ID); err != nil {
			return fmt.Errorf("failed to block user in Auth0: %w", err)
		}
	}

	// Mark as inactive locally
	return s.repo.Deactivate(ctx, id, deactivatedBy)
}

// ReactivateStaff unblocks the user in Auth0 and marks them as active locally.
func (s *StaffService) ReactivateStaff(ctx context.Context, id uuid.UUID) error {
	// Get the staff member to reactivate
	staff, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Unblock in Auth0 if configured
	if s.auth0Client != nil && s.auth0Client.IsConfigured() {
		if err := s.auth0Client.UnblockUser(staff.Auth0ID); err != nil {
			return fmt.Errorf("failed to unblock user in Auth0: %w", err)
		}
	}

	// Mark as active locally
	return s.repo.Reactivate(ctx, id)
}

// UpdateRole changes a staff member's role.
func (s *StaffService) UpdateRole(ctx context.Context, id uuid.UUID, role string, updatedBy uuid.UUID) (*model.Staff, error) {
	// Validate role
	if role != model.RoleAdmin && role != model.RoleStaff {
		return nil, ErrInvalidRole
	}

	// Cannot change own role
	if id == updatedBy {
		return nil, ErrCannotChangeOwnRole
	}

	// Get current staff to check if demoting last admin
	staff, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// If demoting from admin, check there's at least one other admin
	if staff.Role == model.RoleAdmin && role == model.RoleStaff {
		count, err := s.repo.CountAdmins(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to count admins: %w", err)
		}
		if count <= 1 {
			return nil, ErrCannotDeactivateLastAdmin
		}
	}

	return s.repo.UpdateRole(ctx, id, role)
}

// GetMFAStatus returns the MFA enrollment status for a user.
func (s *StaffService) GetMFAStatus(ctx context.Context, auth0ID string) (*model.MFAStatus, error) {
	if s.auth0Client == nil || !s.auth0Client.IsConfigured() {
		// Return not enrolled if Auth0 not configured
		return &model.MFAStatus{Enrolled: false, Factors: []string{}}, nil
	}

	enrollments, err := s.auth0Client.GetMFAEnrollments(auth0ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get MFA enrollments: %w", err)
	}

	status := &model.MFAStatus{
		Enrolled: len(enrollments) > 0,
		Factors:  make([]string, 0, len(enrollments)),
	}

	for _, e := range enrollments {
		if e.Status == "confirmed" {
			status.Factors = append(status.Factors, e.Type)
		}
	}

	return status, nil
}

// EnrollMFA creates an MFA enrollment ticket for the user.
func (s *StaffService) EnrollMFA(ctx context.Context, auth0ID string) (string, error) {
	if s.auth0Client == nil || !s.auth0Client.IsConfigured() {
		return "", ErrAuth0NotConfigured
	}

	ticket, err := s.auth0Client.CreateMFAEnrollmentTicket(auth0ID)
	if err != nil {
		return "", fmt.Errorf("failed to create MFA enrollment ticket: %w", err)
	}

	return ticket.TicketURL, nil
}

// DisableMFA removes all MFA enrollments for the user.
func (s *StaffService) DisableMFA(ctx context.Context, auth0ID string) error {
	if s.auth0Client == nil || !s.auth0Client.IsConfigured() {
		return ErrAuth0NotConfigured
	}

	enrollments, err := s.auth0Client.GetMFAEnrollments(auth0ID)
	if err != nil {
		return fmt.Errorf("failed to get MFA enrollments: %w", err)
	}

	for _, e := range enrollments {
		if err := s.auth0Client.DeleteMFAEnrollment(auth0ID, e.ID); err != nil {
			return fmt.Errorf("failed to delete MFA enrollment %s: %w", e.ID, err)
		}
	}

	return nil
}

// Legacy method - kept for backward compatibility
func (s *StaffService) Create(ctx context.Context, auth0ID, name, email string, mobile, address *string, createdBy *uuid.UUID) (*model.Staff, error) {
	return s.repo.Create(ctx, auth0ID, name, email, mobile, address, createdBy)
}
