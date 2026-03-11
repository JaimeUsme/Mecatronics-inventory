-- 016 - Create planes table

CREATE TABLE IF NOT EXISTS planes (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500) NULL,
  value DECIMAL(12,2) NOT NULL,
  wispro_plan_id_single_contract VARCHAR(100) NOT NULL,
  wispro_plan_id_double_contract VARCHAR(100) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_planes_wispro_plan_id_single_contract (wispro_plan_id_single_contract),
  INDEX idx_planes_wispro_plan_id_double_contract (wispro_plan_id_double_contract),
  INDEX idx_planes_is_active (is_active),
  INDEX idx_planes_is_deleted (is_deleted)
);
