package model

import (
	"time"

	"github.com/google/uuid"
)

type Client struct {
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

type CreateClientRequest struct {
	Name            string  `json:"name"`
	Address         string  `json:"address"`
	FamilySize      int     `json:"family_size"`
	NumChildren     int     `json:"num_children"`
	ChildrenAges    *string `json:"children_ages,omitempty"`
	Reason          *string `json:"reason,omitempty"`
	PhotoURL        *string `json:"photo_url,omitempty"`
	AppointmentDay  *string `json:"appointment_day,omitempty"`
	AppointmentTime *string `json:"appointment_time,omitempty"`
	PrefGlutenFree  bool    `json:"pref_gluten_free"`
	PrefHalal       bool    `json:"pref_halal"`
	PrefVegetarian  bool    `json:"pref_vegetarian"`
	PrefNoCooking   bool    `json:"pref_no_cooking"`
}

type UpdateClientRequest struct {
	Name            *string `json:"name,omitempty"`
	Address         *string `json:"address,omitempty"`
	FamilySize      *int    `json:"family_size,omitempty"`
	NumChildren     *int    `json:"num_children,omitempty"`
	ChildrenAges    *string `json:"children_ages,omitempty"`
	Reason          *string `json:"reason,omitempty"`
	PhotoURL        *string `json:"photo_url,omitempty"`
	AppointmentDay  *string `json:"appointment_day,omitempty"`
	AppointmentTime *string `json:"appointment_time,omitempty"`
	PrefGlutenFree  *bool   `json:"pref_gluten_free,omitempty"`
	PrefHalal       *bool   `json:"pref_halal,omitempty"`
	PrefVegetarian  *bool   `json:"pref_vegetarian,omitempty"`
	PrefNoCooking   *bool   `json:"pref_no_cooking,omitempty"`
}

type ClientSearchParams struct {
	Query  string `json:"query"`
	Limit  int    `json:"limit"`
	Offset int    `json:"offset"`
}
