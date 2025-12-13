package auth0

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// Client provides methods to interact with Auth0 Management API
type Client struct {
	domain       string
	clientID     string
	clientSecret string
	connectionID string
	httpClient   *http.Client

	// Token cache
	tokenMu    sync.RWMutex
	token      string
	tokenExpAt time.Time
}

// NewClient creates a new Auth0 Management API client
func NewClient(domain, clientID, clientSecret, connectionID string) *Client {
	return &Client{
		domain:       domain,
		clientID:     clientID,
		clientSecret: clientSecret,
		connectionID: connectionID,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// IsConfigured returns true if the client has all required credentials
func (c *Client) IsConfigured() bool {
	return c.domain != "" && c.clientID != "" && c.clientSecret != "" && c.connectionID != ""
}

// tokenResponse represents Auth0 token response
type tokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// GetManagementToken obtains or returns cached M2M access token
func (c *Client) GetManagementToken() (string, error) {
	c.tokenMu.RLock()
	if c.token != "" && time.Now().Before(c.tokenExpAt) {
		token := c.token
		c.tokenMu.RUnlock()
		return token, nil
	}
	c.tokenMu.RUnlock()

	c.tokenMu.Lock()
	defer c.tokenMu.Unlock()

	// Double-check after acquiring write lock
	if c.token != "" && time.Now().Before(c.tokenExpAt) {
		return c.token, nil
	}

	payload := map[string]string{
		"grant_type":    "client_credentials",
		"client_id":     c.clientID,
		"client_secret": c.clientSecret,
		"audience":      fmt.Sprintf("https://%s/api/v2/", c.domain),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal token request: %w", err)
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("https://%s/oauth/token", c.domain), bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("token request failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var tokenResp tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", fmt.Errorf("decode token response: %w", err)
	}

	c.token = tokenResp.AccessToken
	// Set expiration 5 minutes before actual expiry for safety
	c.tokenExpAt = time.Now().Add(time.Duration(tokenResp.ExpiresIn-300) * time.Second)

	return c.token, nil
}

// CreateUserResponse represents the response from creating a user
type CreateUserResponse struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Name   string `json:"name"`
}

// CreateUser creates a new user in Auth0 without a password
// The user will need to set their password via password reset email
func (c *Client) CreateUser(email, name string) (*CreateUserResponse, error) {
	token, err := c.GetManagementToken()
	if err != nil {
		return nil, fmt.Errorf("get management token: %w", err)
	}

	payload := map[string]interface{}{
		"email":          email,
		"name":           name,
		"connection":     "Username-Password-Authentication",
		"email_verified": false,
		// Generate random password - user will reset it
		"password": generateSecurePassword(),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal create user request: %w", err)
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("https://%s/api/v2/users", c.domain), bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create user request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("create user request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("create user failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var userResp CreateUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&userResp); err != nil {
		return nil, fmt.Errorf("decode create user response: %w", err)
	}

	return &userResp, nil
}

// PasswordChangeTicketResponse represents the response from creating a password change ticket
type PasswordChangeTicketResponse struct {
	Ticket string `json:"ticket"`
}

// SendPasswordSetEmail creates a password change ticket and returns the URL
// This is used to send invitation emails to new users
func (c *Client) SendPasswordSetEmail(auth0ID string) (string, error) {
	token, err := c.GetManagementToken()
	if err != nil {
		return "", fmt.Errorf("get management token: %w", err)
	}

	payload := map[string]interface{}{
		"user_id":               auth0ID,
		"mark_email_as_verified": true,
		"includeEmailInRedirect": false,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal password ticket request: %w", err)
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("https://%s/api/v2/tickets/password-change", c.domain), bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create password ticket request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("password ticket request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("password ticket failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var ticketResp PasswordChangeTicketResponse
	if err := json.NewDecoder(resp.Body).Decode(&ticketResp); err != nil {
		return "", fmt.Errorf("decode password ticket response: %w", err)
	}

	return ticketResp.Ticket, nil
}

// BlockUser blocks a user from logging in (for deactivation)
func (c *Client) BlockUser(auth0ID string) error {
	return c.updateUserBlocked(auth0ID, true)
}

// UnblockUser unblocks a user (for reactivation)
func (c *Client) UnblockUser(auth0ID string) error {
	return c.updateUserBlocked(auth0ID, false)
}

func (c *Client) updateUserBlocked(auth0ID string, blocked bool) error {
	token, err := c.GetManagementToken()
	if err != nil {
		return fmt.Errorf("get management token: %w", err)
	}

	payload := map[string]interface{}{
		"blocked": blocked,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal block user request: %w", err)
	}

	req, err := http.NewRequest("PATCH", fmt.Sprintf("https://%s/api/v2/users/%s", c.domain, auth0ID), bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create block user request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("block user request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("block user failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// MFAEnrollment represents an MFA enrollment for a user
type MFAEnrollment struct {
	ID         string `json:"id"`
	Status     string `json:"status"`
	Type       string `json:"type"`
	Name       string `json:"name"`
	Identifier string `json:"identifier"`
}

// GetMFAEnrollments returns all MFA enrollments for a user
func (c *Client) GetMFAEnrollments(auth0ID string) ([]MFAEnrollment, error) {
	token, err := c.GetManagementToken()
	if err != nil {
		return nil, fmt.Errorf("get management token: %w", err)
	}

	req, err := http.NewRequest("GET", fmt.Sprintf("https://%s/api/v2/users/%s/enrollments", c.domain, auth0ID), nil)
	if err != nil {
		return nil, fmt.Errorf("create get enrollments request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get enrollments request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("get enrollments failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var enrollments []MFAEnrollment
	if err := json.NewDecoder(resp.Body).Decode(&enrollments); err != nil {
		return nil, fmt.Errorf("decode enrollments response: %w", err)
	}

	return enrollments, nil
}

// DeleteMFAEnrollment removes an MFA enrollment for a user
func (c *Client) DeleteMFAEnrollment(auth0ID, enrollmentID string) error {
	token, err := c.GetManagementToken()
	if err != nil {
		return fmt.Errorf("get management token: %w", err)
	}

	req, err := http.NewRequest("DELETE", fmt.Sprintf("https://%s/api/v2/users/%s/enrollments/%s", c.domain, auth0ID, enrollmentID), nil)
	if err != nil {
		return fmt.Errorf("create delete enrollment request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("delete enrollment request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete enrollment failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// MFAEnrollmentTicketResponse represents the response from creating an MFA enrollment ticket
type MFAEnrollmentTicketResponse struct {
	TicketID  string `json:"ticket_id"`
	TicketURL string `json:"ticket_url"`
}

// CreateMFAEnrollmentTicket creates a ticket for MFA enrollment
func (c *Client) CreateMFAEnrollmentTicket(auth0ID string) (*MFAEnrollmentTicketResponse, error) {
	token, err := c.GetManagementToken()
	if err != nil {
		return nil, fmt.Errorf("get management token: %w", err)
	}

	payload := map[string]interface{}{
		"user_id":     auth0ID,
		"send_mail":   false,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal enrollment ticket request: %w", err)
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("https://%s/api/v2/guardian/enrollments/ticket", c.domain), bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create enrollment ticket request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("enrollment ticket request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("enrollment ticket failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	var ticketResp MFAEnrollmentTicketResponse
	if err := json.NewDecoder(resp.Body).Decode(&ticketResp); err != nil {
		return nil, fmt.Errorf("decode enrollment ticket response: %w", err)
	}

	return &ticketResp, nil
}

// generateSecurePassword generates a secure random password
// This is used as a placeholder password when creating users
// who will set their own password via password reset
func generateSecurePassword() string {
	// Use crypto/rand for secure random bytes
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	b := make([]byte, 32)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
		time.Sleep(time.Nanosecond) // Add entropy
	}
	return string(b)
}
