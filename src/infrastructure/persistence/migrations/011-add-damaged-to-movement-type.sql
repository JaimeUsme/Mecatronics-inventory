-- ============================================
-- Migración MySQL: Agregar DAMAGED al ENUM de tipo de movimiento
-- ============================================
-- Esta migración agrega el valor 'DAMAGED' al ENUM de la columna 'type'
-- en la tabla 'inventory_movements'
-- Base de datos: Inventory

-- Modificar el ENUM para incluir 'DAMAGED'
ALTER TABLE inventory_movements 
MODIFY COLUMN type ENUM('TRANSFER', 'CONSUMPTION', 'ADJUSTMENT', 'DAMAGED') NOT NULL;

-- ============================================
-- Notas:
-- ============================================
-- 1. El nuevo valor 'DAMAGED' se agrega al final del ENUM
-- 2. Los valores existentes no se ven afectados
-- 3. Esta migración es compatible con MySQL 5.7+

