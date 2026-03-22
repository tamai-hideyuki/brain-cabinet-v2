/**
 * Drift Detection Service
 * 「検知」の核心：ユーザーが気づいていない思考パターンの変化を検出する
 */

import { db } from "../../db/client.js";
import { driftEvents } from "../../db/schema.js";
import { sql, desc, eq } from "drizzle-orm";

interface EmbeddingRow {
  note_id: string;
  embedding: number[];
  type: string;
  created_at: Date;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function mean(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const result = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      result[i] += v[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    result[i] /= vectors.length;
  }
  return result;
}

/**
 * 直近N日のEmbeddingを集計し、ドリフトを検出する
 * - stagnation: 直近の分散が極端に小さい（同じことばかり書いている）
 * - divergence: 直近の分散が極端に大きい（散らばりすぎている）
 * - cluster_bias: 特定タイプのノートに偏っている
 * - over_focus: centroidの移動が小さすぎる（視野が狭い）
 */
export async function computeDrift(windowDays = 7) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const prevStart = new Date(windowStart.getTime() - windowDays * 24 * 60 * 60 * 1000);

  // 直近ウィンドウのembeddings取得
  const recentRows = await db.execute(sql`
    SELECT ne.note_id, ne.embedding, n.type, n.created_at
    FROM note_embeddings ne
    JOIN notes n ON n.id = ne.note_id
    WHERE n.created_at >= ${windowStart} AND n.deleted_at IS NULL
    ORDER BY n.created_at DESC
  `);

  // 前ウィンドウのembeddings取得
  const prevRows = await db.execute(sql`
    SELECT ne.note_id, ne.embedding, n.type, n.created_at
    FROM note_embeddings ne
    JOIN notes n ON n.id = ne.note_id
    WHERE n.created_at >= ${prevStart} AND n.created_at < ${windowStart} AND n.deleted_at IS NULL
  `);

  const recent = recentRows as unknown as EmbeddingRow[];
  const prev = prevRows as unknown as EmbeddingRow[];

  if (recent.length < 3) {
    return { detected: false, reason: "not_enough_data" };
  }

  const events: Array<{
    driftType: "cluster_bias" | "stagnation" | "divergence" | "over_focus" | "drift_drop";
    severity: "low" | "mid" | "high";
    detail: Record<string, unknown>;
  }> = [];

  const recentEmbeddings = recent.map((r) =>
    typeof r.embedding === "string"
      ? (r.embedding as string).slice(1, -1).split(",").map(Number)
      : r.embedding
  );
  const recentCentroid = mean(recentEmbeddings);

  // 1. Stagnation / Divergence: 分散を計算
  const similarities = recentEmbeddings.map((e) => cosineSimilarity(e, recentCentroid));
  const avgSim = similarities.reduce((a, b) => a + b, 0) / similarities.length;

  if (avgSim > 0.92) {
    events.push({
      driftType: "stagnation",
      severity: avgSim > 0.96 ? "high" : "mid",
      detail: { avgSimilarity: avgSim, noteCount: recent.length },
    });
  }

  if (avgSim < 0.6) {
    events.push({
      driftType: "divergence",
      severity: avgSim < 0.4 ? "high" : "mid",
      detail: { avgSimilarity: avgSim, noteCount: recent.length },
    });
  }

  // 2. Cluster Bias: タイプ偏り
  const typeCounts: Record<string, number> = {};
  for (const r of recent) {
    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
  }
  const maxTypeRatio = Math.max(...Object.values(typeCounts)) / recent.length;
  if (maxTypeRatio > 0.8 && recent.length >= 5) {
    const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];
    events.push({
      driftType: "cluster_bias",
      severity: maxTypeRatio > 0.9 ? "high" : "mid",
      detail: { dominantType, ratio: maxTypeRatio, typeCounts },
    });
  }

  // 3. Over Focus / Drift Drop: centroid移動量
  if (prev.length >= 3) {
    const prevEmbeddings = prev.map((r) =>
      typeof r.embedding === "string"
        ? (r.embedding as string).slice(1, -1).split(",").map(Number)
        : r.embedding
    );
    const prevCentroid = mean(prevEmbeddings);
    const centroidShift = 1 - cosineSimilarity(recentCentroid, prevCentroid);

    if (centroidShift < 0.02) {
      events.push({
        driftType: "over_focus",
        severity: centroidShift < 0.01 ? "high" : "low",
        detail: { centroidShift },
      });
    }

    if (centroidShift > 0.3) {
      events.push({
        driftType: "drift_drop",
        severity: centroidShift > 0.5 ? "high" : "mid",
        detail: { centroidShift },
      });
    }
  }

  // DB に記録
  for (const event of events) {
    await db.insert(driftEvents).values({
      driftType: event.driftType,
      severity: event.severity,
      detailJson: event.detail,
    });
  }

  return { detected: events.length > 0, events };
}

export async function listDriftEvents(limit = 20) {
  return db
    .select()
    .from(driftEvents)
    .orderBy(desc(driftEvents.detectedAt))
    .limit(limit);
}

export async function acknowledgeDrift(id: string) {
  const [updated] = await db
    .update(driftEvents)
    .set({ acknowledged: true })
    .where(eq(driftEvents.id, id))
    .returning();
  return updated;
}
