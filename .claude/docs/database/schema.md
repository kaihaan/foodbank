# Database Schema

**Database**: PostgreSQL 16
**Created**: 2025-12-07

---

## Tables

### staff
Stores foodbank staff member accounts linked to Auth0.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| auth0_id | VARCHAR(255) | UNIQUE, NOT NULL | Auth0 subject ID |
| name | VARCHAR(255) | NOT NULL | Staff member name |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email address |
| mobile | VARCHAR(50) | | Phone number |
| address | TEXT | | Home address |
| theme | VARCHAR(50) | DEFAULT 'light' | UI theme preference |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation time |
| created_by | UUID | FK -> staff(id) | Who created this account |

**Indexes**: `auth0_id`, `email`

---

### clients
Stores foodbank client registration records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| barcode_id | VARCHAR(50) | UNIQUE, NOT NULL | Barcode for scanning |
| name | VARCHAR(255) | NOT NULL | Client name |
| address | TEXT | NOT NULL | Home address |
| family_size | INT | NOT NULL, DEFAULT 1 | Total people to feed |
| num_children | INT | DEFAULT 0 | Number of children |
| children_ages | TEXT | | Ages of children |
| reason | TEXT | | Reason for needing foodbank |
| photo_url | TEXT | | Client photo URL |
| appointment_day | VARCHAR(20) | | Regular appointment day |
| appointment_time | TIME | | Regular appointment time |
| pref_gluten_free | BOOLEAN | DEFAULT FALSE | Gluten-free preference |
| pref_halal | BOOLEAN | DEFAULT FALSE | Halal preference |
| pref_vegetarian | BOOLEAN | DEFAULT FALSE | Vegetarian preference |
| pref_no_cooking | BOOLEAN | DEFAULT FALSE | No cooking facilities |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Registration time |
| created_by | UUID | FK -> staff(id), NOT NULL | Staff who registered |

**Indexes**: `barcode_id`, `name`, `(appointment_day, appointment_time)`

---

### attendance
Tracks client visits to the foodbank.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| client_id | UUID | FK -> clients(id) ON DELETE CASCADE, NOT NULL | Client who attended |
| verified_by | UUID | FK -> staff(id), NOT NULL | Staff who verified |
| verified_at | TIMESTAMPTZ | DEFAULT NOW() | Time of attendance |

**Indexes**: `client_id`, `verified_at`

---

### audit_log
Tracks all changes to client records for compliance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| table_name | VARCHAR(50) | NOT NULL | Table that was modified |
| record_id | UUID | NOT NULL | ID of modified record |
| action | VARCHAR(20) | NOT NULL | INSERT, UPDATE, DELETE |
| old_values | JSONB | | Previous field values |
| new_values | JSONB | | New field values |
| changed_by | UUID | FK -> staff(id), NOT NULL | Staff who made change |
| changed_at | TIMESTAMPTZ | DEFAULT NOW() | Time of change |

**Indexes**: `(table_name, record_id)`, `changed_at`

---

## Relationships

```
staff (1) ----< (N) clients        [created_by]
staff (1) ----< (N) attendance     [verified_by]
staff (1) ----< (N) audit_log      [changed_by]
clients (1) --< (N) attendance     [client_id]
```

---

## Migration Files

| Order | File | Description |
|-------|------|-------------|
| 001 | create_staff | Staff accounts table |
| 002 | create_clients | Client registration table |
| 003 | create_attendance | Attendance tracking table |
| 004 | create_audit_log | Change audit table |
