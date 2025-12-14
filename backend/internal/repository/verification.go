package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finchley-foodbank/foodbank/internal/model"
)

var ErrVerificationCodeNotFound = errors.New("verification code not found")

type VerificationRepository struct {
	db *pgxpool.Pool
}

func NewVerificationRepository(db *pgxpool.Pool) *VerificationRepository {
	return &VerificationRepository{db: db}
}

// Create creates a new verification code
func (r *VerificationRepository) Create(ctx context.Context, staffID uuid.UUID, code string, expiresAt time.Time) (*model.VerificationCode, error) {
	query := `
		INSERT INTO verification_codes (staff_id, code, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id, staff_id, code, expires_at, attempts, verified_at, created_at`

	var vc model.VerificationCode
	err := r.db.QueryRow(ctx, query, staffID, code, expiresAt).Scan(
		&vc.ID, &vc.StaffID, &vc.Code, &vc.ExpiresAt, &vc.Attempts, &vc.VerifiedAt, &vc.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &vc, nil
}

// GetLatestActive returns the latest unverified, unexpired code for a staff member
func (r *VerificationRepository) GetLatestActive(ctx context.Context, staffID uuid.UUID) (*model.VerificationCode, error) {
	query := `
		SELECT id, staff_id, code, expires_at, attempts, verified_at, created_at
		FROM verification_codes
		WHERE staff_id = $1 AND verified_at IS NULL AND expires_at > NOW()
		ORDER BY created_at DESC
		LIMIT 1`

	var vc model.VerificationCode
	err := r.db.QueryRow(ctx, query, staffID).Scan(
		&vc.ID, &vc.StaffID, &vc.Code, &vc.ExpiresAt, &vc.Attempts, &vc.VerifiedAt, &vc.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrVerificationCodeNotFound
	}
	if err != nil {
		return nil, err
	}
	return &vc, nil
}

// IncrementAttempts increments the attempt count for a verification code
func (r *VerificationRepository) IncrementAttempts(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

// MarkVerified marks a verification code as verified
func (r *VerificationRepository) MarkVerified(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE verification_codes SET verified_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}

// InvalidatePrevious invalidates all previous unverified codes for a staff member
// by setting their expiry to now
func (r *VerificationRepository) InvalidatePrevious(ctx context.Context, staffID uuid.UUID) error {
	query := `
		UPDATE verification_codes
		SET expires_at = NOW()
		WHERE staff_id = $1 AND verified_at IS NULL AND expires_at > NOW()`
	_, err := r.db.Exec(ctx, query, staffID)
	return err
}

// CountRecentCodes counts codes created in the given time window (for rate limiting)
func (r *VerificationRepository) CountRecentCodes(ctx context.Context, staffID uuid.UUID, since time.Time) (int, error) {
	query := `SELECT COUNT(*) FROM verification_codes WHERE staff_id = $1 AND created_at > $2`
	var count int
	err := r.db.QueryRow(ctx, query, staffID, since).Scan(&count)
	return count, err
}
