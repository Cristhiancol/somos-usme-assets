CREATE TABLE `auditoria_accesos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evento` enum('LOGIN_EXITOSO','LOGIN_RECHAZADO','LOGOUT','ACCESO_DENEGADO') NOT NULL,
	`email` varchar(320) NOT NULL,
	`openId` varchar(64),
	`detalle` varchar(500),
	`ip` varchar(64),
	`userAgent` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditoria_accesos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `activo` int DEFAULT 1 NOT NULL;