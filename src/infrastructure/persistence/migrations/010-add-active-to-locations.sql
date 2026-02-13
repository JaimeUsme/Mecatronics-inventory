-- Migration: Add active field to locations
-- Description: Agrega el campo active a la tabla locations para poder desactivar ubicaciones (especialmente cuadrillas)

-- Agregar columna active
ALTER TABLE locations
ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE
AFTER name;

-- Actualizar todas las ubicaciones existentes como activas
UPDATE locations
SET active = TRUE
WHERE active IS NULL;


