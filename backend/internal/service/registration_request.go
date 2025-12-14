package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"

	"github.com/finchley-foodbank/foodbank/internal/auth0"
	"github.com/finchley-foodbank/foodbank/internal/email"
	"github.com/finchley-foodbank/foodbank/internal/model"
	"github.com/finchley-foodbank/foodbank/internal/repository"
)

var (
	ErrPendingRequestExists = errors.New("a pending request already exists for this email")
	ErrStaffAlreadyExists   = errors.New("a staff member with this email already exists")
	ErrTokenExpired         = errors.New("approval token has expired")
	ErrRequestNotPending    = errors.New("request is not pending")
)

type RegistrationRequestService struct {
	repo         *repository.RegistrationRequestRepository
	staffRepo    *repository.StaffRepository
	auth0Client  *auth0.Client
	emailService *email.Service
}

func NewRegistrationRequestService(
	repo *repository.RegistrationRequestRepository,
	staffRepo *repository.StaffRepository,
	auth0Client *auth0.Client,
	emailService *email.Service,
) *RegistrationRequestService {
	return &RegistrationRequestService{
		repo:         repo,
		staffRepo:    staffRepo,
		auth0Client:  auth0Client,
		emailService: emailService,
	}
}

// Submit creates a new registration request and sends notifications to admins
func (s *RegistrationRequestService) Submit(ctx context.Context, req model.CreateRegistrationRequestRequest) (*model.RegistrationRequest, error) {
	// Check if there's already a pending request for this email
	existing, err := s.repo.GetPendingByEmail(ctx, req.Email)
	if err == nil && existing != nil {
		return nil, ErrPendingRequestExists
	}
	if err != nil && !errors.Is(err, repository.ErrRegistrationRequestNotFound) {
		return nil, fmt.Errorf("check existing request: %w", err)
	}

	// Check if staff member already exists with this email
	_, err = s.staffRepo.GetByEmail(ctx, req.Email)
	if err == nil {
		return nil, ErrStaffAlreadyExists
	}
	if !errors.Is(err, repository.ErrStaffNotFound) {
		return nil, fmt.Errorf("check existing staff: %w", err)
	}

	// Create the registration request
	request, err := s.repo.Create(ctx, req.Name, req.Email, req.Mobile, req.Address)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	// Send admin notifications (async, don't block on failure)
	go s.notifyAdmins(request)

	return request, nil
}

// notifyAdmins sends email notifications to all admin users
func (s *RegistrationRequestService) notifyAdmins(request *model.RegistrationRequest) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	log.Printf("Notifying admins of new registration request from %s (%s)", request.Name, request.Email)

	// Get all admin emails
	admins, err := s.staffRepo.ListAdminEmails(ctx)
	if err != nil {
		log.Printf("ERROR: Failed to list admin emails for notification: %v", err)
		return
	}

	if len(admins) == 0 {
		log.Printf("WARNING: No active admin users found to notify about registration request")
		return
	}

	log.Printf("Found %d admin(s) to notify: %v", len(admins), admins)

	if s.emailService == nil {
		log.Printf("WARNING: Email service not configured, skipping admin notifications")
		return
	}

	failures := s.emailService.SendAdminNotification(admins, request)
	if failures == 0 {
		log.Printf("Successfully sent admin notifications for registration request from %s", request.Email)
	} else if failures < len(admins) {
		log.Printf("Partially sent admin notifications for %s (%d/%d failed)", request.Email, failures, len(admins))
	} else {
		log.Printf("ERROR: Failed to send all admin notifications for %s", request.Email)
	}
}

// GetByToken retrieves a registration request by its approval token
func (s *RegistrationRequestService) GetByToken(ctx context.Context, token string) (*model.TokenActionResponse, error) {
	request, err := s.repo.GetByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	response := &model.TokenActionResponse{
		ID:        request.ID,
		Name:      request.Name,
		Email:     request.Email,
		Mobile:    request.Mobile,
		Address:   request.Address,
		Status:    request.Status,
		CreatedAt: request.CreatedAt,
		Valid:     request.Status == model.RequestStatusPending,
		Expired:   time.Now().After(request.TokenExpiresAt),
	}

	return response, nil
}

