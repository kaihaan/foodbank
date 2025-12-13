package middleware

import (
	"context"
	"log"
	"net/http"
	"net/url"
	"time"

	jwtmiddleware "github.com/auth0/go-jwt-middleware/v2"
	"github.com/auth0/go-jwt-middleware/v2/jwks"
	"github.com/auth0/go-jwt-middleware/v2/validator"
)

type contextKey string

const (
	Auth0IDKey    contextKey = "auth0_id"
	Auth0EmailKey contextKey = "auth0_email"
	Auth0NameKey  contextKey = "auth0_name"
)

type CustomClaims struct {
	Email          string `json:"email"`
	Name           string `json:"name"`
	NamespacedEmail string `json:"https://foodbank.app/email"`
	NamespacedName  string `json:"https://foodbank.app/name"`
}

func (c CustomClaims) Validate(ctx context.Context) error {
	return nil
}

func NewAuthMiddleware(domain, audience string) (func(http.Handler) http.Handler, error) {
	issuerURL, err := url.Parse("https://" + domain + "/")
	if err != nil {
		return nil, err
	}

	log.Printf("Auth middleware: issuer=%s audience=%s", issuerURL.String(), audience)

	provider := jwks.NewCachingProvider(issuerURL, 5*time.Minute)

	jwtValidator, err := validator.New(
		provider.KeyFunc,
		validator.RS256,
		issuerURL.String(),
		[]string{audience},
		validator.WithCustomClaims(func() validator.CustomClaims {
			return &CustomClaims{}
		}),
	)
	if err != nil {
		return nil, err
	}

	errorHandler := func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("JWT validation error: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"message":"JWT is invalid."}`))
	}

	middleware := jwtmiddleware.New(jwtValidator.ValidateToken, jwtmiddleware.WithErrorHandler(errorHandler))

	return func(next http.Handler) http.Handler {
		return middleware.CheckJWT(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Debug: check what's in context
			rawClaims := r.Context().Value(jwtmiddleware.ContextKey{})
			log.Printf("Context claims type: %T, value: %v", rawClaims, rawClaims)

			claims, ok := rawClaims.(*validator.ValidatedClaims)
			if !ok {
				log.Printf("Failed to cast claims, got type: %T", rawClaims)
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), Auth0IDKey, claims.RegisteredClaims.Subject)

			if customClaims, ok := claims.CustomClaims.(*CustomClaims); ok {
				// Prefer namespaced claims (from Auth0 Action), fall back to standard claims
				email := customClaims.NamespacedEmail
				if email == "" {
					email = customClaims.Email
				}
				name := customClaims.NamespacedName
				if name == "" {
					name = customClaims.Name
				}
				ctx = context.WithValue(ctx, Auth0EmailKey, email)
				ctx = context.WithValue(ctx, Auth0NameKey, name)
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		}))
	}, nil
}

func GetAuth0ID(ctx context.Context) string {
	if id, ok := ctx.Value(Auth0IDKey).(string); ok {
		return id
	}
	return ""
}

func GetAuth0Email(ctx context.Context) string {
	if email, ok := ctx.Value(Auth0EmailKey).(string); ok {
		return email
	}
	return ""
}

func GetAuth0Name(ctx context.Context) string {
	if name, ok := ctx.Value(Auth0NameKey).(string); ok {
		return name
	}
	return ""
}
