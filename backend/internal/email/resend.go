package email

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/resend/resend-go/v2"

	"github.com/finchley-foodbank/foodbank/internal/model"
)

// Service handles email sending via Resend
type Service struct {
	apiKey     string
	fromEmail  string
	fromName   string
	appBaseURL string
}

// NewService creates a new email service
func NewService(apiKey, fromEmail, fromName, appBaseURL string) *Service {
	return &Service{
		apiKey:     apiKey,
		fromEmail:  fromEmail,
		fromName:   fromName,
		appBaseURL: appBaseURL,
	}
}

// IsConfigured returns true if the email service has required configuration
func (s *Service) IsConfigured() bool {
	return s.apiKey != "" && s.fromEmail != ""
}

// SendAdminNotification sends a notification to all admins about a new registration request
// Returns the number of emails that failed to send
func (s *Service) SendAdminNotification(adminEmails []string, request *model.RegistrationRequest) int {
	if !s.IsConfigured() {
		log.Println("Email service not configured, skipping admin notification")
		return len(adminEmails)
	}

	failures := 0
	for _, adminEmail := range adminEmails {
		if err := s.sendAdminEmail(adminEmail, request); err != nil {
			log.Printf("Failed to send admin notification to %s: %v", adminEmail, err)
			failures++
			// Continue sending to other admins even if one fails
		}
	}
	return failures
}

func (s *Service) sendAdminEmail(adminEmail string, request *model.RegistrationRequest) error {
	client := resend.NewClient(s.apiKey)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	approveURL := fmt.Sprintf("%s/registration/action/%s?action=approve", s.appBaseURL, request.ApprovalToken)
	rejectURL := fmt.Sprintf("%s/registration/action/%s?action=reject", s.appBaseURL, request.ApprovalToken)

	htmlContent := s.buildAdminEmailHTML(request, approveURL, rejectURL)
	plainContent := s.buildAdminEmailPlain(request, approveURL, rejectURL)

	from := fmt.Sprintf("%s <%s>", s.fromName, s.fromEmail)

	params := &resend.SendEmailRequest{
		From:    from,
		To:      []string{adminEmail},
		Subject: fmt.Sprintf("New Staff Registration Request: %s", request.Name),
		Html:    htmlContent,
		Text:    plainContent,
	}

	sent, err := client.Emails.SendWithContext(ctx, params)
	if err != nil {
		return fmt.Errorf("resend error: %w", err)
	}

	if os.Getenv("DEBUG") != "" {
		log.Printf("Email sent to %s: %s", adminEmail, sent.Id)
	}

	return nil
}

