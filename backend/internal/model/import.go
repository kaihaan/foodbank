package model

import "github.com/google/uuid"

// ImportClientRow represents a single row from the CSV import
type ImportClientRow struct {
	RowNumber       int     `json:"row_number"`
	Name            string  `json:"name"`
	Address         string  `json:"address"`
	FamilySize      int     `json:"family_size"`
	NumChildren     int     `json:"num_children"`
	ChildrenAges    *string `json:"children_ages,omitempty"`
	Reason          *string `json:"reason,omitempty"`
	AppointmentDay  *string `json:"appointment_day,omitempty"`
	AppointmentTime *string `json:"appointment_time,omitempty"`
	PrefGlutenFree  bool    `json:"pref_gluten_free"`
	PrefHalal       bool    `json:"pref_halal"`
	PrefVegetarian  bool    `json:"pref_vegetarian"`
	PrefNoCooking   bool    `json:"pref_no_cooking"`
}

// ValidationError represents an error in a specific row/field
type ValidationError struct {
	Row     int    `json:"row"`
	Field   string `json:"field"`
	Message string `json:"message"`
	Value   string `json:"value,omitempty"`
}

// ValidationWarning represents a warning (e.g., potential duplicate)
type ValidationWarning struct {
	Row        int       `json:"row"`
	Field      string    `json:"field"`
	Message    string    `json:"message"`
	ExistingID uuid.UUID `json:"existing_id,omitempty"`
}

// ValidationResult contains the results of validating import data
type ValidationResult struct {
	Valid     bool                `json:"valid"`
	TotalRows int                 `json:"total_rows"`
	ValidRows int                 `json:"valid_rows"`
	Errors    []ValidationError   `json:"errors"`
	Warnings  []ValidationWarning `json:"warnings"`
}

// ImportRequest is the request body for importing clients
type ImportRequest struct {
	Clients        []ImportClientRow `json:"clients"`
	SkipDuplicates bool              `json:"skip_duplicates"`
	BatchSize      int               `json:"batch_size"`
}

// ImportedClient represents a successfully imported client
type ImportedClient struct {
	Row       int       `json:"row"`
	ID        uuid.UUID `json:"id"`
	BarcodeID string    `json:"barcode_id"`
	Name      string    `json:"name"`
}

// BatchResult contains the result of importing a single batch
type BatchResult struct {
	Batch   int    `json:"batch"`
	Start   int    `json:"start"`
	End     int    `json:"end"`
	Success int    `json:"success"`
	Failed  int    `json:"failed"`
	Skipped int    `json:"skipped"`
	Error   string `json:"error,omitempty"`
}

// ImportResult contains the complete results of an import operation
type ImportResult struct {
	Success         bool             `json:"success"`
	Total           int              `json:"total"`
	Imported        int              `json:"imported"`
	Skipped         int              `json:"skipped"`
	Failed          int              `json:"failed"`
	Results         []BatchResult    `json:"results"`
	ImportedClients []ImportedClient `json:"imported_clients,omitempty"`
}

// ValidateRequest is the request body for validation
type ValidateRequest struct {
	Clients []ImportClientRow `json:"clients"`
}
