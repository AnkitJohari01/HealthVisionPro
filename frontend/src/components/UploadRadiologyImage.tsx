import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const safeMarkdown = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return JSON.stringify(value, null, 2);
};


type MultiResult = {
  fileName: string;
  previewUrl: string;
  annotatedImage: string | null;
  annotations: any[];
};

export default function UploadRadiologyImage() {
  const loadSaved = () => {
    try {
      return JSON.parse(sessionStorage.getItem("image_session") || "{}");
    } catch {
      return {};
    }
  };

  const saved = loadSaved();

  const [file, setFile] = useState<File | null>(null);
  const [yoloExplanation, setYoloExplanation] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [multiPreviewImages, setMultiPreviewImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [singleReport, setSingleReport] = useState(saved.report || "");
  const [singleAnnotated, setSingleAnnotated] = useState<string | null>(
    saved.annotatedImage || null
  );
  const [singleAnnotations, setSingleAnnotations] = useState<any[]>(
    saved.annotations || []
  );

  const [combinedReport, setCombinedReport] = useState("");
  const [combinedFindings, setCombinedFindings] = useState<any[]>([]);
  const [multiResults, setMultiResults] = useState<MultiResult[]>([]);

  const multiMode = files.length > 1;

  useEffect(() => {
    if (!saved) return;

    if (saved.files && saved.files.length > 1) {
      setFiles(saved.files);
    }
    if (saved.multiPreviewImages) {
      setMultiPreviewImages(saved.multiPreviewImages);
    }
    if (saved.multiResults) {
      setMultiResults(saved.multiResults);
    }
    if (saved.combinedReport) {
      setCombinedReport(saved.combinedReport);
    }
    if (saved.combinedFindings) {
      setCombinedFindings(saved.combinedFindings);
    }
  }, []);

  useEffect(() => {
    if (multiMode) return;
    sessionStorage.setItem(
      "image_session",
      JSON.stringify({
        report: singleReport,
        annotatedImage: singleAnnotated,
        annotations: singleAnnotations,
      })
    );
  }, [singleReport, singleAnnotated, singleAnnotations, multiMode]);

  useEffect(() => {
    if (!multiMode) return;

    sessionStorage.setItem(
      "image_session",
      JSON.stringify({
        files,
        multiPreviewImages,
        multiResults,
        combinedReport,
        combinedFindings,
      })
    );
  }, [
    multiMode,
    files,
    multiPreviewImages,
    multiResults,
    combinedReport,
    combinedFindings,
  ]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files ? Array.from(e.target.files) : [];

    setFiles(picked);
    setError("");
    setMultiResults([]);
    setCombinedReport("");
    setCombinedFindings([]);

    if (picked.length === 0) {
      setMultiPreviewImages([]);
      return;
    }

    if (picked.length > 1) {
      const previews = picked.map((f) => URL.createObjectURL(f));
      setMultiPreviewImages(previews);
      return;
    }

    setFile(picked[0]);
  }

  async function handleUpload() {
    if (!multiMode) {
      if (!file) return;

      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("http://localhost:8000/analyze/image", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        setSingleReport(data.report);
        setSingleAnnotated(data.annotated_image);
        setSingleAnnotations(data.annotations);
        setYoloExplanation(data.yolo_explanation || "");
      } finally {
        setLoading(false);
      }

      return;
    }

    setLoading(true);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("http://localhost:8000/analyze/images", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      setMultiResults(
        data.images.map((img: any, idx: number) => ({
          fileName: img.filename,
          previewUrl: multiPreviewImages[idx],
          annotatedImage: img.annotated_image,
          annotations: img.findings,
        }))
      );

      setCombinedReport(data.combined_report);
      setCombinedFindings(data.combined_findings);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", width: "100%", gap: 28, padding: 35 }}>
      <div style={{ flex: 1, minWidth: "45%" }}>
        <h2>Upload Scan</h2>

        <input
          type="file"
          accept="image/*"
          multiple
          id="fileInput"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
          <button
            className="primary"
            onClick={() => document.getElementById("fileInput")?.click()}
          >
            Choose File
          </button>

          <button
            className="primary"
            disabled={(!file && !files.length) || loading}
            onClick={handleUpload}
          >
            {loading ? "Processing..." : "Upload & Analyze"}
          </button>
        </div>

        {error && (
          <p style={{ color: "red", marginTop: 5, marginBottom: 10 }}>
            {error}
          </p>
        )}

        {multiMode && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))",
              gap: 18,
            }}
          >
            {multiPreviewImages.map((src, idx) => (
              <img
                key={idx}
                src={src}
                style={{
                  width: "100%",
                  height: 150,
                  objectFit: "cover",
                  borderRadius: 10,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              />
            ))}
          </div>
        )}

        {!multiMode && file && (
          <img
            src={URL.createObjectURL(file)}
            style={{ width: "100%", borderRadius: 10, marginTop: 20 }}
          />
        )}

        {multiMode && multiResults.length > 0 && (
          <div style={{ marginTop: 25 }}>
            {multiResults.map((img, idx) => (
              <div key={idx} style={{ marginBottom: 35 }}>
                <img
                  src={
                    img.annotatedImage
                      ? `data:image/png;base64,${img.annotatedImage}`
                      : img.previewUrl
                  }
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT SIDE PANEL */}
      <div style={{ flex: 1, minWidth: "45%" }}>
        {!multiMode && (
          <>
            <h2>AI Analysis</h2>

            {/* SINGLE REPORT */}
            <div
              className="ai-markdown"
              style={{
                padding: 20,
                borderRadius: 10,
                fontSize: "1.1rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <ReactMarkdown>{singleReport || "AI report will appear here."}</ReactMarkdown>
            </div>

            {/* YOLO EXPLANATION */}
            {yoloExplanation && (
              <div
                className="ai-markdown"
                style={{
                  marginTop: 25,
                  padding: 20,
                  borderRadius: 10,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <ReactMarkdown>{safeMarkdown(yoloExplanation)}</ReactMarkdown>
              </div>
            )}
          </>
        )}

        {/* MULTI MODE OUTPUT */}
        {multiMode && (
          <>
            <h2>AI Analysis</h2>

            <div
              className="ai-markdown"
              style={{
                padding: 20,
                borderRadius: 10,
                fontSize: "1.1rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <ReactMarkdown>{safeMarkdown(combinedReport)}</ReactMarkdown>
            </div>

            {combinedFindings.length > 0 && (
              <div
                style={{
                  marginTop: 25,
                  padding: 20,
                  borderRadius: 10,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <h3>Highlighted Findings</h3>
                <ul>
                  {combinedFindings.map((f, i) => (
                    <li key={i}>
                      <b>{f.label}:</b> {f.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
