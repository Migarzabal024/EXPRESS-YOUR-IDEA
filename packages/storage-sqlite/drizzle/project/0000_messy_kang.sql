CREATE TABLE `asset` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`file_name` text NOT NULL,
	`relative_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`checksum` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `asset_relative_path_unique` ON `asset` (`relative_path`);--> statement-breakpoint
CREATE TABLE `canvas_element` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`page_id` text,
	`parent_group_id` text,
	`type` text NOT NULL,
	`position_x` real DEFAULT 0 NOT NULL,
	`position_y` real DEFAULT 0 NOT NULL,
	`width` real DEFAULT 0 NOT NULL,
	`height` real DEFAULT 0 NOT NULL,
	`rotation` real DEFAULT 0 NOT NULL,
	`z_index` integer DEFAULT 0 NOT NULL,
	`properties_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `canvas_page`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `canvas_element_workspace_idx` ON `canvas_element` (`workspace_id`,`page_id`,`z_index`);--> statement-breakpoint
CREATE INDEX `canvas_element_parent_idx` ON `canvas_element` (`parent_group_id`);--> statement-breakpoint
CREATE TABLE `canvas_page` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`background_color` text DEFAULT '#FFFFFF' NOT NULL,
	`order_index` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `canvas_page_workspace_idx` ON `canvas_page` (`workspace_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `connection` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`source_element_id` text NOT NULL,
	`target_element_id` text NOT NULL,
	`type` text DEFAULT 'straight' NOT NULL,
	`properties_json` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_element_id`) REFERENCES `canvas_element`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_element_id`) REFERENCES `canvas_element`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `connection_workspace_idx` ON `connection` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `drawing_stroke` (
	`id` text PRIMARY KEY NOT NULL,
	`canvas_element_id` text NOT NULL,
	`points_data` text NOT NULL,
	`color` text NOT NULL,
	`width` real NOT NULL,
	`opacity` real DEFAULT 1 NOT NULL,
	`tool_type` text NOT NULL,
	FOREIGN KEY (`canvas_element_id`) REFERENCES `canvas_element`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `drawing_stroke_element_idx` ON `drawing_stroke` (`canvas_element_id`);--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`color` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`canvas_mode` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_project_idx` ON `workspace` (`project_id`);--> statement-breakpoint
CREATE TABLE `workspace_viewport` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`page_id` text,
	`zoom` real DEFAULT 1 NOT NULL,
	`offset_x` real DEFAULT 0 NOT NULL,
	`offset_y` real DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `canvas_page`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_viewport_idx` ON `workspace_viewport` (`workspace_id`,`page_id`);