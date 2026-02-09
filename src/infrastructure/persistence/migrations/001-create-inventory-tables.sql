-- ============================================
-- Migración MySQL: Creación de tablas de inventario
-- ============================================
-- Esta migración crea todas las tablas necesarias para el sistema de inventario
-- Base de datos: Inventory
-- Compatible con MySQL 5.7+

-- ============================================
-- 1. Tabla: materials
-- ============================================
CREATE TABLE IF NOT EXISTS materials (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_materials_name (name)
);

-- ============================================
-- 2. Tabla: locations
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(36) PRIMARY KEY,
  type ENUM('WAREHOUSE', 'TECHNICIAN') NOT NULL,
  referenceId VARCHAR(255) NULL,
  name VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_locations_type_reference (type, referenceId)
);

-- Nota: MySQL soporta ENUMs nativamente, no es necesario crear tipos separados

-- ============================================
-- 3. Tabla: inventories
-- ============================================
CREATE TABLE IF NOT EXISTS inventories (
  id VARCHAR(36) PRIMARY KEY,
  materialId VARCHAR(36) NOT NULL,
  locationId VARCHAR(36) NOT NULL,
  stock DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (materialId) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY (locationId) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE KEY unique_material_location (materialId, locationId),
  INDEX idx_inventories_location (locationId),
  INDEX idx_inventories_material (materialId)
);

-- ============================================
-- 4. Tabla: inventory_movements
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id VARCHAR(36) PRIMARY KEY,
  materialId VARCHAR(36) NOT NULL,
  fromLocationId VARCHAR(36) NULL,
  toLocationId VARCHAR(36) NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  type ENUM('TRANSFER', 'CONSUMPTION', 'ADJUSTMENT') NOT NULL,
  serviceOrderId VARCHAR(255) NULL,
  technicianId VARCHAR(255) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (materialId) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY (fromLocationId) REFERENCES locations(id) ON DELETE SET NULL,
  FOREIGN KEY (toLocationId) REFERENCES locations(id) ON DELETE SET NULL,
  INDEX idx_movements_material (materialId),
  INDEX idx_movements_from_location (fromLocationId),
  INDEX idx_movements_to_location (toLocationId),
  INDEX idx_movements_type (type),
  INDEX idx_movements_created_at (createdAt),
  INDEX idx_movements_service_order (serviceOrderId),
  INDEX idx_movements_technician (technicianId)
);

-- Nota: MySQL soporta ENUMs nativamente, no es necesario crear tipos separados

-- ============================================
-- 5. Tabla: service_order_materials
-- ============================================
CREATE TABLE IF NOT EXISTS service_order_materials (
  id VARCHAR(36) PRIMARY KEY,
  serviceOrderId VARCHAR(255) NOT NULL,
  materialId VARCHAR(36) NOT NULL,
  quantityUsed DECIMAL(10, 2) NOT NULL,
  technicianId VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (materialId) REFERENCES materials(id) ON DELETE CASCADE,
  INDEX idx_service_order_materials_order (serviceOrderId),
  INDEX idx_service_order_materials_technician (technicianId),
  INDEX idx_service_order_materials_material (materialId)
);

-- ============================================
-- Notas importantes:
-- ============================================
-- 1. Los IDs son VARCHAR(36) para UUIDs (TypeORM genera UUIDs por defecto)
-- 2. Los ENUMs deben crearse antes de las tablas en PostgreSQL
-- 3. Los índices mejoran el rendimiento de las consultas
-- 4. Las restricciones FOREIGN KEY aseguran la integridad referencial
-- 5. ON DELETE CASCADE: si se elimina un material, se eliminan sus inventarios
-- 6. ON DELETE SET NULL: si se elimina una ubicación, los movimientos mantienen la referencia pero como NULL

