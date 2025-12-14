package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finchley-foodbank/foodbank/internal/model"
)

var ErrRegistrationRequestNotFound = errors.New("registration request not found")

type RegistrationRequestRepository struct {
	db *pgxpool.Pool
}

func NewRegistrationRequestRepository(db *pgxpool.Pool) *RegistrationRequestRepository {
	return &RegistrationRequestRepository{db: db}
}

const registrationRequestSelectColumns = `id, name, email, mobile, address, status, approval_token, token_expires_at, created_at, reviewed_at, reviewed_by`

// scanRegistrationRequest scans a single row into a model.RegistrationRequest
func scanRegistrationRequest(row pgx.Row) (*model.RegistrationRequest, error) {
	var r model.RegistrationRequest
	err := row.Scan(
		&r.ID, &r.Name, &r.Email, &r.Mobile, &r.Address,
		&r.Status, &r.ApprovalToken, &r.TokenExpiresAt,
		&r.CreatedAt, &r.ReviewedAt, &r.ReviewedBy,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrRegistrationRequestNotFound
	}
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// scanRegistrationRequestRows scans multiple rows
func scanRegistrationRequestRows(rows pgx.Rows) ([]model.RegistrationRequest, error) {
	var requests []model.RegistrationRequest
	for rows.Next() {
		var r model.RegistrationRequest
		err := rows.Scan(
			&r.ID, &r.Name, &r.Email, &r.Mobile, &r.Address,
			&r.Status, &r.ApprovalToken, &r.TokenExpiresAt,
			&r.CreatedAt, &r.ReviewedAt, &r.ReviewedBy,
		)
		if err != nil {
			return nil, err
		}
		requests = append(requests, r)
	}
	return requests, rows.Err()
}

// generateToken creates a cryptographically secure 64-character hex token
func generateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// Create creates a new registration request with a generated approval token
func (r *RegistrationRequestRepository) Create(ctx context.Context, name, email string, mobile, address *string) (*model.RegistrationRequest, error) {
	token, err := generateToken()
	if err != nil {
		return nil, err
	}

	// Token expires in 7 days
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	query := `
		INSERT INTO registration_requests (name, email, mobile, address, approval_token, token_expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING ` + registrationRequestSelectColumns

	return scanRegistrationRequest(r.db.QueryRow(ctx, query, name, email, mobile, address, token, expiresAt))
}

// GetByID retrieves a registration request by ID
func (r *RegistrationRequestRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.RegistrationRequest, error) {
	query := `SELECT ` + registrationRequestSelectColumns + ` FROM registration_requests WHERE id = $1`
	return scanRegistrationRequest(r.db.QueryRow(ctx, query, id))
}

// GetByEmail retrieves a registration request by email
func (r *RegistrationRequestRepository) GetByEmail(ctx context.Context, email string) (*model.RegistrationRequest, error) {
	query := `SELECT ` + registrationRequestSelectColumns + ` FROM registration_requests WHERE email = $1`
	return scanRegistrationRequest(r.db.QueryRow(ctx, query, email))
}

// GetByToken retrieves a registration request by approval token
func (r *RegistrationRequestRepository) GetByToken(ctx context.Context, token string) (*model.RegistrationRequest, error) {
	query := `SELECT ` + registrationRequestSelectColumns + ` FROM registration_requests WHERE approval_token = $1`
	return scanRegistrationRequest(r.db.QueryRow(ctx, query, token))
}

// ListPending returns all pending registration requests
func (r *RegistrationRequestRepository) ListPending(ctx context.Context) ([]model.RegistrationRequest, error) {
	query := `SELECT ` + registrationRequestSelectColumns + ` FROM registration_requests WHERE status = 'pending' ORDER BY created_at ASC`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanRegistrationRequestRows(rows)
}

// CountPending returns the count of pending registration requests
func (r *RegistrationRequestRepository) CountPending(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM registration_requests WHERE status = 'pending'`
	var count int
	err := r.db.QueryRow(ctx, query).Scan(&count)
	return count, err
}

// Approve marks a registration request as approved
func (r *RegistrationRequestRepository) Approve(ctx context.Context, id uuid.UUID, reviewedBy uuid.UUID) error {
	query := `
		UPDATE registration_requests
		SET status = 'approved', reviewed_at = $2, reviewed_by = $3
		WHERE id = $1 AND status = 'pending'`

	result, err := r.db.Exec(ctx, query, id, time.Now(), reviewedBy)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrRegistrationRequestNotFound
	}
	return nil
}

// Reject marks a registration request as rejected
func (r *RegistrationRequestRepository) Reject(ctx context.Context, id uuid.UUID, reviewedBy uuid.UUID) error {
	query := `
		UPDATE registration_requests
		SET status = 'rejected', reviewed_at = $2, reviewed_by = $3
		WHERE id = $1 AND status = 'pending'`

	result, err := r.db.Exec(ctx, query, id, time.Now(), reviewedBy)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrRegistrationRequestNotFound
	}
	return nil
}

// ApproveWithoutReviewer marks a request as approved without a reviewer (token-based approval)
func (r *RegistrationRequestRepository) ApproveWithoutReviewer(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE registration_requests
		SET status = 'approved', reviewed_at = $2
		WHERE id = $1 AND status = 'pending'`

	result, err := r.db.Exec(ctx, query, id, time.Now())
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrRegistrationRequestNotFound
	}
	return nil
}

// RejectWithoutReviewer marks a request as rejected without a reviewer (token-based rejection)
func (r *RegistrationRequestRepository) RejectWithoutReviewer(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE registration_requests
		SET status = 'rejected', reviewed_at = $2
		WHERE id = $1 AND status = 'pending'`

	result, err := r.db.Exec(ctx, query, id, time.Now())
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrRegistrationRequestNotFound
	}
	return nil
}

// Delete removes a registration request (for cleanup)
func (r *RegistrationRequestRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM registration_requests WHERE id = $1`
	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrRegistrationRequestNotFound
	}
	return nil
}

// GetPendingByEmail checks if there's already a pending request for this email
func (r *RegistrationRequestRepository) GetPendingByEmail(ctx context.Context, email string) (*model.RegistrationRequest, error) {
	query := `SELECT ` + registrationRequestSelectColumns + ` FROM registration_requests WHERE email = $1 AND status = 'pending'`
	return scanRegistrationRequest(r.db.QueryRow(ctx, query, email))
}