// ApproveByToken approves a registration request using the token (email link flow)
func (s *RegistrationRequestService) ApproveByToken(ctx context.Context, token string) (*model.Staff, error) {
	request, err := s.repo.GetByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	if request.Status != model.RequestStatusPending {
		return nil, ErrRequestNotPending
	}

	if time.Now().After(request.TokenExpiresAt) {
		return nil, ErrTokenExpired
	}

	return s.approveRequest(ctx, request, nil)
}

// ApproveByID approves a registration request by ID (admin dashboard flow)
func (s *RegistrationRequestService) ApproveByID(ctx context.Context, id uuid.UUID, reviewedBy uuid.UUID) (*model.Staff, error) {
	request, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if request.Status != model.RequestStatusPending {
		return nil, ErrRequestNotPending
	}

	return s.approveRequest(ctx, request, &reviewedBy)
}

// approveRequest handles the actual approval logic
func (s *RegistrationRequestService) approveRequest(ctx context.Context, request *model.RegistrationRequest, reviewedBy *uuid.UUID) (*model.Staff, error) {
	// Check if Auth0 client is configured
	if s.auth0Client == nil || !s.auth0Client.IsConfigured() {
		return nil, ErrAuth0NotConfigured
	}

	// Create user in Auth0
	auth0User, err := s.auth0Client.CreateUser(request.Email, request.Name)
	if err != nil {
		return nil, fmt.Errorf("create Auth0 user: %w", err)
	}

	// Create local staff record with 'staff' role
	var staff *model.Staff
	if reviewedBy != nil {
		staff, err = s.staffRepo.CreateWithRole(ctx, auth0User.UserID, request.Name, request.Email, model.RoleStaff, request.Mobile, request.Address, reviewedBy)
	} else {
		staff, err = s.staffRepo.Create(ctx, auth0User.UserID, request.Name, request.Email, request.Mobile, request.Address, nil)
	}
	if err != nil {
		// TODO: Consider rolling back Auth0 user creation on failure
		return nil, fmt.Errorf("create staff record: %w", err)
	}

	// Mark the request as approved
	if reviewedBy != nil {
		err = s.repo.Approve(ctx, request.ID, *reviewedBy)
	} else {
		// For token-based approval, we don't have a reviewer ID
		// Update the request directly
		err = s.repo.ApproveWithoutReviewer(ctx, request.ID)
	}
	if err != nil {
		return nil, fmt.Errorf("mark request approved: %w", err)
	}

	// Send password set email (invitation)
	_, err = s.auth0Client.SendPasswordSetEmail(auth0User.UserID)
	if err != nil {
		// User is created but invitation failed - they can request password reset
		// Don't fail the whole operation
	}

	return staff, nil
}

// RejectByToken rejects a registration request using the token (email link flow)
func (s *RegistrationRequestService) RejectByToken(ctx context.Context, token string) error {
	request, err := s.repo.GetByToken(ctx, token)
	if err != nil {
		return err
	}

	if request.Status != model.RequestStatusPending {
		return ErrRequestNotPending
	}

	if time.Now().After(request.TokenExpiresAt) {
		return ErrTokenExpired
	}

	return s.repo.RejectWithoutReviewer(ctx, request.ID)
}

// RejectByID rejects a registration request by ID (admin dashboard flow)
func (s *RegistrationRequestService) RejectByID(ctx context.Context, id uuid.UUID, reviewedBy uuid.UUID) error {
	request, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if request.Status != model.RequestStatusPending {
		return ErrRequestNotPending
	}

	return s.repo.Reject(ctx, id, reviewedBy)
}

// ListPending returns all pending registration requests
func (s *RegistrationRequestService) ListPending(ctx context.Context) ([]model.RegistrationRequest, error) {
	return s.repo.ListPending(ctx)
}

// CountPending returns the count of pending requests
func (s *RegistrationRequestService) CountPending(ctx context.Context) (int, error) {
	return s.repo.CountPending(ctx)
}
