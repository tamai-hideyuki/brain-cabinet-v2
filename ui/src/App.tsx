import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { NotesPage } from "./pages/NotesPage";
import { ReviewPage } from "./pages/ReviewPage";
import { DriftPage } from "./pages/DriftPage";

export function App() {
  return (
    <BrowserRouter basename="/ui">
      <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 800, margin: "0 auto", padding: 16 }}>
        <header style={{ borderBottom: "1px solid #e0e0e0", paddingBottom: 12, marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Brain Cabinet v2</h1>
          <p style={{ margin: "4px 0 12px", color: "#666", fontSize: 13 }}>Decision Mirror</p>
          <nav style={{ display: "flex", gap: 16 }}>
            <Link to="/">Notes</Link>
            <Link to="/review">Review</Link>
            <Link to="/drift">Drift</Link>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<NotesPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/drift" element={<DriftPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
