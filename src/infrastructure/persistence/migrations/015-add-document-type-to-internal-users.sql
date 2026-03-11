-- Add documentType field to internal_users table
-- Fecha: 2026-02-23

ALTER TABLE internal_users
ADD COLUMN documentType VARCHAR(50) NULL;
