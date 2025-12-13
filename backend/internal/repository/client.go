package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finchley-foodbank/foodbank/internal/model"
)

var ErrClientNotFound = errors.New("client not found")

type ClientRepository struct {
	db *pgxpool.Pool
}

func NewClientRepository(db *pgxpool.Pool) *ClientRepository {
	return &ClientRepository{db: db}
}

func (r *ClientRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Client, error) {
	query := `
		SELECT id, barcode_id, name, address, family_size, num_children, children_ages,
		       reason, photo_url, appointment_day, appointment_time,
		       pref_gluten_free, pref_halal, pref_vegetarian, pref_no_cooking,
		       created_at, created_by
		FROM clients
		WHERE id = $1`

	var c model.Client
	err := r.db.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.BarcodeID, &c.Name, &c.Address, &c.FamilySize, &c.NumChildren, &c.ChildrenAges,
		&c.Reason, &c.PhotoURL, &c.AppointmentDay, &c.AppointmentTime,
		&c.PrefGlutenFree, &c.PrefHalal, &c.PrefVegetarian, &c.PrefNoCooking,
		&c.CreatedAt, &c.CreatedBy,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrClientNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ClientRepository) GetByBarcodeID(ctx context.Context, barcodeID string) (*model.Client, error) {
	query := `
		SELECT id, barcode_id, name, address, family_size, num_children, children_ages,
		       reason, photo_url, appointment_day, appointment_time,
		       pref_gluten_free, pref_halal, pref_vegetarian, pref_no_cooking,
		       created_at, created_by
		FROM clients
		WHERE barcode_id = $1`

	var c model.Client
	err := r.db.QueryRow(ctx, query, barcodeID).Scan(
		&c.ID, &c.BarcodeID, &c.Name, &c.Address, &c.FamilySize, &c.NumChildren, &c.ChildrenAges,
		&c.Reason, &c.PhotoURL, &c.AppointmentDay, &c.AppointmentTime,
		&c.PrefGlutenFree, &c.PrefHalal, &c.PrefVegetarian, &c.PrefNoCooking,
		&c.CreatedAt, &c.CreatedBy,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrClientNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ClientRepository) Create(ctx context.Context, req *model.CreateClientRequest, barcodeID string, createdBy uuid.UUID) (*model.Client, error) {
	query := `
		INSERT INTO clients (barcode_id, name, address, family_size, num_children, children_ages,
		                     reason, photo_url, appointment_day, appointment_time,
		                     pref_gluten_free, pref_halal, pref_vegetarian, pref_no_cooking, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id, barcode_id, name, address, family_size, num_children, children_ages,
		          reason, photo_url, appointment_day, appointment_time,
		          pref_gluten_free, pref_halal, pref_vegetarian, pref_no_cooking,
		          created_at, created_by`

	var c model.Client
	err := r.db.QueryRow(ctx, query,
		barcodeID, req.Name, req.Address, req.FamilySize, req.NumChildren, req.ChildrenAges,
		req.Reason, req.PhotoURL, req.AppointmentDay, req.AppointmentTime,
		req.PrefGlutenFree, req.PrefHalal, req.PrefVegetarian, req.PrefNoCooking, createdBy,
	).Scan(
		&c.ID, &c.BarcodeID, &c.Name, &c.Address, &c.FamilySize, &c.NumChildren, &c.ChildrenAges,
		&c.Reason, &c.PhotoURL, &c.AppointmentDay, &c.AppointmentTime,
		&c.PrefGlutenFree, &c.PrefHalal, &c.PrefVegetarian, &c.PrefNoCooking,
		&c.CreatedAt, &c.CreatedBy,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ClientRepository) Update(ctx context.Context, id uuid.UUID, req *model.UpdateClientRequest) (*model.Client, error) {
	// Build dynamic update query
	setClauses := []string{}
	args := []interface{}{id}
	argNum := 2

	if req.Name != nil {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argNum))
		args = append(args, *req.Name)
		argNum++
	}
	if req.Address != nil {
		setClauses = append(setClauses, fmt.Sprintf("address = $%d", argNum))
		args = append(args, *req.Address)
		argNum++
	}
	if req.FamilySize != nil {
		setClauses = append(setClauses, fmt.Sprintf("family_size = $%d", argNum))
		args = append(args, *req.FamilySize)
		argNum++
	}
	if req.NumChildren != nil {
		setClauses = append(setClauses, fmt.Sprintf("num_children = $%d", argNum))
		args = append(args, *req.NumChildren)
		argNum++
	}
	if req.ChildrenAges != nil {
		setClauses = append(setClauses, fmt.Sprintf("children_ages = $%d", argNum))
		args = append(args, *req.ChildrenAges)
		argNum++
	}
	if req.Reason != nil {
		setClauses = append(setClauses, fmt.Sprintf("reason = $%d", argNum))
		args = append(args, *req.Reason)
		argNum++
	}
	if req.PhotoURL != nil {
		setClauses = append(setClauses, fmt.Sprintf("photo_url = $%d", argNum))
		args = append(args, *req.PhotoURL)
		argNum++
	}
	if req.AppointmentDay != nil {
		setClauses = append(setClauses, fmt.Sprintf("appointment_day = $%d", argNum))
		args = append(args, *req.AppointmentDay)
		argNum++
	}
	if req.AppointmentTime != nil {
		setClauses = append(setClauses, fmt.Sprintf("appointment_time = $%d", argNum))
		args = append(args, *req.AppointmentTime)
		argNum++
	}
	if req.PrefGlutenFree != nil {
		setClauses = append(setClauses, fmt.Sprintf("pref_gluten_free = $%d", argNum))
		args = append(args, *req.PrefGlutenFree)
		argNum++
	}
	if req.PrefHalal != nil {
		setClauses = append(setClauses, fmt.Sprintf("pref_halal = $%d", argNum))
		args = append(args, *req.PrefHalal)
		argNum++
	}
	if req.PrefVegetarian != nil {
		setClauses = append(setClauses, fmt.Sprintf("pref_vegetarian = $%d", argNum))
		args = append(args, *req.PrefVegetarian)
		argNum++
	}
	if req.PrefNoCooking != nil {
		setClauses = append(setClauses, fmt.Sprintf("pref_no_cooking = $%d", argNum))
		args = append(args, *req.PrefNoCooking)
		argNum++
	}

	if len(setClauses) == 0 {
		return r.GetByID(ctx, id)
	}

	query := fmt.Sprintf(`
		UPDATE clients
		SET %s
		WHERE id = $1
		RETURNING id, barcode_id, name, address, family_size, num_children, children_ages,
		          reason, photo_url, appointment_day, appointment_time,
		          pref_gluten_free, pref_halal, pref_vegetarian, pref_no_cooking,
		          created_at, created_by`,
		strings.Join(setClauses, ", "))

	var c model.Client
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&c.ID, &c.BarcodeID, &c.Name, &c.Address, &c.FamilySize, &c.NumChildren, &c.ChildrenAges,
		&c.Reason, &c.PhotoURL, &c.AppointmentDay, &c.AppointmentTime,
		&c.PrefGlutenFree, &c.PrefHalal, &c.PrefVegetarian, &c.PrefNoCooking,
		&c.CreatedAt, &c.CreatedBy,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrClientNotFound
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ClientRepository) Search(ctx context.Context, params *model.ClientSearchParams) ([]model.Client, int, error) {
	// Search by name or address using ILIKE
	searchPattern := "%" + params.Query + "%"

	countQuery := `
		SELECT COUNT(*)
		FROM clients
		WHERE name ILIKE $1 OR address ILIKE $1 OR barcode_id ILIKE $1`

	var total int
	err := r.db.QueryRow(ctx, countQuery, searchPattern).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, barcode_id, name, address, family_size, num_children, children_ages,
		       reason, photo_url, appointment_day, appointment_time,
		       pref_gluten_free, pref_halal, pref_vegetarian, pref_no_cooking,
		       created_at, created_by
		FROM clients
		WHERE name ILIKE $1 OR address ILIKE $1 OR barcode_id ILIKE $1
		ORDER BY name ASC
		LIMIT $2 OFFSET $3`

	rows, err := r.db.Query(ctx, query, searchPattern, params.Limit, params.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var clients []model.Client
	for rows.Next() {
		var c model.Client
		err := rows.Scan(
			&c.ID, &c.BarcodeID, &c.Name, &c.Address, &c.FamilySize, &c.NumChildren, &c.ChildrenAges,
			&c.Reason, &c.PhotoURL, &c.AppointmentDay, &c.AppointmentTime,
			&c.PrefGlutenFree, &c.PrefHalal, &c.PrefVegetarian, &c.PrefNoCooking,
			&c.CreatedAt, &c.CreatedBy,
		)
		if err != nil {
			return nil, 0, err
		}
		clients = append(clients, c)
	}
	return clients, total, rows.Err()
}

func (r *ClientRepository) List(ctx context.Context, limit, offset int) ([]model.Client, int, error) {
	countQuery := `SELECT COUNT(*) FROM clients`
	var total int
	err := r.db.QueryRow(ctx, countQuery).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, barcode_id, name, address, family_size, num_children, children_ages,
		       reason, photo_url, appointment_day, appointment_time,
		       pref_gluten_free, pref_halal, pref_vegetarian, pref_no_cooking,
		       created_at, created_by
		FROM clients
		ORDER BY name ASC
		LIMIT $1 OFFSET $2`

	rows, err := r.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var clients []model.Client
	for rows.Next() {
		var c model.Client
		err := rows.Scan(
			&c.ID, &c.BarcodeID, &c.Name, &c.Address, &c.FamilySize, &c.NumChildren, &c.ChildrenAges,
			&c.Reason, &c.PhotoURL, &c.AppointmentDay, &c.AppointmentTime,
			&c.PrefGlutenFree, &c.PrefHalal, &c.PrefVegetarian, &c.PrefNoCooking,
			&c.CreatedAt, &c.CreatedBy,
		)
		if err != nil {
			return nil, 0, err
		}
		clients = append(clients, c)
	}
	return clients, total, rows.Err()
}

