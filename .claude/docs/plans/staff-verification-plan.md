# Staff Email Verification Plan

## Overview

Add optional email verification for staff members after approval. Verification confirms the email address is correct - it does **not** block system access.

**Note**: Phone verification excluded to avoid SMS costs (charity consideration).

---

## Design Principles

- **Non-blocking**: Staff have full system access regardless of verification status
- **Visual indicators**: Unverified email shows badge prompting verification
- **Self-service**: Staff verify when convenient
- **Zero cost**: Uses existing Resend email service

---

## Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Staff logs in → Full access granted immediately                          │
│                                                                          │
│ Settings panel shows:                                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Email: john@example.com  [✓ Verified] or [Verify →]                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│ Click "Verify" → Code sent → Enter 6 digits → ✓ Verified                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Database Schema

**Migration 008: Staff email verification**

```sql
-- Up
ALTER TABLE staff ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE staff ADD COLUMN email_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_codes_staff ON verification_codes(staff_id);
```

```sql
-- Down
DROP TABLE IF EXISTS verification_codes;
ALTER TABLE staff DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE staff DROP COLUMN IF EXISTS email_verified;
```

---

### Phase 2: Backend - Model

**New file: `backend/internal/model/verification.go`**

```go
type VerificationCode struct {
    ID         uuid.UUID
    StaffID    uuid.UUID
    Code       string
    ExpiresAt  time.Time
    Attempts   int
    VerifiedAt *time.Time
    CreatedAt  time.Time
}

type VerifyCodeRequest struct {
    Code string `json:"code"`
}

type VerificationStatus struct {
    EmailVerified   bool       `json:"email_verified"`
    EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
}
```

---

### Phase 3: Backend - Repository

**New file: `backend/internal/repository/verification.go`**

```go
func (r *VerificationRepository) Create(ctx, staffID uuid.UUID, code string, expiresAt time.Time) error
func (r *VerificationRepository) GetLatestActive(ctx, staffID uuid.UUID) (*model.VerificationCode, error)
func (r *VerificationRepository) IncrementAttempts(ctx, id uuid.UUID) error
func (r *VerificationRepository) MarkVerified(ctx, id uuid.UUID) error
func (r *VerificationRepository) InvalidatePrevious(ctx, staffID uuid.UUID) error
```

**Update `backend/internal/repository/staff.go`:**

```go
func (r *StaffRepository) SetEmailVerified(ctx, id uuid.UUID) error
func (r *StaffRepository) ClearEmailVerified(ctx, id uuid.UUID) error
```

---

### Phase 4: Backend - Verification Service

**New file: `backend/internal/service/verification.go`**

```go
type VerificationService struct {
    repo         *repository.VerificationRepository
    staffRepo    *repository.StaffRepository
    emailService *email.Service
}

func (s *VerificationService) SendCode(ctx, staffID uuid.UUID) error
func (s *VerificationService) VerifyCode(ctx, staffID uuid.UUID, code string) error
func (s *VerificationService) GetStatus(ctx, staffID uuid.UUID) (*model.VerificationStatus, error)
```

**Logic:**
- Generate random 6-digit code
- Invalidate previous active codes
- Store with 15-minute expiry
- Send via Resend email
- Verify: check match, expiry, attempts < 5
- Success: mark `email_verified = true`

---

### Phase 5: Backend - Handler

**New file: `backend/internal/handler/verification.go`**

```
POST /api/verification/send    - Send verification code to current user's email
POST /api/verification/verify  - Verify code {"code": "123456"}
GET  /api/verification/status  - Get verification status
```

---

### Phase 6: Backend - Email Template

**Update `backend/internal/email/resend.go`:**

```go
func (s *Service) SendVerificationCode(toEmail, staffName, code string) error
```

Simple email:
```
Subject: Verify your email - Finchley Foodbank

Hi {name},

Your verification code is: {code}

This code expires in 15 minutes.

Finchley Foodbank Staff System
```

---

### Phase 7: Backend - Clear Verification on Email Change

**Update `backend/internal/service/staff.go` → `Update()`:**

If email changes, call `staffRepo.ClearEmailVerified()`

---

### Phase 8: Backend - Wiring

**Update `backend/cmd/server/main.go`:**

- Initialize VerificationRepository
- Initialize VerificationService
- Initialize VerificationHandler
- Register routes

---

### Phase 9: Frontend - Types

**Update `frontend/src/features/staff/types.ts`:**

```typescript
interface Staff {
  // ... existing
  email_verified: boolean
  email_verified_at?: string
}
```

---

### Phase 10: Frontend - Verification Components

**New file: `frontend/src/features/verification/VerificationBadge.tsx`**

Inline badge:
- Verified: green checkmark
- Unverified: "Verify" link/button

**New file: `frontend/src/features/verification/VerifyEmailPanel.tsx`**

Expandable panel (not modal):
- "Code sent to {email}"
- 6-digit input
- Submit / Resend buttons
- Success animation

---

### Phase 11: Frontend - Integration

**Update `frontend/src/components/SettingsPanel.tsx`:**

Add verification badge next to email display with inline verification flow.

---

## File Summary

### New Files (8)
| File | Purpose |
|------|---------|
| `backend/migrations/008_staff_verification.up.sql` | Schema |
| `backend/migrations/008_staff_verification.down.sql` | Rollback |
| `backend/internal/model/verification.go` | Types |
| `backend/internal/repository/verification.go` | DB queries |
| `backend/internal/service/verification.go` | Business logic |
| `backend/internal/handler/verification.go` | API endpoints |
| `frontend/src/features/verification/VerificationBadge.tsx` | Status indicator |
| `frontend/src/features/verification/VerifyEmailPanel.tsx` | Code entry UI |

### Modified Files (7)
| File | Changes |
|------|---------|
| `backend/internal/model/staff.go` | Add verification fields |
| `backend/internal/repository/staff.go` | Set/clear verified |
| `backend/internal/service/staff.go` | Clear on email change |
| `backend/internal/email/resend.go` | Verification email template |
| `backend/cmd/server/main.go` | Wire services |
| `frontend/src/features/staff/types.ts` | Add fields |
| `frontend/src/components/SettingsPanel.tsx` | Show verification UI |

---

## Questions

1. **Auto-send on approval**: Send verification code automatically when approved, or only when staff clicks "Verify"?
2. **Admin visibility**: Should admins see which staff have verified their email in the staff list?
