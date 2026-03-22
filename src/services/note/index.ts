import { db } from "../../db/client.js";
import { notes, noteEmbeddings, reviewSchedules } from "../../db/schema.js";
import { eq, isNull, sql, desc } from "drizzle-orm";
import { generateEmbedding } from "../embedding/index.js";
import { inferNoteType } from "../inference/index.js";
import { createLogger } from "../../lib/logger.js";

const log = createLogger("note");

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function createNote(content: string) {
  const timer = log.time("create");

  log.info("inferring note type...");
  const inference = inferNoteType(content);

  log.info("generating embedding...");
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
    embedding: JSON.stringify(embedding),
  });

  log.info("saved note + embedding", { id: note.id, type: note.type });

  // decision / learning は自動でレビュースケジュールに登録
  if (inference.type === "decision" || inference.type === "learning") {
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + 1); // SM-2初回: 1日後
    await db.insert(reviewSchedules).values({
      noteId: note.id,
      nextReviewAt: nextReview.toISOString(),
    });
    log.info("scheduled review (SM-2 initial: +1d)", { noteId: note.id });
  }

  timer.end({ id: note.id, type: note.type, decay: note.decayProfile });
  return note;
}

export async function getNote(id: string) {
  log.debug("get", { id });
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

  log.debug("list", { returned: rows.length, total: Number(count), type: type ?? "all" });
  return { notes: rows, total: Number(count) };
}

/**
 * セマンティック検索 — アプリ側でコサイン類似度を計算
 * SQLiteにベクトル演算がないため、全embeddingを取得して比較する
 * ノート数が数千を超えたらsqlite-vecに移行
 */
export async function searchNotes(query: string, limit = 10) {
  const timer = log.time("semantic search");

  log.info("generating query embedding...");
  const queryEmbedding = await generateEmbedding(query);

  const allRows = await db
    .select({
      noteId: noteEmbeddings.noteId,
      embedding: noteEmbeddings.embedding,
    })
    .from(noteEmbeddings)
    .innerJoin(notes, eq(noteEmbeddings.noteId, notes.id))
    .where(isNull(notes.deletedAt));

  log.info("computing cosine similarity", { candidates: allRows.length });

  const scored = allRows
    .map((row) => ({
      noteId: row.noteId,
      similarity: cosineSimilarity(queryEmbedding, JSON.parse(row.embedding)),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  const results = [];
  for (const { noteId, similarity } of scored) {
    const [note] = await db.select().from(notes).where(eq(notes.id, noteId));
    if (note) {
      results.push({ ...note, similarity });
    }
  }

  timer.end({ query: query.slice(0, 40), candidates: allRows.length, results: results.length });
  return results;
}
