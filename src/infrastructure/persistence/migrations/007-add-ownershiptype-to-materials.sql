-- 007 - Add ownershipType to materials
-- 
-- Agrega la columna ownershipType a la tabla materials para indicar
-- si el material se controla principalmente a nivel de TÉCNICO o de CUADRILLA.

ALTER TABLE materials
ADD COLUMN IF NOT EXISTS ownershipType ENUM('TECHNICIAN', 'CREW') NOT NULL DEFAULT 'TECHNICIAN';


