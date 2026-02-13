-- ============================================
-- Migración PostgreSQL: Creación de tablas de inventario
-- ============================================
-- Versión específica para PostgreSQL con tipos ENUM

-- Crear tipos ENUM
DO $$ BEGIN
  CREATE TYPE location_type_enum AS ENUM ('WAREHOUSE', 'TECHNICIAN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE movement_type_enum AS ENUM ('TRANSFER', 'CONSUMPTION', 'ADJUSTMENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 1. Tabla: materials
-- ============================================
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);

-- ============================================
-- 2. Tabla: locations
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type location_type_enum NOT NULL,
  "referenceId" VARCHAR(255) NULL,
  name VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locations_type_reference ON locations(type, "referenceId");

-- ============================================
-- 3. Tabla: inventories
-- ============================================
CREATE TABLE IF NOT EXISTS inventories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "materialId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  stock DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("materialId") REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY ("locationId") REFERENCES locations(id) ON DELETE CASCADE,
  CONSTRAINT unique_material_location UNIQUE ("materialId", "locationId")
);

CREATE INDEX IF NOT EXISTS idx_inventories_location ON inventories("locationId");
CREATE INDEX IF NOT EXISTS idx_inventories_material ON inventories("materialId");

-- ============================================
-- 4. Tabla: inventory_movements
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "materialId" UUID NOT NULL,
  "fromLocationId" UUID NULL,
  "toLocationId" UUID NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  type movement_type_enum NOT NULL,
  "serviceOrderId" VARCHAR(255) NULL,
  "technicianId" VARCHAR(255) NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("materialId") REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY ("fromLocationId") REFERENCES locations(id) ON DELETE SET NULL,
  FOREIGN KEY ("toLocationId") REFERENCES locations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_movements_material ON inventory_movements("materialId");
CREATE INDEX IF NOT EXISTS idx_movements_from_location ON inventory_movements("fromLocationId");
CREATE INDEX IF NOT EXISTS idx_movements_to_location ON inventory_movements("toLocationId");
CREATE INDEX IF NOT EXISTS idx_movements_type ON inventory_movements(type);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON inventory_movements("createdAt");
CREATE INDEX IF NOT EXISTS idx_movements_service_order ON inventory_movements("serviceOrderId");
CREATE INDEX IF NOT EXISTS idx_movements_technician ON inventory_movements("technicianId");

-- ============================================
-- 5. Tabla: service_order_materials
-- ============================================
CREATE TABLE IF NOT EXISTS service_order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "serviceOrderId" VARCHAR(255) NOT NULL,
  "materialId" UUID NOT NULL,
  "quantityUsed" DECIMAL(10, 2) NOT NULL,
  "technicianId" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("materialId") REFERENCES materials(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_service_order_materials_order ON service_order_materials("serviceOrderId");
CREATE INDEX IF NOT EXISTS idx_service_order_materials_technician ON service_order_materials("technicianId");
CREATE INDEX IF NOT EXISTS idx_service_order_materials_material ON service_order_materials("materialId");


