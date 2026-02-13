-- ============================================
-- Migración MySQL: Agregar constraint único para locations
-- ============================================
-- Esta migración agrega un constraint único para evitar que se creen
-- dos ubicaciones de tipo TECHNICIAN con el mismo referenceId

-- Agregar constraint único en (type, referenceId)
-- Esto previene duplicados de referenceId para el mismo tipo
ALTER TABLE locations
  ADD CONSTRAINT unique_location_type_reference 
  UNIQUE (type, referenceId);


