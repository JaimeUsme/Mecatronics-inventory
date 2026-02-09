-- ============================================
-- Migración MySQL: Agregar minStock a inventories
-- ============================================
-- Esta migración agrega el campo minStock a la tabla inventories
-- y migra los datos existentes desde materials a inventories (solo para bodega)

-- Agregar columna minStock a inventories (nullable)
ALTER TABLE inventories
  ADD COLUMN minStock DECIMAL(10,2) NULL;

-- Migrar datos existentes:
-- Para ubicaciones de tipo WAREHOUSE, copiar minStock del material
-- Para ubicaciones de tipo TECHNICIAN, dejar NULL
UPDATE inventories i
INNER JOIN locations l ON i.locationId = l.id
INNER JOIN materials m ON i.materialId = m.id
SET i.minStock = CASE 
  WHEN l.type = 'WAREHOUSE' THEN m.minStock
  ELSE NULL
END
WHERE i.id IS NOT NULL; -- Cláusula WHERE requerida por MySQL safe update mode

