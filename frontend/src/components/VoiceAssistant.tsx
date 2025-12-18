import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
const API_BASE=import.meta.env.VITE_API_BASE;
type SimilarCase = {
  score: number;
  analysis: string;
};

/* =====================================================
   CLEAN MARKDOWN (Fixes stray bullets + gaps)
===================================================== */
function cleanMarkdown(md: string) {
  if (!md) return "";

  md = md.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();

  // Remove embedded headings like: Summary:**, Key Symptoms:** etc.
  md = md.replace(
    /(Summary|Key Symptoms|Duration|Severity|Possible Causes|Red Flag Warnings|Patient-Friendly Explanation|Doctor Summary|Recommended Next Steps):?\s*\*\*/gi,
    ""
  );

  // Split numbered sections 1. 2. 3.
  const parts = md.split(/\n?\s*\d+\.\s*/).filter((p) => p.trim().length > 0);

  const labels = [
    "Summary",
    "Key Symptoms",
    "Duration",
    "Severity",
    "Possible Causes",
    "Red Flag Warnings",
    "Patient-Friendly Explanation",
    "Doctor Summary",
    "Recommended Next Steps",
  ];

  let final = "";

  for (let i = 0; i < parts.length; i++) {
    const label = labels[i] || `Section ${i + 1}`;
    let content = parts[i].trim();

    // REMOVE leftover markdown garbage like "** ", "*" etc.
    content = content
      .replace(/^\*\*\s*/g, "")       // remove "** "
      .replace(/^\*\s*/g, "")         // remove "* "
      .replace(/^\*\*+/g, "")         // remove multiple stars
      .replace(/^\*+:\*+/, "")        // remove "*:*"
      .replace(/^[-•]\s*$/gm, "")     // 🔥 remove empty bullets like "-" or "•"
      .replace(/^\s*[-*]\s*$/gm, "")  // 🔥 extra safety for "-" and "*"
      .trim();

    final += `### ${label}\n${content}\n\n`;
  }

  return final.trim();
}



export default function VoiceAssistant() {
  /* =====================================================
      RESTORE SESSION
  ===================================================== */
  const saved = JSON.parse(sessionStorage.getItem("voice_session") || "{}");

  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const [transcript, setTranscript] = useState(saved.transcript || "");
  const [analysis, setAnalysis] = useState(saved.analysis || "");
  const [similarCases, setSimilarCases] = useState<SimilarCase[]>(saved.similarCases || []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  /* =====================================================
      AUTO SAVE SESSION
  ===================================================== */
  useEffect(() => {
    sessionStorage.setItem(
      "voice_session",
      JSON.stringify({ transcript, analysis, similarCases })
    );
  }, [transcript, analysis, similarCases]);

  /* =====================================================
      RECORDING LOGIC
  ===================================================== */
  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => setAudioBlob(new Blob(chunks, { type: "audio/webm" }));

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  /* =====================================================
      TRANSCRIBE
  ===================================================== */
  async function transcribeAudio() {
    if (!audioBlob) return alert("Please record audio first.");

    setLoadingTranscript(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "voice.webm");

      
      const res = await fetch(`${API_BASE}/voice/transcribe`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Transcription failed");

      setTranscript(data.transcript);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingTranscript(false);
    }
  }

  /* =====================================================
      ANALYZE
  ===================================================== */
  async function analyzeTranscript() {
    if (!transcript) return alert("No transcript to analyze.");

    setLoadingAI(true);
    setErrorMsg("");

    const imagingContext = JSON.parse(
      sessionStorage.getItem("latest_imaging_context") || "null"
    );

    try {
      const res = await fetch(`${API_BASE}/voice/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          patient_id: 1,
          image_report: imagingContext?.report || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "AI analysis failed");

      setAnalysis(data.analysis);
      setSimilarCases(data.similar_cases || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingAI(false);
    }
  }

  /* =====================================================
      RESET
  ===================================================== */
  function resetAll() {
    setTranscript("");
    setAnalysis("");
    setSimilarCases([]);
    setAudioBlob(null);
    sessionStorage.removeItem("voice_session");
  }

  /* =====================================================
      UI — CLEANED & ALIGNED
  ===================================================== */
  return (
    <div className="dual-panel">

      {/* LEFT PANEL */}
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <h2>Voice Input</h2>

        <div style={{ display: "flex", gap: "10px" }}>
          {!recording ? (
            <button
              onClick={startRecording}
              style={{
                padding: "8px 14px",
                fontSize: "0.95rem",
                background: "#3E6DF6",
                color: "#fff",
                borderRadius: "6px",
              }}
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{
                padding: "8px 14px",
                fontSize: "0.95rem",
                background: "#D64545",
                color: "#fff",
                borderRadius: "6px",
              }}
            >
              Stop Recording
            </button>
          )}

          <button
            onClick={transcribeAudio}
            disabled={!audioBlob}
            style={{
              padding: "8px 14px",
              fontSize: "0.95rem",
              background: audioBlob ? "#3E6DF6" : "#9FB4FF",
              color: "#fff",
              borderRadius: "6px",
              cursor: audioBlob ? "pointer" : "not-allowed",
            }}
          >
            Transcribe Audio
          </button>
        </div>

        {loadingTranscript && <div style={{ opacity: 0.7 }}>Transcribing...</div>}

        <h3>Transcript</h3>

        <div className="card" style={{ minHeight: 90, padding: 16 }}>
          {transcript || <span style={{ opacity: 0.6 }}>No transcript yet</span>}
        </div>

        <button
          onClick={analyzeTranscript}
          disabled={!transcript}
          style={{
            padding: "10px 22px",
            background: "#3E6DF6",
            color: "#fff",
            borderRadius: "6px",
          }}
        >
          Analyze with AI
        </button>
      </div>

      {/* RIGHT PANEL — AI OUTPUT */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h2>AI Analysis</h2>

        {loadingAI ? (
          <div className="card" style={{ padding: 16, opacity: 0.8 }}>
            Processing medical interpretation...
          </div>
        ) : (
          <div className="ai-card card">
            {analysis ? (
              <div className="markdown-body">
                <ReactMarkdown>
                  {cleanMarkdown(analysis)}
                </ReactMarkdown>
              </div>
            ) : (
              <span style={{ opacity: 0.6 }}>No analysis yet</span>
            )}
          </div>
        )}

        {similarCases.length > 0 && (
          <div>
            <h3>Similar Cases</h3>
            <div className="card" style={{ padding: 16 }}>
              <ul style={{ paddingLeft: 18 }}>
                {similarCases.map((c, i) => (
                  <li key={i}>
                    <b>Score:</b> {c.score.toFixed(2)}
                    <br />
                    {c.analysis}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {errorMsg && <p style={{ color: "red" }}>Error: {errorMsg}</p>}

        <button
          onClick={resetAll}
          style={{
            background: "#D64545",
            color: "white",
            padding: "10px 18px",
            borderRadius: 8,
          }}
        >
          Clear Session
        </button>
      </div>
    </div>
  );
}

