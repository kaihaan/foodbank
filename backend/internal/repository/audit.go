package repository

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finchley-foodbank/foodbank/internal/model"
)

type AuditRepository struct {
	db *pgxpool.Pool
}

func NewAuditRepository(db *pgxpool.Pool) *AuditRepository {
	return &AuditRepository{db: db}
}

// Log creates a new audit log entry
func (r *AuditRepository) Log(ctx context.Context, tableName string, recordID uuid.UUID, action string, oldValues, newValues interface{}, changedBy uuid.UUID) error {
	var oldJSON, newJSON []byte
	var err error

	if oldValues != nil {
		oldJSON, err = json.Marshal(oldValues)
		if err != nil {
			return err
		}
	}

	if newValues != nil {
		newJSON, err = json.Marshal(newValues)
		if err != nil {
			return err
		}
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
		VALUES ($1, $2, $3, $4, $5, $6)
	`, tableName, recordID, action, oldJSON, newJSON, changedBy)

	return err
}

// List returns audit logs with pagination and optional filtering
func (r *AuditRepository) List(ctx context.Context, tableName string, recordID *uuid.UUID, limit, offset int) ([]model.AuditLog, int, error) {
	// Build query based on filters
	baseQuery := `
		FROM audit_log a
		LEFT JOIN staff s ON a.changed_by = s.id
		LEFT JOIN clients c ON a.table_name = 'clients' AND a.record_id = c.id
		WHERE 1=1
	`
	args := []interface{}{}
	argNum := 1

	if tableName != "" {
		baseQuery += ` AND a.table_name = $` + string(rune('0'+argNum))
		args = append(args, tableName)
		argNum++
	}

	if recordID != nil {
		baseQuery += ` AND a.record_id = $` + string(rune('0'+argNum))
		args = append(args, *recordID)
		argNum++
	}

	// Get total count
	var total int
	countQuery := "SELECT COUNT(*) " + baseQuery
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get paginated results
	selectQuery := `
		SELECT a.id, a.table_name, a.record_id, a.action, a.old_values, a.new_values,
		       a.changed_by, a.changed_at, COALESCE(s.name, '') as changed_by_name,
		       COALESCE(c.name, '') as record_name
	` + baseQuery + ` ORDER BY a.changed_at DESC LIMIT $` + string(rune('0'+argNum)) + ` OFFSET $` + string(rune('0'+argNum+1))
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []model.AuditLog
	for rows.Next() {
		var log model.AuditLog
		err := rows.Scan(
			&log.ID, &log.TableName, &log.RecordID, &log.Action,
			&log.OldValues, &log.NewValues, &log.ChangedBy, &log.ChangedAt,
			&log.ChangedByName, &log.RecordName,
		)
		if err != nil {
			return nil, 0, err
		}
		logs = append(logs, log)
	}

	return logs, total, nil
}

// GetByRecordID returns all audit logs for a specific record
func (r *AuditRepository) GetByRecordID(ctx context.Context, tableName string, recordID uuid.UUID) ([]model.AuditLog, error) {
	rows, err := r.db.Query(ctx, `
		SELECT a.id, a.table_name, a.record_id, a.action, a.old_values, a.new_values,
		       a.changed_by, a.changed_at, COALESCE(s.name, '') as changed_by_name,
		       '' as record_name
		FROM audit_log a
		LEFT JOIN staff s ON a.changed_by = s.id
		WHERE a.table_name = $1 AND a.record_id = $2
		ORDER BY a.changed_at DESC
	`, tableName, recordID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []model.AuditLog
	for rows.Next() {
		var log model.AuditLog
		err := rows.Scan(
			&log.ID, &log.TableName, &log.RecordID, &log.Action,
			&log.OldValues, &log.NewValues, &log.ChangedBy, &log.ChangedAt,
			&log.ChangedByName, &log.RecordName,
		)
		if err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	return logs, nil
}
