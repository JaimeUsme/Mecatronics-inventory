-- ============================================
-- Migración MySQL: Crear tabla de snapshots de cuadrillas por orden
-- ============================================
-- Esta migración crea la tabla order_crew_snapshots para guardar
-- snapshots históricos de las cuadrillas asignadas a órdenes
-- Base de datos: Inventory

-- ============================================
-- Tabla: order_crew_snapshots
-- ============================================
CREATE TABLE IF NOT EXISTS order_crew_snapshots (
  id VARCHAR(36) PRIMARY KEY,
  orderId VARCHAR(255) NOT NULL,
  employeeId VARCHAR(255) NOT NULL,
  crewId VARCHAR(36) NULL,
  crewName VARCHAR(255) NULL,
  crewMemberIds JSON NULL,
  crewMembers JSON NULL,
  snapshotDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_snapshots_order (orderId),
  INDEX idx_snapshots_employee (employeeId),
  INDEX idx_snapshots_crew (crewId),
  UNIQUE KEY unique_order_snapshot (orderId)
);

-- ============================================
-- Notas:
-- ============================================
-- 1. orderId es único: solo un snapshot por orden
-- 2. crewMemberIds: JSON array de IDs de técnicos
-- 3. crewMembers: JSON array de objetos con {technicianId, role, name?}
-- 4. Si crewId es NULL, significa que el empleado no estaba en ninguna cuadrilla
-- 5. Los índices mejoran el rendimiento de las consultas


