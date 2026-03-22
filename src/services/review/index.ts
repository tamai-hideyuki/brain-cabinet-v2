/**
 * Spaced Review Service (SM-2)
 * 「修正」の核心：最適タイミングで過去の判断との強制的な再会を作る
 */

import { db } from "../../db/client.js";
import { reviewSchedules, reviewSessions, notes } from "../../db/schema.js";
import { eq, lte, sql, desc } from "drizzle-orm";

/**
 * SM-2アルゴリズム
 * quality: 0-5 のユーザー自己評価
 *   0 = 完全に忘れた / 完全に意見が変わった
 *   3 = 思い出せたが不確か / まだ同意するが迷いがある
 *   5 = 完璧に覚えている / 強く同意する
 */
function sm2(
  quality: number,
  repetitionCount: number,
  easinessFactor: number,
  intervalDays: number
): { intervalDays: number; easinessFactor: number; repetitionCount: number } {
  let newEF =
    easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  let newInterval: number;
  let newRep: number;

  if (quality < 3) {
    // 失敗: リセット
    newInterval = 1;
    newRep = 0;
  } else {
    newRep = repetitionCount + 1;
    if (newRep === 1) {
      newInterval = 1;
    } else if (newRep === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(intervalDays * newEF);
    }
  }

  return {
    intervalDays: newInterval,
    easinessFactor: Math.round(newEF * 100) / 100,
    repetitionCount: newRep,
  };
}

/**
 * レビュー対象のノートを取得
 * next_review_at <= now のスケジュールを抽出
 */
export async function getNextReviews(limit = 10) {
  const now = new Date();

  const results = await db
    .select({
      schedule: reviewSchedules,
      note: notes,
    })
    .from(reviewSchedules)
    .innerJoin(notes, eq(reviewSchedules.noteId, notes.id))
    .where(lte(reviewSchedules.nextReviewAt, now))
    .orderBy(reviewSchedules.nextReviewAt)
    .limit(limit);

  return results;
}

/**
 * レビュー結果を記録し、SM-2で次回スケジュールを再計算
 * response が存在する場合、新しいノートとして「再び写す」に戻す
 */
export async function submitReview(params: {
  noteId: string;
  quality: number;
  response?: string;
}) {
  const { noteId, quality, response } = params;

  // セッション記録
  const [session] = await db
    .insert(reviewSessions)
    .values({ noteId, quality, response })
    .returning();

  // 現在のスケジュール取得
  const [current] = await db
    .select()
    .from(reviewSchedules)
    .where(eq(reviewSchedules.noteId, noteId));

  if (!current) {
    throw new Error(`No review schedule found for note ${noteId}`);
  }

  // SM-2再計算
  const updated = sm2(
    quality,
    current.repetitionCount,
    current.easinessFactor,
    current.intervalDays
  );

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + updated.intervalDays);

  await db
    .update(reviewSchedules)
    .set({
      intervalDays: updated.intervalDays,
      easinessFactor: updated.easinessFactor,
      repetitionCount: updated.repetitionCount,
      lastQuality: quality,
      nextReviewAt: nextReview,
    })
    .where(eq(reviewSchedules.noteId, noteId));

  // response があれば新ノートとして作成（ループの「再び写す」）
  let newNote = null;
  if (response && response.trim()) {
    const { createNote } = await import("../note/index.js");
    newNote = await createNote(response);
  }

  return { session, nextReview, newNote };
}
