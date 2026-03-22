import { useState, useEffect } from "react";
import { command } from "../api/client";

const DRIFT_LABELS: Record<string, string> = {
  cluster_bias: "タイプ偏り",
  stagnation: "停滞",
  divergence: "散逸",
  over_focus: "視野狭窄",
  drift_drop: "急変",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "#f39c12",
  mid: "#e67e22",
  high: "#e74c3c",
};

interface DriftEvent {
  id: string;
  detectedAt: string;
  driftType: string;
  severity: string;
  detailJson: any;
  acknowledged: boolean;
}

export function DriftPage() {
  const [events, setEvents] = useState<DriftEvent[]>([]);
  const [computing, setComputing] = useState(false);

  const fetchEvents = async () => {
    const data = await command("drift.list", { limit: 50 });
    setEvents(data);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleCompute = async () => {
    setComputing(true);
    try {
      await command("drift.compute");
      await fetchEvents();
    } finally {
      setComputing(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    await command("drift.acknowledge", { id });
    await fetchEvents();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Drift Detection</h2>
        <button
          onClick={handleCompute}
          disabled={computing}
          style={{ padding: "6px 16px", fontSize: 13 }}
        >
          {computing ? "検出中..." : "今すぐ検出"}
        </button>
      </div>

      {events.length === 0 ? (
        <p style={{ color: "#999" }}>検出されたドリフトはありません。</p>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            style={{
              borderLeft: `4px solid ${SEVERITY_COLORS[event.severity] ?? "#999"}`,
              padding: "12px 16px",
              marginBottom: 12,
              background: event.acknowledged ? "#fafafa" : "#fff",
              opacity: event.acknowledged ? 0.6 : 1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {DRIFT_LABELS[event.driftType] ?? event.driftType}
                </span>
                <span style={{
                  marginLeft: 8,
                  fontSize: 12,
                  color: SEVERITY_COLORS[event.severity],
                  fontWeight: 600,
                }}>
                  {event.severity.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: 12, color: "#999" }}>
                {new Date(event.detectedAt).toLocaleDateString("ja-JP")}
              </span>
            </div>
            {event.detailJson && (
              <pre style={{ fontSize: 12, color: "#666", margin: "8px 0 0", whiteSpace: "pre-wrap" }}>
                {JSON.stringify(event.detailJson, null, 2)}
              </pre>
            )}
            {!event.acknowledged && (
              <button
                onClick={() => handleAcknowledge(event.id)}
                style={{ marginTop: 8, padding: "4px 12px", fontSize: 12 }}
              >
                確認済みにする
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
