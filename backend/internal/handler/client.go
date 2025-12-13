package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/finchley-foodbank/foodbank/internal/handler/middleware"
	"github.com/finchley-foodbank/foodbank/internal/model"
	"github.com/finchley-foodbank/foodbank/internal/repository"
	"github.com/finchley-foodbank/foodbank/internal/service"
)

type ClientHandler struct {
	clientService *service.ClientService
	staffService  *service.StaffService
}

func NewClientHandler(clientService *service.ClientService, staffService *service.StaffService) *ClientHandler {
	return &ClientHandler{
		clientService: clientService,
		staffService:  staffService,
	}
}

type ClientListResponse struct {
	Clients []model.Client `json:"clients"`
	Total   int            `json:"total"`
	Limit   int            `json:"limit"`
	Offset  int            `json:"offset"`
}

// Create registers a new client
func (h *ClientHandler) Create(w http.ResponseWriter, r *http.Request) {
	staffID, err := h.getStaffIDFromContext(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req model.CreateClientRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.Address == "" {
		http.Error(w, "Name and address are required", http.StatusBadRequest)
		return
	}

	if req.FamilySize < 1 {
		req.FamilySize = 1
	}

	client, err := h.clientService.Create(r.Context(), &req, staffID)
	if err != nil {
		http.Error(w, "Failed to create client", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(client)
}

// Get returns a client by ID
func (h *ClientHandler) Get(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid client ID", http.StatusBadRequest)
		return
	}

	client, err := h.clientService.GetByID(r.Context(), id)
	if errors.Is(err, repository.ErrClientNotFound) {
		http.Error(w, "Client not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(client)
}

// GetByBarcode returns a client by barcode ID
func (h *ClientHandler) GetByBarcode(w http.ResponseWriter, r *http.Request) {
	barcodeID := chi.URLParam(r, "code")
	if barcodeID == "" {
		http.Error(w, "Barcode ID is required", http.StatusBadRequest)
		return
	}

	client, err := h.clientService.GetByBarcodeID(r.Context(), barcodeID)
	if errors.Is(err, repository.ErrClientNotFound) {
		http.Error(w, "Client not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(client)
}

// List returns paginated clients, with optional search
func (h *ClientHandler) List(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit <= 0 {
		limit = 20
	}

	var clients []model.Client
	var total int
	var err error

	if query != "" {
		params := &model.ClientSearchParams{
			Query:  query,
			Limit:  limit,
			Offset: offset,
		}
		clients, total, err = h.clientService.Search(r.Context(), params)
	} else {
		clients, total, err = h.clientService.List(r.Context(), limit, offset)
	}

	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if clients == nil {
		clients = []model.Client{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ClientListResponse{
		Clients: clients,
		Total:   total,
		Limit:   limit,
		Offset:  offset,
	})
}

// Update updates a client's details
func (h *ClientHandler) Update(w http.ResponseWriter, r *http.Request) {
	staffID, err := h.getStaffIDFromContext(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid client ID", http.StatusBadRequest)
		return
	}

	var req model.UpdateClientRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	client, err := h.clientService.Update(r.Context(), id, &req, staffID)
	if errors.Is(err, repository.ErrClientNotFound) {
		http.Error(w, "Client not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(client)
}

// RecordAttendance records a client's visit
func (h *ClientHandler) RecordAttendance(w http.ResponseWriter, r *http.Request) {
	staffID, err := h.getStaffIDFromContext(r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	idStr := chi.URLParam(r, "id")
	clientID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid client ID", http.StatusBadRequest)
		return
	}

	attendance, err := h.clientService.RecordAttendance(r.Context(), clientID, staffID)
	if errors.Is(err, repository.ErrClientNotFound) {
		http.Error(w, "Client not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(attendance)
}

// GetAttendanceHistory returns a client's attendance history
func (h *ClientHandler) GetAttendanceHistory(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	clientID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid client ID", http.StatusBadRequest)
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 10
	}

	history, err := h.clientService.GetAttendanceHistory(r.Context(), clientID, limit)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if history == nil {
		history = []model.AttendanceWithDetails{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

// getStaffIDFromContext retrieves the current staff member's ID from the auth context.
// If the staff member doesn't exist, it creates them automatically.
func (h *ClientHandler) getStaffIDFromContext(r *http.Request) (uuid.UUID, error) {
	auth0ID := middleware.GetAuth0ID(r.Context())
	if auth0ID == "" {
		return uuid.Nil, errors.New("no auth0_id in context")
	}

	email := middleware.GetAuth0Email(r.Context())
	name := middleware.GetAuth0Name(r.Context())
	if name == "" {
		name = email
	}

	// FindOrCreate will return existing staff or create new one
	staff, _, err := h.staffService.FindOrCreate(r.Context(), auth0ID, name, email)
	if err != nil {
		return uuid.Nil, err
	}
	return staff.ID, nil
}
