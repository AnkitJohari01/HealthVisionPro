import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
const API_BASE = import.meta.env.VITE_API_BASE;
/* ============================================================
   TypeScript Models
============================================================ */
interface ImagingRecord {
  file_name: string;
  report: string;
  annotated_img?: string;
  findings?: any;
  created_at?: string;
}

interface VoiceRecord {
  name?: string;
  age?: number;
  sex?: string;
  symptoms?: string[] | null;
  duration?: string | null;
  body_location?: string | null;

  transcript: string;
  ai_analysis: string;
  similar_cases?: any[];
  created_at?: string;
}

/* ============================================================
   Component
============================================================ */
export default function History() {
  const [imaging, setImaging] = useState<ImagingRecord[]>([]);
  const [voice, setVoice] = useState<VoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  /* ============================================================
     Fetch Unified History
  ============================================================ */
  async function loadHistory() {
    try {
      const res = await fetch(`${API_BASE}/history`);
      const data = await res.json();

      setImaging(data.imaging ?? []);
      setVoice(data.voice ?? []);
    } catch (err) {
      console.log("History Fetch Error ❌", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  /* ============================================================
     Clear ALL History
  ============================================================ */
  async function clearHistory() {
    const confirmClear = window.confirm(
      "Are you sure you want to delete all history records?"
    );
    if (!confirmClear) return;

    try {
      const res = await fetch("http://localhost:8000/history/clear", {
        method: "DELETE",
      });

      if (res.ok) {
        setImaging([]);
        setVoice([]);
        alert("History cleared successfully!");
      } else {
        alert("Failed to clear history.");
      }
    } catch (err) {
      alert("Error clearing history.");
    }
  }

  if (loading)
    return <div style={{ padding: 30 }}>Loading history...</div>;

  return (
    <div style={{ padding: "30px", width: "100%" }}>
      {/* ============================================================
          CLEAR BUTTON
      ============================================================ */}
      <div style={{ width: "95%", textAlign: "right", marginBottom: 20 }}>
        <button
          onClick={clearHistory}
          style={{
            background: "#d9534f",
            color: "white",
            padding: "10px 12px",
            fontSize: "0.85rem",
            borderRadius: "8px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        >
          Clear History
        </button>
      </div>

      {/* ============================================================
          MAIN GRID
      ============================================================ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "40px",
        }}
      >
        {/* ============================================================
            IMAGE HISTORY
        ============================================================ */}
        <div>
          <h2 style={{ marginBottom: 15 }}>Uploaded Image Reports</h2>

          {imaging.length === 0 && <p>No radiology uploads found.</p>}

          {imaging.map((item, i) => (
            <div
              key={`img-${i}`}
              style={{
                // background: "#fff",
                padding: 20,
                borderRadius: 12,
                marginBottom: 22,
                boxShadow: "0 0 10px rgba(0,0,0,.08)",
                fontSize: "1.05rem",
              }}
            >
              <b>File:</b> {item.file_name} <br />
              <b>Date:</b> {item.created_at ?? "N/A"} <br />
              <br />

              <b style={{ fontSize: "1.1rem" }}>AI Medical Report:</b>
              <div style={{ marginTop: 12, lineHeight: 1.55 }}>
              <div className="ai-markdown">
                <ReactMarkdown>{item.report ?? ""}</ReactMarkdown>
              </div>
              </div>

              {item.annotated_img && (
                <img
                  src={`data:image/png;base64,${item.annotated_img}`}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    marginTop: 18,
                    boxShadow: "0 2px 8px rgba(0,0,0,.12)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* ============================================================
            VOICE HISTORY
        ============================================================ */}
        <div>
          <h2 style={{ marginBottom: 15 }}>Voice Assistant Medical Reports</h2>

          {voice.length === 0 && <p>No voice interactions found.</p>}

          {voice.map((v, i) => (
            <div
              key={`voice-${i}`}
              style={{
                // background: "#fff",
                padding: 20,
                borderRadius: 12,
                marginBottom: 22,
                boxShadow: "0 0 10px rgba(0,0,0,.08)",
                fontSize: "1.05rem",
              }}
            >
              {/* PATIENT INFO */}
              {(v.name ||
                v.age ||
                v.sex ||
                v.symptoms ||
                v.duration ||
                v.body_location) && (
                <div style={{ marginBottom: 15 }}>
                  <b style={{ fontSize: "1.1rem" }}>Patient Information:</b>
                  <div style={{ marginTop: 8, lineHeight: 1.5 }}>
                    {v.name && <div><b>Name:</b> {v.name}</div>}
                    {v.age !== undefined && (
                      <div><b>Age:</b> {v.age}</div>
                    )}
                    {v.sex && <div><b>Sex:</b> {v.sex}</div>}
                    {v.symptoms?.length ? (
                      <div><b>Symptoms:</b> {v.symptoms.join(", ")}</div>
                    ) : null}
                    {v.duration && <div><b>Duration:</b> {v.duration}</div>}
                    {v.body_location && (
                      <div><b>Body Location:</b> {v.body_location}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Voice Transcript */}
              <b>Transcribed Voice Input:</b>
              <p style={{ whiteSpace: "pre-wrap", marginBottom: 15 }}>
                {v.transcript}
              </p>

              {/* AI Medical Analysis */}
              <b style={{ fontSize: "1.1rem" }}>AI Medical Analysis:</b>
              <div style={{ marginTop: 12, lineHeight: 1.55 }}>
              <div className="ai-markdown">
                <ReactMarkdown>{(v.ai_analysis ?? "").replace(/^\d+\.\s+/gm, "")}</ReactMarkdown>
              </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
