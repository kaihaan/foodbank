package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/finchley-foodbank/foodbank/internal/model"
	"github.com/finchley-foodbank/foodbank/internal/repository"
)

type ImportService struct {
	db         *pgxpool.Pool
	clientRepo *repository.ClientRepository
	auditRepo  *repository.AuditRepository
}

func NewImportService(db *pgxpool.Pool, clientRepo *repository.ClientRepository, auditRepo *repository.AuditRepository) *ImportService {
	return &ImportService{
		db:         db,
		clientRepo: clientRepo,
		auditRepo:  auditRepo,
	}
}

var validAppointmentDays = map[string]bool{
	"monday": true, "tuesday": true, "wednesday": true,
	"thursday": true, "friday": true, "saturday": true,
}

var timeRegex = regexp.MustCompile(`^([01]?[0-9]|2[0-3]):([0-5][0-9])$`)

// ValidateRows validates all rows without importing
func (s *ImportService) ValidateRows(ctx context.Context, rows []model.ImportClientRow) (*model.ValidationResult, error) {
	result := &model.ValidationResult{
		TotalRows: len(rows),
		Errors:    []model.ValidationError{},
		Warnings:  []model.ValidationWarning{},
	}

	validCount := 0

	for _, row := range rows {
		rowValid := true

		// Validate required fields
		if strings.TrimSpace(row.Name) == "" {
			result.Errors = append(result.Errors, model.ValidationError{
				Row:     row.RowNumber,
				Field:   "name",
				Message: "Name is required",
			})
			rowValid = false
		}

		if strings.TrimSpace(row.Address) == "" {
			result.Errors = append(result.Errors, model.ValidationError{
				Row:     row.RowNumber,
				Field:   "address",
				Message: "Address is required",
			})
			rowValid = false
		}

		if row.FamilySize < 1 {
			result.Errors = append(result.Errors, model.ValidationError{
				Row:     row.RowNumber,
				Field:   "family_size",
				Message: "Family size must be at least 1",
				Value:   fmt.Sprintf("%d", row.FamilySize),
			})
			rowValid = false
		}

		if row.NumChildren < 0 {
			result.Errors = append(result.Errors, model.ValidationError{
				Row:     row.RowNumber,
				Field:   "num_children",
				Message: "Number of children cannot be negative",
				Value:   fmt.Sprintf("%d", row.NumChildren),
			})
			rowValid = false
		}

		// Validate optional fields
		if row.AppointmentDay != nil && *row.AppointmentDay != "" {
			day := strings.ToLower(strings.TrimSpace(*row.AppointmentDay))
			if !validAppointmentDays[day] {
				result.Errors = append(result.Errors, model.ValidationError{
					Row:     row.RowNumber,
					Field:   "appointment_day",
					Message: "Invalid day. Must be Monday-Saturday",
					Value:   *row.AppointmentDay,
				})
				rowValid = false
			}
		}

		if row.AppointmentTime != nil && *row.AppointmentTime != "" {
			if !timeRegex.MatchString(*row.AppointmentTime) {
				result.Errors = append(result.Errors, model.ValidationError{
					Row:     row.RowNumber,
					Field:   "appointment_time",
					Message: "Invalid time format. Use HH:MM (e.g., 10:30)",
					Value:   *row.AppointmentTime,
				})
				rowValid = false
			}
		}

		// Check for duplicates in database
		if rowValid && strings.TrimSpace(row.Name) != "" && strings.TrimSpace(row.Address) != "" {
			existingID, err := s.findDuplicateClient(ctx, row.Name, row.Address)
			if err == nil && existingID != uuid.Nil {
				result.Warnings = append(result.Warnings, model.ValidationWarning{
					Row:        row.RowNumber,
					Field:      "name",
					Message:    fmt.Sprintf("Potential duplicate: '%s' at '%s' already exists", row.Name, truncateAddress(row.Address)),
					ExistingID: existingID,
				})
			}
		}

		if rowValid {
			validCount++
		}
	}

	result.ValidRows = validCount
	result.Valid = len(result.Errors) == 0

	return result, nil
}

