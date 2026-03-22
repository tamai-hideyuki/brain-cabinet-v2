CREATE TABLE `drift_events` (
	`id` text PRIMARY KEY NOT NULL,
	`detected_at` text DEFAULT (datetime('now')) NOT NULL,
	`drift_type` text NOT NULL,
	`severity` text NOT NULL,
	`detail_json` text,
	`acknowledged` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `note_embeddings` (
	`note_id` text PRIMARY KEY NOT NULL,
	`embedding` text NOT NULL,
	`model_version` text DEFAULT 'Xenova/all-MiniLM-L6-v2' NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`type` text DEFAULT 'scratch' NOT NULL,
	`confidence_structural` real DEFAULT 0 NOT NULL,
	`confidence_experiential` real DEFAULT 0 NOT NULL,
	`confidence_temporal` real DEFAULT 0 NOT NULL,
	`decay_profile` text DEFAULT 'exploratory' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `review_schedules` (
	`note_id` text PRIMARY KEY NOT NULL,
	`next_review_at` text NOT NULL,
	`interval_days` real DEFAULT 1 NOT NULL,
	`easiness_factor` real DEFAULT 2.5 NOT NULL,
	`repetition_count` integer DEFAULT 0 NOT NULL,
	`last_quality` integer,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `review_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`reviewed_at` text DEFAULT (datetime('now')) NOT NULL,
	`quality` integer NOT NULL,
	`response` text,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
