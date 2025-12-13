package middleware

import (
	"context"
	"net/http"

	"github.com/finchley-foodbank/foodbank/internal/model"
	"github.com/finchley-foodbank/foodbank/internal/service"
)

// StaffContextKey is the context key for storing the current staff member
type staffContextKey struct{}

// StaffContextKey is exported for use in handlers
var StaffContextKey = staffContextKey{}

// GetStaffFromContext retrieves the current staff member from context
func GetStaffFromContext(ctx context.Context) *model.Staff {
	if staff, ok := ctx.Value(StaffContextKey).(*model.Staff); ok {
		return staff
	}
	return nil
}

// LoadStaff middleware loads the current user's staff record into context
// This should be used after the auth middleware
func LoadStaff(staffService *service.StaffService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth0ID := GetAuth0ID(r.Context())
			if auth0ID == "" {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			staff, err := staffService.GetByAuth0ID(r.Context(), auth0ID)
			if err != nil {
				// User not found in database - let them through for auto-registration via /api/me
				next.ServeHTTP(w, r)
				return
			}

			// Add staff to context
			ctx := context.WithValue(r.Context(), StaffContextKey, staff)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireActive middleware blocks deactivated users from accessing protected routes
func RequireActive(staffService *service.StaffService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			staff := GetStaffFromContext(r.Context())

			// If no staff in context, they might be a new user - let them through for auto-registration
			if staff == nil {
				next.ServeHTTP(w, r)
				return
			}

			// Block deactivated users
			if !staff.IsActive {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(`{"error":"account deactivated","message":"Your account has been deactivated. Please contact an administrator."}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireAdmin middleware ensures the user has admin role
func RequireAdmin(staffService *service.StaffService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			staff := GetStaffFromContext(r.Context())

			if staff == nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(`{"error":"forbidden","message":"Admin access required."}`))
				return
			}

			if staff.Role != model.RoleAdmin {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(`{"error":"forbidden","message":"Admin access required."}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireRole middleware ensures the user has one of the specified roles
func RequireRole(staffService *service.StaffService, roles ...string) func(http.Handler) http.Handler {
	roleSet := make(map[string]bool)
	for _, role := range roles {
		roleSet[role] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			staff := GetStaffFromContext(r.Context())

			if staff == nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(`{"error":"forbidden","message":"Access denied."}`))
				return
			}

			if !roleSet[staff.Role] {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(`{"error":"forbidden","message":"Access denied."}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
