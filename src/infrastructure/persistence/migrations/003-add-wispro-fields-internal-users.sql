-- ============================================
-- Migración MySQL: Campos Wispro en internal_users
-- ============================================

ALTER TABLE internal_users
  ADD COLUMN wisproEmail VARCHAR(255) NULL,
  ADD COLUMN wisproPasswordEncrypted VARCHAR(255) NULL;



