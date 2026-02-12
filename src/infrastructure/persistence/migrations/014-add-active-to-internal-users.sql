-- ============================================
-- Migración: Agregar campo active a internal_users
-- ============================================
-- Fecha: 2026-02-09
-- Descripción: Agrega el campo active a la tabla internal_users para controlar usuarios activos/inactivos

ALTER TABLE internal_users 
ADD COLUMN active BOOLEAN DEFAULT TRUE NOT NULL;

-- Crear índice para mejorar las consultas que filtran por active
CREATE INDEX idx_internal_users_active ON internal_users(active);

-- Comentario en la columna
ALTER TABLE internal_users 
MODIFY COLUMN active BOOLEAN DEFAULT TRUE NOT NULL COMMENT 'Indica si el usuario está activo. Los usuarios inactivos no pueden hacer login.';

