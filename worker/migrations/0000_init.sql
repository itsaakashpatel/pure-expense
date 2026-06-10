CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'receipt' NOT NULL,
	`color` text DEFAULT '#6B7280' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant` text DEFAULT '' NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`tax` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`category` text DEFAULT 'Other' NOT NULL,
	`purchased_at` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`receipt_key` text,
	`raw_text` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `expenses_purchased_at_idx` ON `expenses` (`purchased_at`);--> statement-breakpoint
CREATE INDEX `expenses_merchant_idx` ON `expenses` (`merchant`);--> statement-breakpoint
CREATE INDEX `expenses_category_idx` ON `expenses` (`category`);--> statement-breakpoint
CREATE TABLE `line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`qty` real DEFAULT 1 NOT NULL,
	`unit_price` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `line_items_expense_id_idx` ON `line_items` (`expense_id`);