func (s *Service) buildAdminEmailHTML(request *model.RegistrationRequest, approveURL, rejectURL string) string {
	mobile := ""
	if request.Mobile != nil {
		mobile = *request.Mobile
	}
	address := ""
	if request.Address != nil {
		address = *request.Address
	}

	mobileRow := ""
	if mobile != "" {
		mobileRow = fmt.Sprintf(`
            <div style="margin: 8px 0;">
                <div style="font-size: 12px; color: #666; text-transform: uppercase;">Mobile</div>
                <div style="font-size: 16px; color: #1a1a1a;">%s</div>
            </div>`, mobile)
	}

	addressRow := ""
	if address != "" {
		addressRow = fmt.Sprintf(`
            <div style="margin: 8px 0;">
                <div style="font-size: 12px; color: #666; text-transform: uppercase;">Address</div>
                <div style="font-size: 16px; color: #1a1a1a;">%s</div>
            </div>`, address)
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5;">
    <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px;">
        <h1 style="font-size: 20px; color: #1a1a1a; margin: 0 0 16px 0;">New Staff Registration Request</h1>
        <p style="color: #444; margin: 0 0 16px 0;">A new staff member has requested access to the Finchley Foodbank system.</p>

        <div style="background: #f9f9f9; border-radius: 6px; padding: 16px; margin: 16px 0;">
            <div style="margin: 8px 0;">
                <div style="font-size: 12px; color: #666; text-transform: uppercase;">Name</div>
                <div style="font-size: 16px; color: #1a1a1a;">%s</div>
            </div>
            <div style="margin: 8px 0;">
                <div style="font-size: 12px; color: #666; text-transform: uppercase;">Email</div>
                <div style="font-size: 16px; color: #1a1a1a;">%s</div>
            </div>
            %s
            %s
            <div style="margin: 8px 0;">
                <div style="font-size: 12px; color: #666; text-transform: uppercase;">Submitted</div>
                <div style="font-size: 16px; color: #1a1a1a;">%s</div>
            </div>
        </div>

        <div style="margin-top: 24px;">
            <a href="%s" style="display: block; width: 100%%; padding: 16px; text-align: center; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600; margin: 8px 0; box-sizing: border-box; background: #22c55e; color: white;">Approve Request</a>
            <a href="%s" style="display: block; width: 100%%; padding: 16px; text-align: center; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600; margin: 8px 0; box-sizing: border-box; background: #ef4444; color: white;">Reject Request</a>
        </div>

        <div style="margin-top: 24px; font-size: 12px; color: #666; text-align: center;">
            <p>This link expires in 7 days.</p>
            <p>Finchley Foodbank Staff System</p>
        </div>
    </div>
</body>
</html>`,
		request.Name,
		request.Email,
		mobileRow,
		addressRow,
		request.CreatedAt.Format("2 Jan 2006 at 3:04 PM"),
		approveURL,
		rejectURL,
	)
}

func (s *Service) buildAdminEmailPlain(request *model.RegistrationRequest, approveURL, rejectURL string) string {
	mobile := ""
	if request.Mobile != nil {
		mobile = fmt.Sprintf("\nMobile: %s", *request.Mobile)
	}
	address := ""
	if request.Address != nil {
		address = fmt.Sprintf("\nAddress: %s", *request.Address)
	}

	return fmt.Sprintf(`New Staff Registration Request

A new staff member has requested access to the Finchley Foodbank system.

Name: %s
Email: %s%s%s
Submitted: %s

To approve this request, visit:
%s

To reject this request, visit:
%s

This link expires in 7 days.

Finchley Foodbank Staff System`,
		request.Name,
		request.Email,
		mobile,
		address,
		request.CreatedAt.Format("2 Jan 2006 at 3:04 PM"),
		approveURL,
		rejectURL,
	)
}

// SendVerificationCode sends a verification code to a staff member's email
func (s *Service) SendVerificationCode(toEmail, staffName, code string) error {
	if !s.IsConfigured() {
		log.Println("Email service not configured, skipping verification code email")
		return fmt.Errorf("email service not configured")
	}

	client := resend.NewClient(s.apiKey)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	htmlContent := s.buildVerificationEmailHTML(staffName, code)
	plainContent := s.buildVerificationEmailPlain(staffName, code)

	from := fmt.Sprintf("%s <%s>", s.fromName, s.fromEmail)

	params := &resend.SendEmailRequest{
		From:    from,
		To:      []string{toEmail},
		Subject: "Verify your email - Finchley Foodbank",
		Html:    htmlContent,
		Text:    plainContent,
	}

	sent, err := client.Emails.SendWithContext(ctx, params)
	if err != nil {
		return fmt.Errorf("resend error: %w", err)
	}

	if os.Getenv("DEBUG") != "" {
		log.Printf("Verification email sent to %s: %s", toEmail, sent.Id)
	}

	return nil
}

func (s *Service) buildVerificationEmailHTML(staffName, code string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5;">
    <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px;">
        <h1 style="font-size: 20px; color: #1a1a1a; margin: 0 0 16px 0;">Verify your email</h1>
        <p style="color: #444; margin: 0 0 24px 0;">Hi %s, use this code to verify your email address:</p>

        <div style="background: #f9f9f9; border-radius: 6px; padding: 24px; text-align: center; margin: 16px 0;">
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; font-family: monospace;">%s</div>
        </div>

        <p style="color: #666; font-size: 14px; margin: 24px 0 0 0;">This code expires in 15 minutes.</p>

        <div style="margin-top: 24px; font-size: 12px; color: #666; text-align: center;">
            <p>Finchley Foodbank Staff System</p>
        </div>
    </div>
</body>
</html>`, staffName, code)
}

func (s *Service) buildVerificationEmailPlain(staffName, code string) string {
	return fmt.Sprintf(`Verify your email

Hi %s,

Use this code to verify your email address:

%s

This code expires in 15 minutes.

Finchley Foodbank Staff System`, staffName, code)
}
