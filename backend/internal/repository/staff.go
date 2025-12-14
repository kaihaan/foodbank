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

var ErrStaffNotFound = errors.New("staff not found")

type StaffRepository struct {
	db *pgxpool.Pool
}

func NewStaffRepository(db *pgxpool.Pool) *StaffRepository {
	return &StaffRepository{db: db}
}

// scanStaff scans a staff row into a model.Staff
func scanStaff(row pgx.Row) (*model.Staff, error) {
	var s model.Staff
	err := row.Scan(
		&s.ID, &s.Auth0ID, &s.Name, &s.Email, &s.Mobile,
		&s.Address, &s.Theme, &s.BackgroundImage, &s.Role, &s.IsActive,
		&s.EmailVerified, &s.EmailVerifiedAt,
		&s.CreatedAt, &s.CreatedBy, &s.DeactivatedAt, &s.DeactivatedBy,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrStaffNotFound
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// scanStaffRows scans multiple staff rows
func scanStaffRows(rows pgx.Rows) ([]model.Staff, error) {
	var staff []model.Staff
	for rows.Next() {
		var s model.Staff
		err := rows.Scan(
			&s.ID, &s.Auth0ID, &s.Name, &s.Email, &s.Mobile,
			&s.Address, &s.Theme, &s.BackgroundImage, &s.Role, &s.IsActive,
			&s.EmailVerified, &s.EmailVerifiedAt,
			&s.CreatedAt, &s.CreatedBy, &s.DeactivatedAt, &s.DeactivatedBy,
		)
		if err != nil {
			return nil, err
		}
		staff = append(staff, s)
	}
	return staff, rows.Err()
}

const staffSelectColumns = `id, auth0_id, name, email, mobile, address, theme, background_image, role, is_active, email_verified, email_verified_at, created_at, created_by, deactivated_at, deactivated_by`

func (r *StaffRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Staff, error) {
	query := `SELECT ` + staffSelectColumns + ` FROM staff WHERE id = $1`
	return scanStaff(r.db.QueryRow(ctx, query, id))
}

func (r *StaffRepository) GetByAuth0ID(ctx context.Context, auth0ID string) (*model.Staff, error) {
	query := `SELECT ` + staffSelectColumns + ` FROM staff WHERE auth0_id = $1`
	return scanStaff(r.db.QueryRow(ctx, query, auth0ID))
}

func (r *StaffRepository) GetByEmail(ctx context.Context, email string) (*model.Staff, error) {
	query := `SELECT ` + staffSelectColumns + ` FROM staff WHERE email = $1`
	return scanStaff(r.db.QueryRow(ctx, query, email))
}

// Create creates a new staff member with default role 'staff'
func (r *StaffRepository) Create(ctx context.Context, auth0ID, name, email string, mobile, address *string, createdBy *uuid.UUID) (*model.Staff, error) {
	query := `
		INSERT INTO staff (auth0_id, name, email, mobile, address, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING ` + staffSelectColumns

	return scanStaff(r.db.QueryRow(ctx, query, auth0ID, name, email, mobile, address, createdBy))
}

// CreateWithRole creates a new staff member with a specific role
func (r *StaffRepository) CreateWithRole(ctx context.Context, auth0ID, name, email, role string, mobile, address *string, createdBy *uuid.UUID) (*model.Staff, error) {
	query := `
		INSERT INTO staff (auth0_id, name, email, role, mobile, address, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING ` + staffSelectColumns

	return scanStaff(r.db.QueryRow(ctx, query, auth0ID, name, email, role, mobile, address, createdBy))
}

func (r *StaffRepository) Update(ctx context.Context, id uuid.UUID, name, email string, mobile, address *string, theme, backgroundImage string) (*model.Staff, error) {
	query := `
		UPDATE staff
		SET name = $2, email = $3, mobile = $4, address = $5, theme = $6, background_image = $7
		WHERE id = $1
		RETURNING ` + staffSelectColumns

	return scanStaff(r.db.QueryRow(ctx, query, id, name, email, mobile, address, theme, backgroundImage))
}

// UpdateRole updates a staff member's role
func (r *StaffRepository) UpdateRole(ctx context.Context, id uuid.UUID, role string) (*model.Staff, error) {
	query := `
		UPDATE staff
		SET role = $2
		WHERE id = $1
		RETURNING ` + staffSelectColumns

	return scanStaff(r.db.QueryRow(ctx, query, id, role))
}

// List returns all active staff members
func (r *StaffRepository) List(ctx context.Context) ([]model.Staff, error) {
	query := `SELECT ` + staffSelectColumns + ` FROM staff WHERE is_active = true ORDER BY name ASC`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanStaffRows(rows)
}

// ListAll returns all staff members including deactivated ones
func (r *StaffRepository) ListAll(ctx context.Context) ([]model.Staff, error) {
	query := `SELECT ` + staffSelectColumns + ` FROM staff ORDER BY is_active DESC, name ASC`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanStaffRows(rows)
}

// Deactivate marks a staff member as inactive
func (r *StaffRepository) Deactivate(ctx context.Context, id uuid.UUID, deactivatedBy uuid.UUID) error {
	query := `
		UPDATE staff
		SET is_active = false, deactivated_at = $2, deactivated_by = $3
		WHERE id = $1 AND is_active = true`

	result, err := r.db.Exec(ctx, query, id, time.Now(), deactivatedBy)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrStaffNotFound
	}
	return nil
}

// Reactivate marks a staff member as active
func (r *StaffRepository) Reactivate(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE staff
		SET is_active = true, deactivated_at = NULL, deactivated_by = NULL
		WHERE id = $1 AND is_active = false`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrStaffNotFound
	}
	return nil
}

// CountAdmins returns the number of active admin users
func (r *StaffRepository) CountAdmins(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM staff WHERE role = 'admin' AND is_active = true`
	var count int
	err := r.db.QueryRow(ctx, query).Scan(&count)
	return count, err
}

// ListAdminEmails returns email addresses of all active admin users
func (r *StaffRepository) ListAdminEmails(ctx context.Context) ([]string, error) {
	query := `SELECT email FROM staff WHERE role = 'admin' AND is_active = true`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var emails []string
	for rows.Next() {
		var email string
		if err := rows.Scan(&email); err != nil {
			return nil, err
		}
		emails = append(emails, email)
	}
	return emails, rows.Err()
}

// SetEmailVerified marks a staff member's email as verified
func (r *StaffRepository) SetEmailVerified(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE staff SET email_verified = true, email_verified_at = NOW() WHERE id = $1`
	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrStaffNotFound
	}
	return nil
}

// ClearEmailVerified clears a staff member's email verification status
func (r *StaffRepository) ClearEmailVerified(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE staff SET email_verified = false, email_verified_at = NULL WHERE id = $1`
	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrStaffNotFound
	}
	return nil
}
