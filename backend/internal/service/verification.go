package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"

	"github.com/finchley-foodbank/foodbank/internal/email"
	"github.com/finchley-foodbank/foodbank/internal/model"
	"github.com/finchley-foodbank/foodbank/internal/repository"
)

const (
	codeLength         = 6
	codeExpiryMinutes  = 15
	maxAttempts        = 5
	maxCodesPerHour    = 3
)

var (
	ErrCodeExpired       = errors.New("verification code has expired")
	ErrInvalidCode       = errors.New("invalid verification code")
	ErrTooManyAttempts   = errors.New("too many incorrect attempts, please request a new code")
	ErrRateLimited       = errors.New("too many verification requests, please wait before trying again")
	ErrAlreadyVerified   = errors.New("email is already verified")
	ErrEmailNotConfigured = errors.New("email service not configured")
)

type VerificationService struct {
	repo         *repository.VerificationRepository
	staffRepo    *repository.StaffRepository
	emailService *email.Service
}

func NewVerificationService(
	repo *repository.VerificationRepository,
	staffRepo *repository.StaffRepository,
	emailService *email.Service,
) *VerificationService {
	return &VerificationService{
		repo:         repo,
		staffRepo:    staffRepo,
		emailService: emailService,
	}
}

// generateCode generates a random 6-digit numeric code
func generateCode() (string, error) {
	max := big.NewInt(1000000) // 0-999999
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// SendCode sends a verification code to the staff member's email
func (s *VerificationService) SendCode(ctx context.Context, staffID uuid.UUID) error {
	// Check if email service is configured
	if s.emailService == nil || !s.emailService.IsConfigured() {
		return ErrEmailNotConfigured
	}

	// Get the staff member
	staff, err := s.staffRepo.GetByID(ctx, staffID)
	if err != nil {
		return fmt.Errorf("get staff: %w", err)
	}

	// Check if already verified
	if staff.EmailVerified {
		return ErrAlreadyVerified
	}

	// Rate limiting: check how many codes sent in the last hour
	since := time.Now().Add(-1 * time.Hour)
	count, err := s.repo.CountRecentCodes(ctx, staffID, since)
	if err != nil {
		return fmt.Errorf("count recent codes: %w", err)
	}
	if count >= maxCodesPerHour {
		return ErrRateLimited
	}

	// Invalidate any previous active codes
	if err := s.repo.InvalidatePrevious(ctx, staffID); err != nil {
		return fmt.Errorf("invalidate previous codes: %w", err)
	}

	// Generate a new code
	code, err := generateCode()
	if err != nil {
		return fmt.Errorf("generate code: %w", err)
	}

	// Store the code
	expiresAt := time.Now().Add(codeExpiryMinutes * time.Minute)
	if _, err := s.repo.Create(ctx, staffID, code, expiresAt); err != nil {
		return fmt.Errorf("store code: %w", err)
	}

	// Send the email
	if err := s.emailService.SendVerificationCode(staff.Email, staff.Name, code); err != nil {
		return fmt.Errorf("send email: %w", err)
	}

	return nil
}

// VerifyCode verifies a code submitted by the staff member
func (s *VerificationService) VerifyCode(ctx context.Context, staffID uuid.UUID, code string) error {
	// Get the staff member to check current status
	staff, err := s.staffRepo.GetByID(ctx, staffID)
	if err != nil {
		return fmt.Errorf("get staff: %w", err)
	}

	// Check if already verified
	if staff.EmailVerified {
		return ErrAlreadyVerified
	}

	// Get the latest active code
	vc, err := s.repo.GetLatestActive(ctx, staffID)
	if err != nil {
		if errors.Is(err, repository.ErrVerificationCodeNotFound) {
			return ErrCodeExpired
		}
		return fmt.Errorf("get verification code: %w", err)
	}

	// Check if expired
	if time.Now().After(vc.ExpiresAt) {
		return ErrCodeExpired
	}

	// Check attempt count
	if vc.Attempts >= maxAttempts {
		return ErrTooManyAttempts
	}

	// Increment attempts
	if err := s.repo.IncrementAttempts(ctx, vc.ID); err != nil {
		return fmt.Errorf("increment attempts: %w", err)
	}

	// Check if code matches
	if vc.Code != code {
		return ErrInvalidCode
	}

	// Mark the code as verified
	if err := s.repo.MarkVerified(ctx, vc.ID); err != nil {
		return fmt.Errorf("mark code verified: %w", err)
	}

	// Mark the staff member's email as verified
	if err := s.staffRepo.SetEmailVerified(ctx, staffID); err != nil {
		return fmt.Errorf("set email verified: %w", err)
	}

	return nil
}

// GetStatus returns the verification status for a staff member
func (s *VerificationService) GetStatus(ctx context.Context, staffID uuid.UUID) (*model.VerificationStatus, error) {
	staff, err := s.staffRepo.GetByID(ctx, staffID)
	if err != nil {
		return nil, fmt.Errorf("get staff: %w", err)
	}

	return &model.VerificationStatus{
		EmailVerified:   staff.EmailVerified,
		EmailVerifiedAt: staff.EmailVerifiedAt,
	}, nil
}
