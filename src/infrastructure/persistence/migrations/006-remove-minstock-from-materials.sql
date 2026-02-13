-- ============================================
-- Migración MySQL: Eliminar minStock de materials
-- ============================================
-- Esta migración elimina la columna minStock de la tabla materials
-- ya que ahora el stock mínimo se almacena en inventories (solo para bodega)
-- 
-- IMPORTANTE: Ejecutar DESPUÉS de la migración 005-add-minstock-to-inventory.sql
-- para asegurar que los datos ya fueron migrados

-- Eliminar columna minStock de materials
ALTER TABLE materials
  DROP COLUMN minStock;


