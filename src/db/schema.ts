import {
  sqliteTable,
  text,
  real,
  integer,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ========== 写す層 ==========

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  content: text("content").notNull(),
  type: text("type", {
    enum: ["decision", "learning", "scratch", "emotion", "log"],
  }).notNull().default("scratch"),
  confidenceStructural: real("confidence_structural").notNull().default(0),
  confidenceExperiential: real("confidence_experiential").notNull().default(0),
  confidenceTemporal: real("confidence_temporal").notNull().default(0),
  decayProfile: text("decay_profile", {
    enum: ["stable", "exploratory", "situational"],
  }).notNull().default("exploratory"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  deletedAt: text("deleted_at"),
});

export const noteEmbeddings = sqliteTable("note_embeddings", {
  noteId: text("note_id")
    .primaryKey()
    .references(() => notes.id, { onDelete: "cascade" }),
  embedding: text("embedding").notNull(), // JSON string of float array
  modelVersion: text("model_version").notNull().default("Xenova/all-MiniLM-L6-v2"),
});

// ========== 検知層 ==========

export const driftEvents = sqliteTable("drift_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  detectedAt: text("detected_at").notNull().default(sql`(datetime('now'))`),
  driftType: text("drift_type", {
    enum: ["cluster_bias", "stagnation", "divergence", "over_focus", "drift_drop"],
  }).notNull(),
  severity: text("severity", {
    enum: ["low", "mid", "high"],
  }).notNull(),
  detailJson: text("detail_json"), // JSON string
  acknowledged: integer("acknowledged", { mode: "boolean" }).notNull().default(false),
});

// ========== 修正層 ==========

export const reviewSchedules = sqliteTable("review_schedules", {
  noteId: text("note_id")
    .primaryKey()
    .references(() => notes.id, { onDelete: "cascade" }),
  nextReviewAt: text("next_review_at").notNull(),
  intervalDays: real("interval_days").notNull().default(1),
  easinessFactor: real("easiness_factor").notNull().default(2.5),
  repetitionCount: integer("repetition_count").notNull().default(0),
  lastQuality: integer("last_quality"),
});

export const reviewSessions = sqliteTable("review_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  noteId: text("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  reviewedAt: text("reviewed_at").notNull().default(sql`(datetime('now'))`),
  quality: integer("quality").notNull(),
  response: text("response"),
});
