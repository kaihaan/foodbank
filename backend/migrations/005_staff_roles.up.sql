-- Add role column with default 'staff'
ALTER TABLE staff ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'staff';

-- Add is_active column with default true
ALTER TABLE staff ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Add deactivated_at timestamp for audit
ALTER TABLE staff ADD COLUMN deactivated_at TIMESTAMPTZ;

-- Add deactivated_by for audit trail
ALTER TABLE staff ADD COLUMN deactivated_by UUID REFERENCES staff(id);

-- Add index for role-based queries
CREATE INDEX idx_staff_role ON staff(role);

-- Add index for active status filtering
CREATE INDEX idx_staff_is_active ON staff(is_active);

-- Add constraint for valid roles
ALTER TABLE staff ADD CONSTRAINT chk_staff_role CHECK (role IN ('admin', 'staff'));
