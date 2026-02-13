-- ============================================
-- Migración MySQL: Tabla de usuarios internos
-- ============================================
-- Tabla: internal_users
-- Campos:
-- - id (UUID)
-- - name
-- - email (único)
-- - passwordHash (bcrypt)
-- - createdAt
-- - updatedAt

CREATE TABLE IF NOT EXISTS internal_users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_internal_users_email (email)
);



