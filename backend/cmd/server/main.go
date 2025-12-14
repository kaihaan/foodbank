package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/finchley-foodbank/foodbank/internal/auth0"
	"github.com/finchley-foodbank/foodbank/internal/config"
	"github.com/finchley-foodbank/foodbank/internal/database"
	"github.com/finchley-foodbank/foodbank/internal/email"
	"github.com/finchley-foodbank/foodbank/internal/handler"
	"github.com/finchley-foodbank/foodbank/internal/handler/middleware"
	"github.com/finchley-foodbank/foodbank/internal/repository"
	"github.com/finchley-foodbank/foodbank/internal/service"
)

func main() {
	ctx := context.Background()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	db, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("Connected to database")
	log.Printf("Auth0 Domain: %s", cfg.Auth0Domain)
	log.Printf("Auth0 Audience: %s", cfg.Auth0Audience)

	// Create Auth0 Management API client
	var auth0Client *auth0.Client
	if cfg.Auth0M2MClientID != "" && cfg.Auth0M2MClientSecret != "" {
		auth0Client = auth0.NewClient(
			cfg.Auth0Domain,
			cfg.Auth0M2MClientID,
			cfg.Auth0M2MClientSecret,
			cfg.Auth0ConnectionID,
		)
		log.Println("Auth0 Management API client configured")
	} else {
		log.Println("Warning: Auth0 Management API not configured (staff invitation disabled)")
	}

	// Create email service (Resend)
	emailService := email.NewService(cfg.ResendAPIKey, cfg.FromEmail, cfg.FromName, cfg.AppBaseURL)
	if emailService.IsConfigured() {
		log.Println("Email service configured")
	} else {
		log.Println("Warning: Email service not configured (admin notifications disabled)")
	}

	// Create router
	r := chi.NewRouter()

	// Middleware
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000", "https://foodbank-web.fly.dev"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Repositories
	staffRepo := repository.NewStaffRepository(db)
	clientRepo := repository.NewClientRepository(db)
	auditRepo := repository.NewAuditRepository(db)
	registrationRequestRepo := repository.NewRegistrationRequestRepository(db)
	verificationRepo := repository.NewVerificationRepository(db)

	// Services
	staffService := service.NewStaffService(staffRepo, auth0Client)
	clientService := service.NewClientService(clientRepo, auditRepo)
	registrationRequestService := service.NewRegistrationRequestService(registrationRequestRepo, staffRepo, auth0Client, emailService)
	verificationService := service.NewVerificationService(verificationRepo, staffRepo, emailService)
	backupService := service.NewBackupService(db)
	importService := service.NewImportService(db, clientRepo, auditRepo)

	// Handlers
	healthHandler := handler.NewHealthHandler()
	staffHandler := handler.NewStaffHandler(staffService)
	clientHandler := handler.NewClientHandler(clientService, staffService)
	auditHandler := handler.NewAuditHandler(auditRepo)
	registrationRequestHandler := handler.NewRegistrationRequestHandler(registrationRequestService)
	verificationHandler := handler.NewVerificationHandler(verificationService)
	recoveryHandler := handler.NewRecoveryHandler(backupService)
	importHandler := handler.NewImportHandler(importService)

	// Public routes
	r.Get("/api/health", healthHandler.Health)

	// Public registration request routes (no auth required)
	r.Post("/api/registration-requests", registrationRequestHandler.Submit)
	r.Get("/api/registration-requests/action/{token}", registrationRequestHandler.GetByToken)
	r.Post("/api/registration-requests/action/{token}/approve", registrationRequestHandler.ApproveByToken)
	r.Post("/api/registration-requests/action/{token}/reject", registrationRequestHandler.RejectByToken)

	// Protected routes (require Auth0 JWT)
	if cfg.Auth0Domain != "" && cfg.Auth0Audience != "" {
		authMiddleware, err := middleware.NewAuthMiddleware(cfg.Auth0Domain, cfg.Auth0Audience)
		if err != nil {
			log.Fatalf("Failed to create auth middleware: %v", err)
		}

		r.Group(func(r chi.Router) {
			r.Use(authMiddleware)
			r.Use(middleware.LoadStaff(staffService))
			r.Use(middleware.RequireActive(staffService))

			// Staff routes - all authenticated users
			r.Get("/api/me", staffHandler.Me)
			r.Get("/api/me/mfa", staffHandler.GetMFAStatus)
			r.Post("/api/me/mfa/enroll", staffHandler.EnrollMFA)
			r.Delete("/api/me/mfa", staffHandler.DisableMFA)

			// Email verification routes
			r.Get("/api/verification/status", verificationHandler.GetStatus)
			r.Post("/api/verification/send", verificationHandler.SendCode)
			r.Post("/api/verification/verify", verificationHandler.VerifyCode)

			r.Get("/api/staff", staffHandler.List)
			r.Get("/api/staff/{id}", staffHandler.Get)
			r.Put("/api/staff/{id}", staffHandler.Update)

			// Staff routes - admin only
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireAdmin(staffService))
				r.Post("/api/staff", staffHandler.Create)
				r.Delete("/api/staff/{id}", staffHandler.Deactivate)
				r.Post("/api/staff/{id}/reactivate", staffHandler.Reactivate)
				r.Put("/api/staff/{id}/role", staffHandler.UpdateRole)

				// Registration request management
				r.Get("/api/registration-requests", registrationRequestHandler.List)
				r.Get("/api/registration-requests/count", registrationRequestHandler.CountPending)
				r.Post("/api/registration-requests/{id}/approve", registrationRequestHandler.ApproveByID)
				r.Post("/api/registration-requests/{id}/reject", registrationRequestHandler.RejectByID)

				// Backup (admin only - normal auth)
				r.Get("/api/admin/backup", recoveryHandler.Backup)

				// Import (admin only)
				r.Get("/api/admin/import/template", importHandler.Template)
				r.Post("/api/admin/import/validate", importHandler.Validate)
				r.Post("/api/admin/import/clients", importHandler.Import)
			})

			// Recovery routes (recovery token OR admin)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RecoveryAuth(cfg.RecoveryToken, staffService))
				r.Post("/api/admin/restore", recoveryHandler.Restore)
				r.Get("/api/admin/recovery/status", recoveryHandler.Status)
			})

			// Client routes
			r.Get("/api/clients", clientHandler.List)
			r.Post("/api/clients", clientHandler.Create)
			r.Get("/api/clients/{id}", clientHandler.Get)
			r.Put("/api/clients/{id}", clientHandler.Update)
			r.Post("/api/clients/{id}/attendance", clientHandler.RecordAttendance)
			r.Get("/api/clients/{id}/attendance", clientHandler.GetAttendanceHistory)
			r.Get("/api/clients/barcode/{code}", clientHandler.GetByBarcode)

			// Audit log routes
			r.Get("/api/audit", auditHandler.List)
			r.Get("/api/audit/{table}/{id}", auditHandler.GetByRecord)
		})
	} else {
		log.Println("Warning: Auth0 not configured, protected routes disabled")
	}

	// Start server
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("Shutting down server...")
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			log.Fatalf("Server shutdown failed: %v", err)
		}
	}()

	log.Printf("Server starting on port %s", cfg.Port)
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("Server failed: %v", err)
	}
	log.Println("Server stopped")
}
