package service

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// BackupService handles database backup and restore operations
type BackupService struct {
	db *pgxpool.Pool
}

// NewBackupService creates a new backup service
func NewBackupService(db *pgxpool.Pool) *BackupService {
	return &BackupService{db: db}
}

// Backup represents a complete database backup
type Backup struct {
	Version              string                  `json:"version"`
	CreatedAt            time.Time               `json:"created_at"`
	CreatedBy            string                  `json:"created_by"`
	Staff                []StaffBackup           `json:"staff"`
	Clients              []ClientBackup          `json:"clients"`
	Attendance           []AttendanceBackup      `json:"attendance"`
	AuditLog             []AuditLogBackup        `json:"audit_log"`
	RegistrationRequests []RegistrationBackup    `json:"registration_requests"`
	VerificationCodes    []VerificationBackup    `json:"verification_codes"`
}

// StaffBackup represents a staff record for backup
type StaffBackup struct {
	ID              uuid.UUID  `json:"id"`
	Auth0ID         string     `json:"auth0_id"`
	Name            string     `json:"name"`
	Email           string     `json:"email"`
	Mobile          *string    `json:"mobile,omitempty"`
	Address         *string    `json:"address,omitempty"`
	Theme           string     `json:"theme"`
	BackgroundImage string     `json:"background_image"`
	Role            string     `json:"role"`
	IsActive        bool       `json:"is_active"`
	EmailVerified   bool       `json:"email_verified"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	CreatedBy       *uuid.UUID `json:"created_by,omitempty"`
	DeactivatedAt   *time.Time `json:"deactivated_at,omitempty"`
	DeactivatedBy   *uuid.UUID `json:"deactivated_by,omitempty"`
}

// ClientBackup represents a client record for backup
type ClientBackup struct {
	ID              uuid.UUID `json:"id"`
	BarcodeID       string    `json:"barcode_id"`
	Name            string    `json:"name"`
	Address         string    `json:"address"`
	FamilySize      int       `json:"family_size"`
	NumChildren     int       `json:"num_children"`
	ChildrenAges    *string   `json:"children_ages,omitempty"`
	Reason          *string   `json:"reason,omitempty"`
	PhotoURL        *string   `json:"photo_url,omitempty"`
	AppointmentDay  *string   `json:"appointment_day,omitempty"`
	AppointmentTime *string   `json:"appointment_time,omitempty"`
	PrefGlutenFree  bool      `json:"pref_gluten_free"`
	PrefHalal       bool      `json:"pref_halal"`
	PrefVegetarian  bool      `json:"pref_vegetarian"`
	PrefNoCooking   bool      `json:"pref_no_cooking"`
	CreatedAt       time.Time `json:"created_at"`
	CreatedBy       uuid.UUID `json:"created_by"`
}

// AttendanceBackup represents an attendance record for backup
type AttendanceBackup struct {
	ID         uuid.UUID `json:"id"`
	ClientID   uuid.UUID `json:"client_id"`
	VerifiedBy uuid.UUID `json:"verified_by"`
	VerifiedAt time.Time `json:"verified_at"`
}

// AuditLogBackup represents an audit log record for backup
type AuditLogBackup struct {
	ID        uuid.UUID       `json:"id"`
	TableName string          `json:"table_name"`
	RecordID  uuid.UUID       `json:"record_id"`
	Action    string          `json:"action"`
	OldValues json.RawMessage `json:"old_values,omitempty"`
	NewValues json.RawMessage `json:"new_values,omitempty"`
	ChangedBy uuid.UUID       `json:"changed_by"`
	ChangedAt time.Time       `json:"changed_at"`
}

// RegistrationBackup represents a registration request for backup
type RegistrationBackup struct {
	ID             uuid.UUID  `json:"id"`
	Name           string     `json:"name"`
	Email          string     `json:"email"`
	Mobile         *string    `json:"mobile,omitempty"`
	Address        *string    `json:"address,omitempty"`
	Status         string     `json:"status"`
	ApprovalToken  string     `json:"approval_token"`
	TokenExpiresAt time.Time  `json:"token_expires_at"`
	CreatedAt      time.Time  `json:"created_at"`
	ReviewedAt     *time.Time `json:"reviewed_at,omitempty"`
	ReviewedBy     *uuid.UUID `json:"reviewed_by,omitempty"`
}

// VerificationBackup represents a verification code for backup
type VerificationBackup struct {
	ID         uuid.UUID  `json:"id"`
	StaffID    uuid.UUID  `json:"staff_id"`
	Code       string     `json:"code"`
	ExpiresAt  time.Time  `json:"expires_at"`
	Attempts   int        `json:"attempts"`
	VerifiedAt *time.Time `json:"verified_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

// CreateBackup exports all database tables to a Backup struct
func (s *BackupService) CreateBackup(ctx context.Context, createdBy string) (*Backup, error) {
	backup := &Backup{
		Version:   "1.0",
		CreatedAt: time.Now().UTC(),
		CreatedBy: createdBy,
	}

	// Export staff
	rows, err := s.db.Query(ctx, `
		SELECT id, auth0_id, name, email, mobile, address, theme,
		       COALESCE(background_image, '') as background_image, role, is_active,
		       email_verified, email_verified_at, created_at, created_by,
		       deactivated_at, deactivated_by
		FROM staff ORDER BY created_at
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query staff: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var s StaffBackup
		err := rows.Scan(&s.ID, &s.Auth0ID, &s.Name, &s.Email, &s.Mobile, &s.Address,
			&s.Theme, &s.BackgroundImage, &s.Role, &s.IsActive, &s.EmailVerified,
			&s.EmailVerifiedAt, &s.CreatedAt, &s.CreatedBy, &s.DeactivatedAt, &s.DeactivatedBy)
		if err != nil {
			return nil, fmt.Errorf("failed to scan staff: %w", err)
		}
		backup.Staff = append(backup.Staff, s)
	}

	// Export clients
	rows, err = s.db.Query(ctx, `
		SELECT id, barcode_id, name, address, family_size, num_children, children_ages,
		       reason, photo_url, appointment_day, appointment_time, pref_gluten_free,
		       pref_halal, pref_vegetarian, pref_no_cooking, created_at, created_by
		FROM clients ORDER BY created_at
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query clients: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var c ClientBackup
		err := rows.Scan(&c.ID, &c.BarcodeID, &c.Name, &c.Address, &c.FamilySize,
			&c.NumChildren, &c.ChildrenAges, &c.Reason, &c.PhotoURL, &c.AppointmentDay,
			&c.AppointmentTime, &c.PrefGlutenFree, &c.PrefHalal, &c.PrefVegetarian,
			&c.PrefNoCooking, &c.CreatedAt, &c.CreatedBy)
		if err != nil {
			return nil, fmt.Errorf("failed to scan client: %w", err)
		}
		backup.Clients = append(backup.Clients, c)
	}

	// Export attendance
	rows, err = s.db.Query(ctx, `
		SELECT id, client_id, verified_by, verified_at
		FROM attendance ORDER BY verified_at
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query attendance: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var a AttendanceBackup
		err := rows.Scan(&a.ID, &a.ClientID, &a.VerifiedBy, &a.VerifiedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan attendance: %w", err)
		}
		backup.Attendance = append(backup.Attendance, a)
	}

	// Export audit log
	rows, err = s.db.Query(ctx, `
		SELECT id, table_name, record_id, action, old_values, new_values, changed_by, changed_at
		FROM audit_log ORDER BY changed_at
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query audit_log: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var a AuditLogBackup
		err := rows.Scan(&a.ID, &a.TableName, &a.RecordID, &a.Action, &a.OldValues,
			&a.NewValues, &a.ChangedBy, &a.ChangedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan audit_log: %w", err)
		}
		backup.AuditLog = append(backup.AuditLog, a)
	}

	// Export registration requests
	rows, err = s.db.Query(ctx, `
		SELECT id, name, email, mobile, address, status, approval_token,
		       token_expires_at, created_at, reviewed_at, reviewed_by
		FROM registration_requests ORDER BY created_at
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query registration_requests: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var r RegistrationBackup
		err := rows.Scan(&r.ID, &r.Name, &r.Email, &r.Mobile, &r.Address, &r.Status,
			&r.ApprovalToken, &r.TokenExpiresAt, &r.CreatedAt, &r.ReviewedAt, &r.ReviewedBy)
		if err != nil {
			return nil, fmt.Errorf("failed to scan registration_request: %w", err)
		}
		backup.RegistrationRequests = append(backup.RegistrationRequests, r)
	}

	// Export verification codes
	rows, err = s.db.Query(ctx, `
		SELECT id, staff_id, code, expires_at, attempts, verified_at, created_at
		FROM verification_codes ORDER BY created_at
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query verification_codes: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var v VerificationBackup
		err := rows.Scan(&v.ID, &v.StaffID, &v.Code, &v.ExpiresAt, &v.Attempts,
			&v.VerifiedAt, &v.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan verification_code: %w", err)
		}
		backup.VerificationCodes = append(backup.VerificationCodes, v)
	}

	return backup, nil
}

// ExportCSV exports all tables as a ZIP archive containing CSV files
func (s *BackupService) ExportCSV(ctx context.Context) ([]byte, error) {
	var buf bytes.Buffer
	zipWriter := zip.NewWriter(&buf)

	// UTF-8 BOM for Excel compatibility
	bom := []byte{0xEF, 0xBB, 0xBF}

	// Export staff
	if err := s.writeStaffCSV(ctx, zipWriter, bom); err != nil {
		return nil, err
	}

	// Export clients
	if err := s.writeClientsCSV(ctx, zipWriter, bom); err != nil {
		return nil, err
	}

	// Export attendance
	if err := s.writeAttendanceCSV(ctx, zipWriter, bom); err != nil {
		return nil, err
	}

	// Export audit log
	if err := s.writeAuditLogCSV(ctx, zipWriter, bom); err != nil {
		return nil, err
	}

	// Export registration requests
	if err := s.writeRegistrationRequestsCSV(ctx, zipWriter, bom); err != nil {
		return nil, err
	}

	// Export verification codes
	if err := s.writeVerificationCodesCSV(ctx, zipWriter, bom); err != nil {
		return nil, err
	}

	if err := zipWriter.Close(); err != nil {
		return nil, fmt.Errorf("failed to close zip: %w", err)
	}

	return buf.Bytes(), nil
}

func (s *BackupService) writeStaffCSV(ctx context.Context, zw *zip.Writer, bom []byte) error {
	f, err := zw.Create("staff.csv")
	if err != nil {
		return err
	}
	f.Write(bom)
	w := csv.NewWriter(f)

	// Header
	w.Write([]string{"id", "auth0_id", "name", "email", "mobile", "address", "theme",
		"background_image", "role", "is_active", "email_verified", "email_verified_at",
		"created_at", "created_by", "deactivated_at", "deactivated_by"})

	rows, err := s.db.Query(ctx, `
		SELECT id, auth0_id, name, email, mobile, address, theme,
		       COALESCE(background_image, '') as background_image, role, is_active,
		       email_verified, email_verified_at, created_at, created_by,
		       deactivated_at, deactivated_by
		FROM staff ORDER BY created_at
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var sb StaffBackup
		err := rows.Scan(&sb.ID, &sb.Auth0ID, &sb.Name, &sb.Email, &sb.Mobile, &sb.Address,
			&sb.Theme, &sb.BackgroundImage, &sb.Role, &sb.IsActive, &sb.EmailVerified,
			&sb.EmailVerifiedAt, &sb.CreatedAt, &sb.CreatedBy, &sb.DeactivatedAt, &sb.DeactivatedBy)
		if err != nil {
			return err
		}
		w.Write([]string{
			sb.ID.String(), sb.Auth0ID, sb.Name, sb.Email,
			ptrToString(sb.Mobile), ptrToString(sb.Address), sb.Theme, sb.BackgroundImage,
			sb.Role, boolToString(sb.IsActive), boolToString(sb.EmailVerified),
			timeToString(sb.EmailVerifiedAt), sb.CreatedAt.Format(time.RFC3339),
			uuidPtrToString(sb.CreatedBy), timeToString(sb.DeactivatedAt), uuidPtrToString(sb.DeactivatedBy),
		})
	}
	w.Flush()
	return nil
}

func (s *BackupService) writeClientsCSV(ctx context.Context, zw *zip.Writer, bom []byte) error {
	f, err := zw.Create("clients.csv")
	if err != nil {
		return err
	}
	f.Write(bom)
	w := csv.NewWriter(f)

	w.Write([]string{"id", "barcode_id", "name", "address", "family_size", "num_children",
		"children_ages", "reason", "photo_url", "appointment_day", "appointment_time",
		"pref_gluten_free", "pref_halal", "pref_vegetarian", "pref_no_cooking",
		"created_at", "created_by"})

	rows, err := s.db.Query(ctx, `
		SELECT id, barcode_id, name, address, family_size, num_children, children_ages,
		       reason, photo_url, appointment_day, appointment_time, pref_gluten_free,
		       pref_halal, pref_vegetarian, pref_no_cooking, created_at, created_by
		FROM clients ORDER BY created_at
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var c ClientBackup
		err := rows.Scan(&c.ID, &c.BarcodeID, &c.Name, &c.Address, &c.FamilySize,
			&c.NumChildren, &c.ChildrenAges, &c.Reason, &c.PhotoURL, &c.AppointmentDay,
			&c.AppointmentTime, &c.PrefGlutenFree, &c.PrefHalal, &c.PrefVegetarian,
			&c.PrefNoCooking, &c.CreatedAt, &c.CreatedBy)
		if err != nil {
			return err
		}
		w.Write([]string{
			c.ID.String(), c.BarcodeID, c.Name, c.Address,
			fmt.Sprintf("%d", c.FamilySize), fmt.Sprintf("%d", c.NumChildren),
			ptrToString(c.ChildrenAges), ptrToString(c.Reason), ptrToString(c.PhotoURL),
			ptrToString(c.AppointmentDay), ptrToString(c.AppointmentTime),
			boolToString(c.PrefGlutenFree), boolToString(c.PrefHalal),
			boolToString(c.PrefVegetarian), boolToString(c.PrefNoCooking),
			c.CreatedAt.Format(time.RFC3339), c.CreatedBy.String(),
		})
	}
	w.Flush()
	return nil
}

func (s *BackupService) writeAttendanceCSV(ctx context.Context, zw *zip.Writer, bom []byte) error {
	f, err := zw.Create("attendance.csv")
	if err != nil {
		return err
	}
	f.Write(bom)
	w := csv.NewWriter(f)

	w.Write([]string{"id", "client_id", "verified_by", "verified_at"})

	rows, err := s.db.Query(ctx, `
		SELECT id, client_id, verified_by, verified_at
		FROM attendance ORDER BY verified_at
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var a AttendanceBackup
		err := rows.Scan(&a.ID, &a.ClientID, &a.VerifiedBy, &a.VerifiedAt)
		if err != nil {
			return err
		}
		w.Write([]string{
			a.ID.String(), a.ClientID.String(), a.VerifiedBy.String(),
			a.VerifiedAt.Format(time.RFC3339),
		})
	}
	w.Flush()
	return nil
}

func (s *BackupService) writeAuditLogCSV(ctx context.Context, zw *zip.Writer, bom []byte) error {
	f, err := zw.Create("audit_log.csv")
	if err != nil {
		return err
	}
	f.Write(bom)
	w := csv.NewWriter(f)

	w.Write([]string{"id", "table_name", "record_id", "action", "old_values", "new_values",
		"changed_by", "changed_at"})

	rows, err := s.db.Query(ctx, `
		SELECT id, table_name, record_id, action, old_values, new_values, changed_by, changed_at
		FROM audit_log ORDER BY changed_at
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var a AuditLogBackup
		err := rows.Scan(&a.ID, &a.TableName, &a.RecordID, &a.Action, &a.OldValues,
			&a.NewValues, &a.ChangedBy, &a.ChangedAt)
		if err != nil {
			return err
		}
		w.Write([]string{
			a.ID.String(), a.TableName, a.RecordID.String(), a.Action,
			string(a.OldValues), string(a.NewValues),
			a.ChangedBy.String(), a.ChangedAt.Format(time.RFC3339),
		})
	}
	w.Flush()
	return nil
}

func (s *BackupService) writeRegistrationRequestsCSV(ctx context.Context, zw *zip.Writer, bom []byte) error {
	f, err := zw.Create("registration_requests.csv")
	if err != nil {
		return err
	}
	f.Write(bom)
	w := csv.NewWriter(f)

	w.Write([]string{"id", "name", "email", "mobile", "address", "status", "approval_token",
		"token_expires_at", "created_at", "reviewed_at", "reviewed_by"})

	rows, err := s.db.Query(ctx, `
		SELECT id, name, email, mobile, address, status, approval_token,
		       token_expires_at, created_at, reviewed_at, reviewed_by
		FROM registration_requests ORDER BY created_at
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var r RegistrationBackup
		err := rows.Scan(&r.ID, &r.Name, &r.Email, &r.Mobile, &r.Address, &r.Status,
			&r.ApprovalToken, &r.TokenExpiresAt, &r.CreatedAt, &r.ReviewedAt, &r.ReviewedBy)
		if err != nil {
			return err
		}
		w.Write([]string{
			r.ID.String(), r.Name, r.Email, ptrToString(r.Mobile), ptrToString(r.Address),
			r.Status, r.ApprovalToken, r.TokenExpiresAt.Format(time.RFC3339),
			r.CreatedAt.Format(time.RFC3339), timeToString(r.ReviewedAt), uuidPtrToString(r.ReviewedBy),
		})
	}
	w.Flush()
	return nil
}

func (s *BackupService) writeVerificationCodesCSV(ctx context.Context, zw *zip.Writer, bom []byte) error {
	f, err := zw.Create("verification_codes.csv")
	if err != nil {
		return err
	}
	f.Write(bom)
	w := csv.NewWriter(f)

	w.Write([]string{"id", "staff_id", "code", "expires_at", "attempts", "verified_at", "created_at"})

	rows, err := s.db.Query(ctx, `
		SELECT id, staff_id, code, expires_at, attempts, verified_at, created_at
		FROM verification_codes ORDER BY created_at
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var v VerificationBackup
		err := rows.Scan(&v.ID, &v.StaffID, &v.Code, &v.ExpiresAt, &v.Attempts,
			&v.VerifiedAt, &v.CreatedAt)
		if err != nil {
			return err
		}
		w.Write([]string{
			v.ID.String(), v.StaffID.String(), v.Code, v.ExpiresAt.Format(time.RFC3339),
			fmt.Sprintf("%d", v.Attempts), timeToString(v.VerifiedAt), v.CreatedAt.Format(time.RFC3339),
		})
	}
	w.Flush()
	return nil
}

// RestoreBackup imports data from a backup
func (s *BackupService) RestoreBackup(ctx context.Context, backup *Backup) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Disable foreign key checks temporarily by deleting in correct order
	// Delete in reverse dependency order
	_, err = tx.Exec(ctx, "DELETE FROM verification_codes")
	if err != nil {
		return fmt.Errorf("failed to clear verification_codes: %w", err)
	}
	_, err = tx.Exec(ctx, "DELETE FROM registration_requests")
	if err != nil {
		return fmt.Errorf("failed to clear registration_requests: %w", err)
	}
	_, err = tx.Exec(ctx, "DELETE FROM audit_log")
	if err != nil {
		return fmt.Errorf("failed to clear audit_log: %w", err)
	}
	_, err = tx.Exec(ctx, "DELETE FROM attendance")
	if err != nil {
		return fmt.Errorf("failed to clear attendance: %w", err)
	}
	_, err = tx.Exec(ctx, "DELETE FROM clients")
	if err != nil {
		return fmt.Errorf("failed to clear clients: %w", err)
	}
	_, err = tx.Exec(ctx, "DELETE FROM staff")
	if err != nil {
		return fmt.Errorf("failed to clear staff: %w", err)
	}

	// Import staff first (no dependencies)
	for _, staff := range backup.Staff {
		_, err := tx.Exec(ctx, `
			INSERT INTO staff (id, auth0_id, name, email, mobile, address, theme, background_image,
			                   role, is_active, email_verified, email_verified_at, created_at,
			                   created_by, deactivated_at, deactivated_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		`, staff.ID, staff.Auth0ID, staff.Name, staff.Email, staff.Mobile, staff.Address,
			staff.Theme, staff.BackgroundImage, staff.Role, staff.IsActive, staff.EmailVerified,
			staff.EmailVerifiedAt, staff.CreatedAt, staff.CreatedBy, staff.DeactivatedAt, staff.DeactivatedBy)
		if err != nil {
			return fmt.Errorf("failed to insert staff %s: %w", staff.Email, err)
		}
	}

	// Import clients (depends on staff)
	for _, client := range backup.Clients {
		_, err := tx.Exec(ctx, `
			INSERT INTO clients (id, barcode_id, name, address, family_size, num_children, children_ages,
			                     reason, photo_url, appointment_day, appointment_time, pref_gluten_free,
			                     pref_halal, pref_vegetarian, pref_no_cooking, created_at, created_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		`, client.ID, client.BarcodeID, client.Name, client.Address, client.FamilySize,
			client.NumChildren, client.ChildrenAges, client.Reason, client.PhotoURL,
			client.AppointmentDay, client.AppointmentTime, client.PrefGlutenFree,
			client.PrefHalal, client.PrefVegetarian, client.PrefNoCooking,
			client.CreatedAt, client.CreatedBy)
		if err != nil {
			return fmt.Errorf("failed to insert client %s: %w", client.Name, err)
		}
	}

	// Import attendance (depends on clients, staff)
	for _, att := range backup.Attendance {
		_, err := tx.Exec(ctx, `
			INSERT INTO attendance (id, client_id, verified_by, verified_at)
			VALUES ($1, $2, $3, $4)
		`, att.ID, att.ClientID, att.VerifiedBy, att.VerifiedAt)
		if err != nil {
			return fmt.Errorf("failed to insert attendance %s: %w", att.ID, err)
		}
	}

	// Import audit log (depends on staff)
	for _, audit := range backup.AuditLog {
		_, err := tx.Exec(ctx, `
			INSERT INTO audit_log (id, table_name, record_id, action, old_values, new_values, changed_by, changed_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`, audit.ID, audit.TableName, audit.RecordID, audit.Action,
			audit.OldValues, audit.NewValues, audit.ChangedBy, audit.ChangedAt)
		if err != nil {
			return fmt.Errorf("failed to insert audit_log %s: %w", audit.ID, err)
		}
	}

	// Import registration requests
	for _, req := range backup.RegistrationRequests {
		_, err := tx.Exec(ctx, `
			INSERT INTO registration_requests (id, name, email, mobile, address, status, approval_token,
			                                   token_expires_at, created_at, reviewed_at, reviewed_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`, req.ID, req.Name, req.Email, req.Mobile, req.Address, req.Status, req.ApprovalToken,
			req.TokenExpiresAt, req.CreatedAt, req.ReviewedAt, req.ReviewedBy)
		if err != nil {
			return fmt.Errorf("failed to insert registration_request %s: %w", req.Email, err)
		}
	}

	// Import verification codes
	for _, code := range backup.VerificationCodes {
		_, err := tx.Exec(ctx, `
			INSERT INTO verification_codes (id, staff_id, code, expires_at, attempts, verified_at, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, code.ID, code.StaffID, code.Code, code.ExpiresAt, code.Attempts, code.VerifiedAt, code.CreatedAt)
		if err != nil {
			return fmt.Errorf("failed to insert verification_code %s: %w", code.ID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// CheckDatabaseConnection tests if the database is accessible
func (s *BackupService) CheckDatabaseConnection(ctx context.Context) error {
	return s.db.Ping(ctx)
}

// Helper functions for CSV export
func ptrToString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func boolToString(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

func timeToString(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format(time.RFC3339)
}

func uuidPtrToString(u *uuid.UUID) string {
	if u == nil {
		return ""
	}
	return u.String()
}
