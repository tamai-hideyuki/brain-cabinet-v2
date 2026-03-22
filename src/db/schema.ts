import {
  pgTable,
  text,
  timestamp,
  real,
  integer,
  jsonb,
  boolean,
  uuid,
  customType,
} from "drizzle-orm/pg-core";

// pgvector custom type
const vector = customType<{ data: number[]; dpiverType: string }>({
  dataType() {
    return "vector(384)";
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown) {
    if (typeof value === "string") {
      return value
        .slice(1, -1)
        .split(",")
        .map(Number);
    }
    return value as number[];
  },
});

// ========== 写す層 ==========

export const notes = pgTable("notes", {
  id: uuid("id").defaultRandom().primaryKey(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const noteEmbeddings = pgTable("note_embeddings", {
  noteId: uuid("note_id")
    .primaryKey()
    .references(() => notes.id, { onDelete: "cascade" }),
  embedding: vector("embedding").notNull(),
  modelVersion: text("model_version").notNull().default("Xenova/all-MiniLM-L6-v2"),
});

// ========== 検知層 ==========

export const driftEvents = pgTable("drift_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  driftType: text("drift_type", {
    enum: ["cluster_bias", "stagnation", "divergence", "over_focus", "drift_drop"],
  }).notNull(),
  severity: text("severity", {
    enum: ["low", "mid", "high"],
  }).notNull(),
  detailJson: jsonb("detail_json"),
  acknowledged: boolean("acknowledged").notNull().default(false),
});

// ========== 修正層 ==========

export const reviewSchedules = pgTable("review_schedules", {
  noteId: uuid("note_id")
    .primaryKey()
    .references(() => notes.id, { onDelete: "cascade" }),
  nextReviewAt: timestamp("next_review_at").notNull(),
  intervalDays: real("interval_days").notNull().default(1),
  easinessFactor: real("easiness_factor").notNull().default(2.5),
  repetitionCount: integer("repetition_count").notNull().default(0),
  lastQuality: integer("last_quality"),
});

export const reviewSessions = pgTable("review_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  noteId: uuid("note_id")
    .notNull()
    .references(() => notes.id, { onDelete: "cascade" }),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
  quality: integer("quality").notNull(),
  response: text("response"),
});
