CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    family_size INT NOT NULL DEFAULT 1,
    num_children INT DEFAULT 0,
    children_ages TEXT,
    reason TEXT,
    photo_url TEXT,
    appointment_day VARCHAR(20),
    appointment_time TIME,
    pref_gluten_free BOOLEAN DEFAULT FALSE,
    pref_halal BOOLEAN DEFAULT FALSE,
    pref_vegetarian BOOLEAN DEFAULT FALSE,
    pref_no_cooking BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES staff(id) NOT NULL
);

CREATE INDEX idx_clients_barcode_id ON clients(barcode_id);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_appointment ON clients(appointment_day, appointment_time);
