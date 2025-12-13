package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/finchley-foodbank/foodbank/internal/model"
	"github.com/finchley-foodbank/foodbank/internal/repository"
)

type ClientService struct {
	repo      *repository.ClientRepository
	auditRepo *repository.AuditRepository
}

func NewClientService(repo *repository.ClientRepository, auditRepo *repository.AuditRepository) *ClientService {
	return &ClientService{repo: repo, auditRepo: auditRepo}
}

// generateBarcodeID creates a unique barcode ID in format: FFB-YYYYMM-XXXXX
// where XXXXX is a random alphanumeric string
func generateBarcodeID() string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Excludes confusable chars: 0,O,1,I
	b := make([]byte, 5)
	rand.Read(b)
	for i := range b {
		b[i] = charset[int(b[i])%len(charset)]
	}
	return fmt.Sprintf("FFB-%s-%s", time.Now().Format("200601"), string(b))
}

func (s *ClientService) Create(ctx context.Context, req *model.CreateClientRequest, createdBy uuid.UUID) (*model.Client, error) {
	barcodeID := generateBarcodeID()
	client, err := s.repo.Create(ctx, req, barcodeID, createdBy)
	if err != nil {
		return nil, err
	}

	// Log audit entry
	if s.auditRepo != nil {
		s.auditRepo.Log(ctx, "clients", client.ID, "INSERT", nil, client, createdBy)
	}

	return client, nil
}

func (s *ClientService) GetByID(ctx context.Context, id uuid.UUID) (*model.Client, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *ClientService) GetByBarcodeID(ctx context.Context, barcodeID string) (*model.Client, error) {
	return s.repo.GetByBarcodeID(ctx, barcodeID)
}

func (s *ClientService) Update(ctx context.Context, id uuid.UUID, req *model.UpdateClientRequest, updatedBy uuid.UUID) (*model.Client, error) {
	// Get old values for audit
	oldClient, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Perform update
	client, err := s.repo.Update(ctx, id, req)
	if err != nil {
		return nil, err
	}

	// Log audit entry
	if s.auditRepo != nil {
		s.auditRepo.Log(ctx, "clients", client.ID, "UPDATE", oldClient, client, updatedBy)
	}

	return client, nil
}

func (s *ClientService) Search(ctx context.Context, params *model.ClientSearchParams) ([]model.Client, int, error) {
	if params.Limit <= 0 {
		params.Limit = 20
	}
	if params.Limit > 100 {
		params.Limit = 100
	}
	return s.repo.Search(ctx, params)
}

func (s *ClientService) List(ctx context.Context, limit, offset int) ([]model.Client, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 10000 {
		limit = 10000
	}
	return s.repo.List(ctx, limit, offset)
}

func (s *ClientService) RecordAttendance(ctx context.Context, clientID, verifiedBy uuid.UUID) (*model.Attendance, error) {
	// Verify client exists
	_, err := s.repo.GetByID(ctx, clientID)
	if err != nil {
		return nil, err
	}
	return s.repo.RecordAttendance(ctx, clientID, verifiedBy)
}

func (s *ClientService) GetAttendanceHistory(ctx context.Context, clientID uuid.UUID, limit int) ([]model.AttendanceWithDetails, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	return s.repo.GetAttendanceHistory(ctx, clientID, limit)
}
