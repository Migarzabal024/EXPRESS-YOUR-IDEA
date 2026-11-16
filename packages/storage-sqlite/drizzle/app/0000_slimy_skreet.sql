CREATE TABLE `recent_project` (
	`folder_path` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`color` text NOT NULL,
	`last_opened_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`default_canvas_mode` text DEFAULT 'infinite' NOT NULL,
	`autosave_enabled` integer DEFAULT true NOT NULL,
	`default_grid_enabled` integer DEFAULT true NOT NULL,
	`default_storage_path` text NOT NULL
);
