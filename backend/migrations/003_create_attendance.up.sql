CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    verified_by UUID REFERENCES staff(id) NOT NULL,
    verified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendance_client_id ON attendance(client_id);
CREATE INDEX idx_attendance_verified_at ON attendance(verified_at);
