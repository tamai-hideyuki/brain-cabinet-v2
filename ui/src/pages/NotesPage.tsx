import { useState, useEffect } from "react";
import { command } from "../api/client";

const TYPE_LABELS: Record<string, string> = {
  decision: "判断",
  learning: "学び",
  scratch: "メモ",
  emotion: "感情",
  log: "ログ",
};

const TYPE_COLORS: Record<string, string> = {
  decision: "#e74c3c",
  learning: "#3498db",
  scratch: "#95a5a6",
  emotion: "#e67e22",
  log: "#7f8c8d",
};

const DECAY_LABELS: Record<string, string> = {
  stable: "安定",
  exploratory: "探索",
  situational: "状況",
};

interface Note {
  id: string;
  content: string;
  type: string;
  confidenceStructural: number;
  confidenceExperiential: number;
  confidenceTemporal: number;
  decayProfile: string;
  createdAt: string;
}

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [total, setTotal] = useState(0);
  const [content, setContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchNotes = async () => {
    const data = await command("note.list", { limit: 50 });
    setNotes(data.notes);
    setTotal(data.total);
  };

  useEffect(() => { fetchNotes(); }, []);

  const handleCreate = async () => {
    if (!content.trim()) return;
    setCreating(true);
    try {
      await command("note.create", { content });
      setContent("");
      await fetchNotes();
    } finally {
      setCreating(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const data = await command("note.search", { query: searchQuery, limit: 10 });
    setSearchResults(data);
  };

  const displayNotes = searchResults ?? notes;

  return (
    <div>
      {/* 書く */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>Write</h2>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="メモを書く..."
          rows={4}
          style={{ width: "100%", padding: 8, fontSize: 14, borderRadius: 4, border: "1px solid #ccc", resize: "vertical" }}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !content.trim()}
          style={{ marginTop: 8, padding: "6px 16px", fontSize: 14 }}
        >
          {creating ? "保存中..." : "保存"}
        </button>
      </section>

      {/* 検索 */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="セマンティック検索..."
            style={{ flex: 1, padding: 6, fontSize: 14, borderRadius: 4, border: "1px solid #ccc" }}
          />
          <button onClick={handleSearch} style={{ padding: "6px 12px", fontSize: 14 }}>検索</button>
          {searchResults && (
            <button onClick={() => setSearchResults(null)} style={{ padding: "6px 12px", fontSize: 14 }}>
              クリア
            </button>
          )}
        </div>
      </section>

      {/* 一覧 */}
      <section>
        <h2 style={{ fontSize: 16, marginBottom: 8 }}>
          {searchResults ? `検索結果 (${searchResults.length})` : `Notes (${total})`}
        </h2>
        {displayNotes.map((note: any) => (
          <div key={note.id} style={{ borderBottom: "1px solid #eee", padding: "12px 0" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span style={{
                background: TYPE_COLORS[note.type] ?? "#999",
                color: "#fff",
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 12,
              }}>
                {TYPE_LABELS[note.type] ?? note.type}
              </span>
              <span style={{ fontSize: 12, color: "#999" }}>
                {DECAY_LABELS[note.decay_profile ?? note.decayProfile] ?? ""}
              </span>
              {note.similarity != null && (
                <span style={{ fontSize: 12, color: "#3498db" }}>
                  類似度: {(note.similarity * 100).toFixed(1)}%
                </span>
              )}
              <span style={{ fontSize: 12, color: "#999", marginLeft: "auto" }}>
                {new Date(note.created_at ?? note.createdAt).toLocaleDateString("ja-JP")}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap" }}>{note.content}</p>
            <div style={{ marginTop: 4, fontSize: 11, color: "#aaa" }}>
              確信度: 構造 {((note.confidence_structural ?? note.confidenceStructural) * 100).toFixed(0)}%
              {" / "}経験 {((note.confidence_experiential ?? note.confidenceExperiential) * 100).toFixed(0)}%
              {" / "}時間 {((note.confidence_temporal ?? note.confidenceTemporal) * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
