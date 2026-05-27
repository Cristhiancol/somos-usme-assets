CREATE TABLE IF NOT EXISTS `informe_mensual_proveedor` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `anno` int NOT NULL,
  `mes` int NOT NULL,
  `nombreMes` varchar(32),
  `proveedor` text,
  `ocSinIVA` double DEFAULT 0,
  `ocConIVA` double DEFAULT 0,
  `ocsSinIVA` double DEFAULT 0,
  `ocsConIVA` double DEFAULT 0,
  `totalConIVA` double DEFAULT 0,
  `observaciones` text,
  `enlacePazSalvo` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
