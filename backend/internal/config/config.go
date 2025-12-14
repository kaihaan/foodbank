package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL          string
	Port                 string
	Auth0Domain          string
	Auth0Audience        string
	Auth0M2MClientID     string
	Auth0M2MClientSecret string
	Auth0ConnectionID    string
	// Resend configuration
	ResendAPIKey string
	FromEmail    string
	FromName     string
	AppBaseURL   string
	// Recovery configuration
	RecoveryToken string
}

func Load() (*Config, error) {
	// Load .env file from project root (one level up from backend)
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	cfg := &Config{
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://foodbank:foodbank@localhost:5432/foodbank?sslmode=disable"),
		Port:                 getEnv("PORT", "8080"),
		Auth0Domain:          getEnv("AUTH0_DOMAIN", ""),
		Auth0Audience:        getEnv("AUTH0_AUDIENCE", ""),
		Auth0M2MClientID:     getEnv("AUTH0_M2M_CLIENT_ID", ""),
		Auth0M2MClientSecret: getEnv("AUTH0_M2M_CLIENT_SECRET", ""),
		Auth0ConnectionID:    getEnv("AUTH0_CONNECTION_ID", ""),
		ResendAPIKey:  getEnv("RESEND_API_KEY", ""),
		FromEmail:     getEnv("FROM_EMAIL", "noreply@finchley-foodbank.org"),
		FromName:      getEnv("FROM_NAME", "Finchley Foodbank"),
		AppBaseURL:    getEnv("APP_BASE_URL", "http://localhost:5173"),
		RecoveryToken: getEnv("RECOVERY_TOKEN", ""),
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