// ImportClients imports clients in batches
func (s *ImportService) ImportClients(ctx context.Context, rows []model.ImportClientRow, staffID uuid.UUID, batchSize int, skipDuplicates bool) (*model.ImportResult, error) {
	if batchSize <= 0 {
		batchSize = 50
	}
	if batchSize > 100 {
		batchSize = 100
	}

	result := &model.ImportResult{
		Total:           len(rows),
		Results:         []model.BatchResult{},
		ImportedClients: []model.ImportedClient{},
	}

	// Process in batches
	for i := 0; i < len(rows); i += batchSize {
		end := i + batchSize
		if end > len(rows) {
			end = len(rows)
		}

		batch := rows[i:end]
		batchNum := (i / batchSize) + 1

		batchResult := s.importBatch(ctx, batch, staffID, skipDuplicates, batchNum, i+1, end)
		result.Results = append(result.Results, batchResult)
		result.Imported += batchResult.Success
		result.Skipped += batchResult.Skipped
		result.Failed += batchResult.Failed

		// Collect imported clients from this batch
		// Note: We'll need to track this in importBatch
	}

	result.Success = result.Failed == 0

	return result, nil
}

func (s *ImportService) importBatch(ctx context.Context, rows []model.ImportClientRow, staffID uuid.UUID, skipDuplicates bool, batchNum, start, end int) model.BatchResult {
	result := model.BatchResult{
		Batch: batchNum,
		Start: start,
		End:   end,
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		result.Error = fmt.Sprintf("Failed to begin transaction: %v", err)
		result.Failed = len(rows)
		return result
	}
	defer tx.Rollback(ctx)

	for _, row := range rows {
		// Check for duplicates if skip mode is enabled
		if skipDuplicates {
			existingID, _ := s.findDuplicateClient(ctx, row.Name, row.Address)
			if existingID != uuid.Nil {
				result.Skipped++
				continue
			}
		}

		// Generate barcode
		barcodeID := generateClientBarcodeID()

		// Insert client
		query := `
			INSERT INTO clients (barcode_id, name, address, family_size, num_children, children_ages,
			                     reason, photo_url, appointment_day, appointment_time,
			                     pref_gluten_free, pref_halal, pref_vegetarian, pref_no_cooking, created_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
			RETURNING id`

		var clientID uuid.UUID
		err := tx.QueryRow(ctx, query,
			barcodeID, strings.TrimSpace(row.Name), strings.TrimSpace(row.Address),
			row.FamilySize, row.NumChildren, row.ChildrenAges,
			row.Reason, nil, // photo_url is always nil for imports
			normalizeAppointmentDay(row.AppointmentDay), row.AppointmentTime,
			row.PrefGlutenFree, row.PrefHalal, row.PrefVegetarian, row.PrefNoCooking,
			staffID,
		).Scan(&clientID)

		if err != nil {
			result.Failed++
			continue
		}

		result.Success++
	}

	if err := tx.Commit(ctx); err != nil {
		result.Error = fmt.Sprintf("Failed to commit: %v", err)
		result.Failed = len(rows)
		result.Success = 0
		result.Skipped = 0
		return result
	}

	return result
}

// findDuplicateClient checks if a client with the same name and address exists
func (s *ImportService) findDuplicateClient(ctx context.Context, name, address string) (uuid.UUID, error) {
	query := `
		SELECT id FROM clients
		WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
		  AND LOWER(TRIM(address)) = LOWER(TRIM($2))
		LIMIT 1`

	var id uuid.UUID
	err := s.db.QueryRow(ctx, query, name, address).Scan(&id)
	if err != nil {
		return uuid.Nil, err
	}
	return id, nil
}

// normalizeAppointmentDay capitalizes the first letter
func normalizeAppointmentDay(day *string) *string {
	if day == nil || *day == "" {
		return nil
	}
	d := strings.TrimSpace(*day)
	if d == "" {
		return nil
	}
	normalized := strings.Title(strings.ToLower(d))
	return &normalized
}

// truncateAddress shortens address for display
func truncateAddress(addr string) string {
	if len(addr) > 30 {
		return addr[:30] + "..."
	}
	return addr
}

// GenerateCSVTemplate returns a CSV template with headers and example rows
func (s *ImportService) GenerateCSVTemplate() string {
	return `name,address,family_size,num_children,children_ages,reason,appointment_day,appointment_time,pref_gluten_free,pref_halal,pref_vegetarian,pref_no_cooking
"John Smith","123 High Street, London N12 0AB",4,2,"5, 8","Referred by GP",Tuesday,10:30,false,false,false,false
"Jane Doe","45 Park Road, Barnet EN5 1AA",2,0,"","Job loss",Thursday,14:00,false,true,false,false
"Bob Wilson","78 Church Lane, Finchley N3 2PQ",3,1,"3","Financial hardship",Monday,09:00,true,false,false,false
`
}

// generateClientBarcodeID creates a unique barcode ID for client import
func generateClientBarcodeID() string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 5)
	rand.Read(b)
	for i := range b {
		b[i] = charset[int(b[i])%len(charset)]
	}
	return fmt.Sprintf("FFB-%s-%s", time.Now().Format("200601"), string(b))
}
