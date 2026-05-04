CREATE TABLE `consumo_mensual` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referencia` varchar(64) NOT NULL,
	`fabricante` varchar(128),
	`descripcion` text,
	`mes` varchar(7) NOT NULL,
	`cantidad` double NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consumo_mensual_id` PRIMARY KEY(`id`)
);
