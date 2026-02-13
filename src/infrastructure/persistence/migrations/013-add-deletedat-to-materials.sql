-- ============================================
-- Migración: Agregar campo deletedAt a materials para borrado lógico
-- ============================================
-- Fecha: 2026-02-09
-- Descripción: Agrega el campo deletedAt a la tabla materials para implementar borrado lógico

ALTER TABLE materials 
ADD COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL;

-- Crear índice para mejorar las consultas que filtran por deletedAt
CREATE INDEX idx_materials_deletedAt ON materials(deletedAt);

-- Comentario en la columna
ALTER TABLE materials 
MODIFY COLUMN deletedAt TIMESTAMP NULL DEFAULT NULL COMMENT 'Fecha de eliminación (borrado lógico). Si es NULL, el material está activo.';


