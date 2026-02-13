-- 008 - Create crews and crew_members tables
--
-- Define la estructura básica para manejar cuadrillas y sus miembros.

CREATE TABLE IF NOT EXISTS crews (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  leaderTechnicianId VARCHAR(255) NULL,
  description VARCHAR(500) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crew_members (
  id VARCHAR(36) PRIMARY KEY,
  crewId VARCHAR(36) NOT NULL,
  technicianId VARCHAR(255) NOT NULL,
  role VARCHAR(50) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_crew_members_crew FOREIGN KEY (crewId) REFERENCES crews(id) ON DELETE CASCADE,
  INDEX idx_crew_members_crew (crewId),
  INDEX idx_crew_members_technician (technicianId)
);



