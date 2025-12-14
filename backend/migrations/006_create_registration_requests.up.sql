CREATE TABLE IF NOT EXISTS registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(50),
    address TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approval_token VARCHAR(64) UNIQUE NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES staff(id)
);

CREATE INDEX idx_registration_requests_status ON registration_requests(status);
CREATE INDEX idx_registration_requests_email ON registration_requests(email);
CREATE INDEX idx_registration_requests_token ON registration_requests(approval_token);

ALTER TABLE registration_requests
    ADD CONSTRAINT chk_registration_status CHECK (status IN ('pending', 'approved', 'rejected'));
