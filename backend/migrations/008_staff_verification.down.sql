-- Drop verification codes table
DROP TABLE IF EXISTS verification_codes;

-- Remove email verification fields from staff table
ALTER TABLE staff DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE staff DROP COLUMN IF EXISTS email_verified;
