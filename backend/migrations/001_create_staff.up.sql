CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth0_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(50),
    address TEXT,
    theme VARCHAR(50) DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id)
);

CREATE INDEX idx_staff_auth0_id ON staff(auth0_id);
CREATE INDEX idx_staff_email ON staff(email);
