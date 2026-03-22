import { db } from "../../db/client.js";
import { notes, noteEmbeddings } from "../../db/schema.js";
import { eq, isNull, sql, desc } from "drizzle-orm";
import { generateEmbedding } from "../embedding/index.js";
import { inferNoteType } from "../inference/index.js";

export async function createNote(content: string) {
  const inference = inferNoteType(content);
  const embedding = await generateEmbedding(content);

  const [note] = await db
    .insert(notes)
    .values({
      content,
      type: inference.type,
      confidenceStructural: inference.confidenceStructural,
      confidenceExperiential: inference.confidenceExperiential,
      confidenceTemporal: inference.confidenceTemporal,
      decayProfile: inference.decayProfile,
    })
    .returning();

  await db.insert(noteEmbeddings).values({
    noteId: note.id,
    embedding,
  });

  // decision / learning は自動でレビュースケジュールに登録
  if (inference.type === "decision" || inference.type === "learning") {
    const { reviewSchedules } = await import("../../db/schema.js");
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + 1); // SM-2初回: 1日後
    await db.insert(reviewSchedules).values({
      noteId: note.id,
      nextReviewAt: nextReview,
    });
  }

  return note;
}

export async function getNote(id: string) {
  const result = await db
    .select()
    .from(notes)
    .where(eq(notes.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function listNotes(params: {
  limit?: number;
  offset?: number;
  type?: string;
}) {
  const { limit = 20, offset = 0, type } = params;

  const conditions = [isNull(notes.deletedAt)];
  if (type) {
    conditions.push(eq(notes.type, type as any));
  }

  const rows = await db
    .select()
    .from(notes)
    .where(sql`${sql.join(conditions, sql` AND `)}`)
    .orderBy(desc(notes.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notes)
    .where(sql`${sql.join(conditions, sql` AND `)}`);

  return { notes: rows, total: Number(count) };
}

export async function searchNotes(query: string, limit = 10) {
  const queryEmbedding = await generateEmbedding(query);
  const vectorStr = `[${queryEmbedding.join(",")}]`;

  const results = await db.execute(sql`
    SELECT
      n.*,
      1 - (ne.embedding <=> ${vectorStr}::vector) AS similarity
    FROM notes n
    JOIN note_embeddings ne ON ne.note_id = n.id
    WHERE n.deleted_at IS NULL
    ORDER BY ne.embedding <=> ${vectorStr}::vector
    LIMIT ${limit}
  `);

  return results as unknown as Record<string, unknown>[];
}
