-- Add email verification fields to staff table
ALTER TABLE staff ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE staff ADD COLUMN email_verified_at TIMESTAMPTZ;

-- Create verification codes table
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
CREATE INDEX idx_verification_codes_lookup ON verification_codes(staff_id, code) WHERE verified_at IS NULL;