func (r *ClientRepository) RecordAttendance(ctx context.Context, clientID, verifiedBy uuid.UUID) (*model.Attendance, error) {
	query := `
		INSERT INTO attendance (client_id, verified_by)
		VALUES ($1, $2)
		RETURNING id, client_id, verified_by, verified_at`

	var a model.Attendance
	err := r.db.QueryRow(ctx, query, clientID, verifiedBy).Scan(
		&a.ID, &a.ClientID, &a.VerifiedBy, &a.VerifiedAt,
	)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *ClientRepository) GetAttendanceHistory(ctx context.Context, clientID uuid.UUID, limit int) ([]model.AttendanceWithDetails, error) {
	query := `
		SELECT a.id, a.client_id, a.verified_by, a.verified_at,
		       c.name as client_name, s.name as verified_by_name
		FROM attendance a
		JOIN clients c ON a.client_id = c.id
		JOIN staff s ON a.verified_by = s.id
		WHERE a.client_id = $1
		ORDER BY a.verified_at DESC
		LIMIT $2`

	rows, err := r.db.Query(ctx, query, clientID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []model.AttendanceWithDetails
	for rows.Next() {
		var a model.AttendanceWithDetails
		err := rows.Scan(
			&a.ID, &a.ClientID, &a.VerifiedBy, &a.VerifiedAt,
			&a.ClientName, &a.VerifiedName,
		)
		if err != nil {
			return nil, err
		}
		history = append(history, a)
	}
	return history, rows.Err()
}
