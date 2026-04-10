CREATE TABLE `abc_classification` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryItemId` int NOT NULL,
	`classification` enum('A','B','C') NOT NULL,
	`totalValue` double DEFAULT 0,
	`accumulatedPercentage` double DEFAULT 0,
	`consumptionPercentage` double DEFAULT 0,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `abc_classification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `anomalies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryItemId` int NOT NULL,
	`anomalyDate` timestamp NOT NULL,
	`actualConsumption` double NOT NULL,
	`expectedConsumption` double NOT NULL,
	`zScore` double NOT NULL,
	`probableCause` varchar(255),
	`severity` enum('BAJO','MEDIO','ALTO') DEFAULT 'BAJO',
	`resolved` tinyint DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `anomalies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consumption_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryItemId` int NOT NULL,
	`consumptionDate` timestamp NOT NULL,
	`quantity` double NOT NULL,
	`unitCost` double DEFAULT 0,
	`failureType` varchar(100),
	`busId` varchar(32),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consumption_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryItemId` int NOT NULL,
	`predictionDate` timestamp NOT NULL,
	`predictedDemand` double DEFAULT 0,
	`confidenceLow` double DEFAULT 0,
	`confidenceHigh` double DEFAULT 0,
	`reorderPoint` double DEFAULT 0,
	`riskLevel` enum('ALTO','MEDIO','BAJO') DEFAULT 'BAJO',
	`daysUntilStockout` int DEFAULT 0,
	`recommendedOrderQty` double DEFAULT 0,
	`modelAccuracy` double DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stock_predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_performance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`totalOrders` int DEFAULT 0,
	`onTimeDeliveries` int DEFAULT 0,
	`lateDeliveries` int DEFAULT 0,
	`avgLeadTimeDays` double DEFAULT 0,
	`leadTimeStdDev` double DEFAULT 0,
	`leadTimeP95` double DEFAULT 0,
	`onTimePercentage` double DEFAULT 0,
	`reliabilityScore` double DEFAULT 0,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_performance_id` PRIMARY KEY(`id`)
);
