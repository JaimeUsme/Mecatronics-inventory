-- Migration: Add consumptionType to service_order_materials
-- Description: Agrega el campo consumptionType para distinguir entre material usado/gastado (USED) y dañado (DAMAGED)

-- Agregar columna consumptionType
ALTER TABLE service_order_materials
ADD COLUMN consumptionType ENUM('USED', 'DAMAGED') NOT NULL DEFAULT 'USED'
AFTER technicianId;

-- Agregar índice para consultas por tipo de consumo
CREATE INDEX idx_service_order_materials_consumption_type ON service_order_materials(consumptionType);


