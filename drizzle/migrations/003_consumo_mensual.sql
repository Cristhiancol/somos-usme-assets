-- Migración: Crear tabla consumo_mensual
-- Almacena consumo por referencia × mes (normalizado)
CREATE TABLE IF NOT EXISTS `consumo_mensual` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `referencia` VARCHAR(64) NOT NULL,
  `fabricante` VARCHAR(128),
  `descripcion` TEXT,
  `mes` VARCHAR(7) NOT NULL COMMENT 'Formato YYYY-MM',
  `cantidad` DOUBLE NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_consumo_ref` (`referencia`),
  INDEX `idx_consumo_mes` (`mes`),
  INDEX `idx_consumo_ref_mes` (`referencia`, `mes`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
