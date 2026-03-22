import { useState, useEffect } from "react";
import { command } from "../api/client";

const TYPE_LABELS: Record<string, string> = {
  decision: "判断",
  learning: "学び",
  scratch: "メモ",
  emotion: "感情",
  log: "ログ",
};

interface ReviewItem {
  schedule: {
    noteId: string;
    nextReviewAt: string;
    intervalDays: number;
    easinessFactor: number;
    repetitionCount: number;
    lastQuality: number | null;
  };
  note: {
    id: string;
    content: string;
    type: string;
    createdAt: string;
    confidenceStructural: number;
    confidenceExperiential: number;
    confidenceTemporal: number;
  };
}

export function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quality, setQuality] = useState(3);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    const data = await command("review.next", { limit: 20 });
    setItems(data);
    setCurrentIndex(0);
  };

  useEffect(() => { fetchReviews(); }, []);

  const current = items[currentIndex];

  const handleSubmit = async () => {
    if (!current) return;
    setSubmitting(true);
    try {
      await command("review.submit", {
        noteId: current.note.id,
        quality,
        response: response.trim() || undefined,
      });
      setResponse("");
      setQuality(3);
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        await fetchReviews();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div>
        <h2 style={{ fontSize: 16 }}>Review</h2>
        <p style={{ color: "#999" }}>レビュー対象のノートはありません。</p>
      </div>
    );
  }

  if (!current) return null;

  const daysAgo = Math.floor(
    (Date.now() - new Date(current.note.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div>
      <h2 style={{ fontSize: 16, marginBottom: 4 }}>
        Review ({currentIndex + 1} / {items.length})
      </h2>

      {/* 過去の判断を提示 */}
      <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
          {daysAgo}日前 - {TYPE_LABELS[current.note.type] ?? current.note.type}
          {" / "}反復 {current.schedule.repetitionCount}回目
          {" / "}間隔 {current.schedule.intervalDays}日
        </div>
        <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap" }}>
          {current.note.content}
        </p>
        <div style={{ marginTop: 8, fontSize: 11, color: "#aaa" }}>
          確信度: 構造 {(current.note.confidenceStructural * 100).toFixed(0)}%
          {" / "}経験 {(current.note.confidenceExperiential * 100).toFixed(0)}%
          {" / "}時間 {(current.note.confidenceTemporal * 100).toFixed(0)}%
        </div>
      </div>

      {/* 自己評価 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 14, fontWeight: 600 }}>今も同意しますか？</label>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {[0, 1, 2, 3, 4, 5].map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              style={{
                padding: "6px 12px",
                fontSize: 13,
                borderRadius: 4,
                border: quality === q ? "2px solid #3498db" : "1px solid #ccc",
                background: quality === q ? "#ebf5fb" : "#fff",
                cursor: "pointer",
              }}
            >
              {q}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
          0 = 完全に変わった / 3 = まだ同意するが迷い / 5 = 強く同意
        </div>
      </div>

      {/* 再評価コメント（新ノートになる） */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 14, fontWeight: 600 }}>
          書き直すなら（新しいノートとして記録されます）
        </label>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="今の考えを書く..."
          rows={3}
          style={{ width: "100%", marginTop: 8, padding: 8, fontSize: 14, borderRadius: 4, border: "1px solid #ccc", resize: "vertical" }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{ padding: "8px 24px", fontSize: 14 }}
      >
        {submitting ? "送信中..." : "記録する"}
      </button>
    </div>
  );
}
