package middleware

import (
	"context"
	"crypto/subtle"
	"net/http"

	"github.com/finchley-foodbank/foodbank/internal/model"
	"github.com/finchley-foodbank/foodbank/internal/service"
)

// RecoveryContextKey is the context key for recovery mode
type recoveryContextKey struct{}

// RecoveryContextKey is exported for use in handlers
var RecoveryContextKey = recoveryContextKey{}

// IsRecoveryMode checks if the request is authenticated via recovery token
func IsRecoveryMode(ctx context.Context) bool {
	if isRecovery, ok := ctx.Value(RecoveryContextKey).(bool); ok {
		return isRecovery
	}
	return false
}

// RecoveryAuth middleware allows access via recovery token OR normal admin auth
// This enables database restore operations even when the database is unavailable
func RecoveryAuth(recoveryToken string, staffService *service.StaffService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check for recovery token header
			token := r.Header.Get("X-Recovery-Token")
			if token != "" && recoveryToken != "" {
				// Use constant-time comparison to prevent timing attacks
				if subtle.ConstantTimeCompare([]byte(token), []byte(recoveryToken)) == 1 {
					// Recovery token valid - mark as recovery mode and proceed
					ctx := context.WithValue(r.Context(), RecoveryContextKey, true)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
				// Invalid recovery token - don't fall through, reject
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"error":"invalid recovery token"}`))
				return
			}

			// No recovery token - require normal admin auth
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

// RecoveryTokenOnly middleware ONLY allows access via recovery token
// Use this for operations that should never be available through normal admin login
func RecoveryTokenOnly(recoveryToken string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if recoveryToken == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusServiceUnavailable)
				w.Write([]byte(`{"error":"recovery not configured"}`))
				return
			}

			token := r.Header.Get("X-Recovery-Token")
			if token == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"error":"recovery token required"}`))
				return
			}

			// Use constant-time comparison to prevent timing attacks
			if subtle.ConstantTimeCompare([]byte(token), []byte(recoveryToken)) != 1 {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"error":"invalid recovery token"}`))
				return
			}

			// Recovery token valid - mark as recovery mode and proceed
			ctx := context.WithValue(r.Context(), RecoveryContextKey, true)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
