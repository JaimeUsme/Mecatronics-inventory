-- Add Wispro session fields to internal_users table
-- These fields are managed by the WisproSessionRefreshWorker
-- and allow AI assistant tokens to read Wispro session from DB instead of JWT
-- Fecha: 2026-03-11

ALTER TABLE internal_users
ADD COLUMN wisproSessionCookie TEXT NULL,
ADD COLUMN wisproSessionExpires TIMESTAMP NULL,
ADD COLUMN wisproApiCsrfToken VARCHAR(512) NULL;
