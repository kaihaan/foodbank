package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID          uuid.UUID       `json:"id"`
	TableName   string          `json:"table_name"`
	RecordID    uuid.UUID       `json:"record_id"`
	Action      string          `json:"action"`
	OldValues   json.RawMessage `json:"old_values,omitempty"`
	NewValues   json.RawMessage `json:"new_values,omitempty"`
	ChangedBy   uuid.UUID       `json:"changed_by"`
	ChangedAt   time.Time       `json:"changed_at"`
	// Joined fields
	ChangedByName string `json:"changed_by_name,omitempty"`
	RecordName    string `json:"record_name,omitempty"`
}

type AuditLogListResponse struct {
	Logs   []AuditLog `json:"logs"`
	Total  int        `json:"total"`
	Limit  int        `json:"limit"`
	Offset int        `json:"offset"`
}
