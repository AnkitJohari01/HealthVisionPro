// import { useState, useEffect } from "react";
// import ReactMarkdown from "react-markdown";

// export default function RiskPredictor() {
//   const [patientId, setPatientId] = useState("");
//   const [result, setResult] = useState<any>(null);
//   const [details, setDetails] = useState<any>(null);
//   const [loading, setLoading] = useState(false);
//   const [errorMsg, setErrorMsg] = useState("");

//   const [visitCount, setVisitCount] = useState("");
//   const [visitResults, setVisitResults] = useState<any[]>([]);
//   const [visitError, setVisitError] = useState("");

//   // ✅ NEW: model accuracy (ADD ONLY)
//   const [modelAccuracy, setModelAccuracy] = useState<number | null>(null);

//   /* -------------------------------
//         Restore previous session
//   --------------------------------*/
//   useEffect(() => {
//     const saved = sessionStorage.getItem("risk_result");
//     if (saved) {
//       const parsed = JSON.parse(saved);
//       setPatientId(parsed.patientId || "");
//       setResult(parsed.result || null);
//       setDetails(parsed.details || null);
//     }
//   }, []);

//   // ✅ NEW: load model accuracy ONCE (ADD ONLY)
//   useEffect(() => {
//     async function loadAccuracy() {
//       try {
//         const res = await fetch("http://localhost:8000/api/model-metrics");
//         const data = await res.json();
//         setModelAccuracy(Number(data.accuracy)); // backend sends 0–1
//       } catch {
//         // fail silently — do NOT affect existing logic
//       }
//     }

//     loadAccuracy();
//   }, []);

//   /* -------------------------------
//         Predict Risk
//   --------------------------------*/
//   async function predict() {
//     if (!patientId) {
//       setErrorMsg("Please select a patient");
//       return;
//     }

//     setLoading(true);
//     setErrorMsg("");
//     setResult(null);
//     setDetails(null);

//     try {
//       const res = await fetch("http://localhost:8000/api/predict-risk", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ patient_id: patientId }),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.detail || "Prediction failed");

//       const newResult = {
//         prediction: data.prediction,
//         probability: data.probability,
//         top_factors: data.top_factors,
//         summary: data.summary || "",
//         bullets: data.bullets || [],
//       };

//       setResult(newResult);
//       setDetails(data.patient_data || null);

//       sessionStorage.setItem(
//         "risk_result",
//         JSON.stringify({
//           patientId,
//           result: newResult,
//           details: data.patient_data || null,
//         })
//       );
//     } catch (err: any) {
//       setErrorMsg(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   /* -------------------------------
//        Filter by visit count
//   --------------------------------*/
//   async function fetchByVisits() {
//     setVisitError("");
//     setVisitResults([]);

//     try {
//       const res = await fetch(
//         `http://localhost:8000/api/patients/by-visits?count=${visitCount}`
//       );

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.detail || "Failed to fetch");

//       setVisitResults(data.patients || []);
//     } catch (err: any) {
//       setVisitError(err.message);
//     }
//   }

//   /* UI helpers */
//   const blueBtn = {
//     background: "#3E6DF6",
//     color: "white",
//     padding: "12px 16px",
//     borderRadius: 8,
//     marginTop: 10,
//     width: "100%",
//   };

//   const pretty = (label: string) =>
//     label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

//   const followupRecommendation = (patient: any) => {
//     const follow = Number(patient?.target_urgent_followup ?? 0);
//     if (follow === 0) return "No urgent follow-up is needed.";
//     if (follow === 1) return "A follow-up scan is recommended.";
//     return "Urgent follow-up is advised.";
//   };

//   /* ----------------------------
//           RENDER UI
//   -----------------------------*/
//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
//       <h2>Risk Predictor</h2>

//       {/* TOP SECTION */}
//       <div style={{ display: "flex", gap: 20 }}>
//         <div className="card" style={{ flex: 1, padding: 16 }}>
//           <h3>Filter Patients by Visit Count</h3>

//           <input
//             type="number"
//             placeholder="Enter number of visits (e.g., 5)"
//             value={visitCount}
//             onChange={(e) => setVisitCount(e.target.value)}
//             style={{
//               width: "100%",
//               padding: 12,
//               borderRadius: 6,
//               border: "1px solid #ccc",
//             }}
//           />

//           <button onClick={fetchByVisits} style={blueBtn}>
//             Find Patients
//           </button>

//           {visitError && <p style={{ color: "red" }}>{visitError}</p>}
//         </div>

//         <div className="card" style={{ flex: 1, padding: 16 }}>
//           <h3>Patients who visited {visitCount || "X"} times</h3>

//           <select
//             disabled={visitResults.length === 0}
//             onChange={(e) => {
//               setPatientId(e.target.value);
//               setResult(null);
//               setDetails(null);
//             }}
//             style={{
//               width: "100%",
//               padding: 12,
//               borderRadius: 6,
//               border: "1px solid #ccc",
//             }}
//           >
//             <option value="">Select a patient</option>
//             {visitResults.map((p, i) => (
//               <option key={i} value={p.patient_id}>
//                 {p.patient_id} ({p.visit_count} visits)
//               </option>
//             ))}
//           </select>

//           <button
//             onClick={predict}
//             disabled={!patientId}
//             style={{ ...blueBtn, opacity: patientId ? 1 : 0.5 }}
//           >
//             {loading ? "Predicting..." : "Predict Risk"}
//           </button>

//           {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
//         </div>
//       </div>

//       {/* PATIENT DETAILS */}
//       {details && (
//         <div className="card" style={{ padding: 16 }}>
//           <h3>Patient Details</h3>
//           <div
//             style={{
//               display: "grid",
//               gridTemplateColumns: "1fr 1fr",
//               gap: 8,
//             }}
//           >
//             {Object.entries(details).map(([k, v]) => (
//               <div key={k}>
//                 <b>{pretty(k)}:</b> {String(v)}
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* PREDICTION RESULT */}
//       {result && (
//         <div className="card" style={{ padding: 16 }}>
//           <h3>Prediction Result</h3>

//           <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
//             <div className="card" style={{ flex: 1, textAlign: "center" }}>
//               <h4>Risk Class</h4>
//               <p style={{ fontSize: 20, fontWeight: 600 }}>
//                 {result.prediction}
//               </p>
//             </div>

//             <div className="card" style={{ flex: 1, textAlign: "center" }}>
//               <h4>Probability</h4>
//               <p style={{ fontSize: 20, fontWeight: 600 }}>
//                 {(result.probability * 100).toFixed(2)}%
//               </p>
//             </div>

//             {/* ✅ REAL MODEL ACCURACY */}
//             <div className="card" style={{ flex: 1, textAlign: "center" }}>
//               <h4>Accuracy</h4>
//               <p style={{ fontSize: 20, fontWeight: 600 }}>
//                 {modelAccuracy !== null && Number.isFinite(modelAccuracy)
//                   ? `${(modelAccuracy <= 1 ? modelAccuracy * 100 : modelAccuracy).toFixed(2)}%`
//                   : "—"}
//               </p>
//             </div>
//           </div>

//           {result.summary && (
//             <>
//               <h4>Doctor Summary (AI-Generated)</h4>
//               <div
//                 style={{
//                   padding: 12,
//                   borderRadius: 8,
//                   border: "1px solid #dce1ff",
//                 }}
//               >
//                 <ReactMarkdown>{result.summary}</ReactMarkdown>
//               </div>
//             </>
//           )}

//           {result.bullets?.length > 0 && (
//             <>
//               <h4>Key Factors</h4>
//               <ul>
//                 {result.bullets.map((b: string, i: number) => (
//                   <li key={i}>{b}</li>
//                 ))}
//               </ul>
//             </>
//           )}

//           <div style={{ marginTop: 16 }}>
//             <b>Recommendation:</b> {followupRecommendation(details)}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

















































































































// import { useState, useEffect, useMemo } from "react";
// import ReactMarkdown from "react-markdown";

// export default function RiskPredictor() {
//   const [patientId, setPatientId] = useState("");
//   const [result, setResult] = useState<any>(null);
//   const [details, setDetails] = useState<any>(null);
//   const [loading, setLoading] = useState(false);
//   const [errorMsg, setErrorMsg] = useState("");

//   const [visitCount, setVisitCount] = useState("");
//   const [visitResults, setVisitResults] = useState<any[]>([]);
//   const [visitError, setVisitError] = useState("");

//   // UI-only state (UNCHANGED)
//   const [inputValue, setInputValue] = useState("");
//   const [open, setOpen] = useState(false);

//   const [modelAccuracy, setModelAccuracy] = useState<number | null>(null);

//   /* Restore session */
//   useEffect(() => {
//     const saved = sessionStorage.getItem("risk_result");
//     if (saved) {
//       const parsed = JSON.parse(saved);
//       setPatientId(parsed.patientId || "");
//       setResult(parsed.result || null);
//       setDetails(parsed.details || null);
//       setInputValue(parsed.patientId || "");
//     }
//   }, []);

//   /* Load model accuracy */
//   useEffect(() => {
//     async function loadAccuracy() {
//       try {
//         const res = await fetch("http://localhost:8000/api/model-metrics");
//         const data = await res.json();
//         setModelAccuracy(Number(data.accuracy));
//       } catch {}
//     }
//     loadAccuracy();
//   }, []);

//   /* Predict Risk — UNCHANGED */
//   async function predict() {
//     if (!patientId) {
//       setErrorMsg("Please select a patient");
//       return;
//     }

//     setLoading(true);
//     setErrorMsg("");
//     setResult(null);
//     setDetails(null);

//     try {
//       const res = await fetch("http://localhost:8000/api/predict-risk", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ patient_id: patientId }),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.detail || "Prediction failed");

//       const newResult = {
//         prediction: data.prediction,
//         probability: data.probability,
//         top_factors: data.top_factors,
//         summary: data.summary || "",
//         bullets: data.bullets || [],
//       };

//       setResult(newResult);
//       setDetails(data.patient_data || null);

//       sessionStorage.setItem(
//         "risk_result",
//         JSON.stringify({
//           patientId,
//           result: newResult,
//           details: data.patient_data || null,
//         })
//       );
//     } catch (err: any) {
//       setErrorMsg(err.message);
//     } finally {
//       setLoading(false);
//     }
//   }

//   /* Fetch by visit count — UNCHANGED */
//   async function fetchByVisits() {
//     setVisitError("");
//     setVisitResults([]);
//     setInputValue("");
//     setPatientId("");

//     try {
//       const res = await fetch(
//         `http://localhost:8000/api/patients/by-visits?count=${visitCount}`
//       );
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.detail || "Failed to fetch");

//       setVisitResults(data.patients || []);
//     } catch (err: any) {
//       setVisitError(err.message);
//     }
//   }

//   /* Filter logic — UNCHANGED */
//   const filteredPatients = useMemo(() => {
//     const q = inputValue.toLowerCase();
//     return visitResults.filter(
//       (p) =>
//         p.patient_id.toLowerCase().includes(q) ||
//         (p.patient_name || "").toLowerCase().includes(q)
//     );
//   }, [visitResults, inputValue]);

//   /* UI helpers — UNCHANGED */
//   const blueBtn = {
//     background: "#3E6DF6",
//     color: "white",
//     padding: "12px 16px",
//     borderRadius: 8,
//     marginTop: 10,
//     width: "100%",
//   };

//   const pretty = (label: string) =>
//     label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

//   const followupRecommendation = (patient: any) => {
//     const follow = Number(patient?.target_urgent_followup ?? 0);
//     if (follow === 0) return "No urgent follow-up is needed.";
//     if (follow === 1) return "A follow-up scan is recommended.";
//     return "Urgent follow-up is advised.";
//   };

//   /* RENDER */
//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
//       <h2>Risk Predictor</h2>

//       <div style={{ display: "flex", gap: 20 }}>
//         {/* LEFT */}
//         <div className="card" style={{ flex: 1, padding: 16 }}>
//           <h3>Filter Patients by Visit Count</h3>

//           <input
//             type="number"
//             value={visitCount}
//             onChange={(e) => setVisitCount(e.target.value)}
//             placeholder="Enter number of visits (e.g., 5)"
//             style={{ width: "100%", padding: 12, borderRadius: 6 }}
//           />

//           <button onClick={fetchByVisits} style={blueBtn}>
//             Find Patients
//           </button>

//           {visitError && <p style={{ color: "red" }}>{visitError}</p>}
//         </div>

//         {/* RIGHT */}
//         <div
//           className="card"
//           style={{
//             flex: 1,
//             padding: 16,
//             position: "relative", // 🔧 REQUIRED for absolute dropdown
//           }}
//         >
//           <h3>Patients who visited {visitCount || "X"} times</h3>

//           <input
//             placeholder="Search Patient ID or Name"
//             value={inputValue}
//             onChange={(e) => {
//               setInputValue(e.target.value);
//               setOpen(true);
//             }}
//             onFocus={() => setOpen(true)}
//             style={{
//               width: "100%",
//               padding: 12,
//               borderRadius: 6,
//               border: "1px solid var(--card-border)", // 🔧 theme-safe
//               background: "var(--card-bg)",          // 🔧 theme-safe
//               color: "var(--text)",                  // 🔧 theme-safe
//             }}
//           />

//           {/* 🔧 DROPDOWN — CSS FIXED */}
//           {open && filteredPatients.length > 0 && (
//             <div
//               style={{
//                 position: "absolute",
//                 bottom: "100%",          // 🔧 instead of 96
//                 marginBottom: 0,
//                 transform: "translateY(1px)",
//                 left: 0,
//                 right: 0,
//                 maxHeight: 220,
//                 overflowY: "auto",
//                 zIndex: 9999,         // 🔧 critical fix
//                 background: "var(--card-bg)",
//                 border: "1px solid var(--card-border)",
//                 borderRadius: 10,
//                 borderBottom: "none",
//                 boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
//               }}
//             >
//               {filteredPatients.map((p, i) => {
//                 const label = `${p.patient_id} – ${p.patient_name}`;
//                 return (
//                   <div
//                     key={i}
//                     onClick={() => {
//                       setPatientId(p.patient_id); // LOGIC UNCHANGED
//                       setInputValue(label);
//                       setOpen(false);
//                       setResult(null);
//                       setDetails(null);
//                     }}
//                     style={{
//                       padding: "10px 12px",
//                       cursor: "pointer",
//                       color: "var(--text)",
//                       borderBottom: "1px solid var(--card-border)",
//                     }}
//                     onMouseEnter={(e) =>
//                       (e.currentTarget.style.background =
//                         "rgba(74, 99, 255, 0.18)")
//                     }
//                     onMouseLeave={(e) =>
//                       (e.currentTarget.style.background = "transparent")
//                     }
//                   >
//                     {label}
//                   </div>
//                 );
//               })}
//             </div>
//           )}

//           <button
//             onClick={predict}
//             disabled={!patientId}
//             style={{ ...blueBtn, opacity: patientId ? 1 : 0.5 }}
//           >
//             {loading ? "Predicting..." : "Predict Risk"}
//           </button>

//           {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
//         </div>
//       </div>

//       {/* DETAILS */}
//       {details && (
//         <div className="card" style={{ padding: 16 }}>
//           <h3>Patient Details</h3>
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
//             {Object.entries(details).map(([k, v]) => (
//               <div key={k}>
//                 <b>{pretty(k)}:</b> {String(v)}
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* RESULT */}
//       {result && (
//         <div className="card" style={{ padding: 16 }}>
//           <h3>Prediction Result</h3>

//           <div style={{ display: "flex", gap: 16 }}>
//             <div className="card" style={{ flex: 1, textAlign: "center" }}>
//               <h4>Risk Class</h4>
//               <p>{result.prediction}</p>
//             </div>

//             <div className="card" style={{ flex: 1, textAlign: "center" }}>
//               <h4>Probability</h4>
//               <p>{(result.probability * 100).toFixed(2)}%</p>
//             </div>

//             <div className="card" style={{ flex: 1, textAlign: "center" }}>
//               <h4>Accuracy</h4>
//               <p>
//                 {modelAccuracy !== null
//                   ? `${(modelAccuracy * 100).toFixed(2)}%`
//                   : "—"}
//               </p>
//             </div>
//           </div>

//           {result.summary && (
//             <>
//               <h4>Doctor Summary</h4>
//               <ReactMarkdown>{result.summary}</ReactMarkdown>
//             </>
//           )}

//           <div style={{ marginTop: 12 }}>
//             <b>Recommendation:</b> {followupRecommendation(details)}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }





























































































































import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";

export default function RiskPredictor() {
  const [patientId, setPatientId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [visitCount, setVisitCount] = useState("");
  const [visitResults, setVisitResults] = useState<any[]>([]);
  const [visitError, setVisitError] = useState("");

  // UI-only state (UNCHANGED)
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);

  const [modelAccuracy, setModelAccuracy] = useState<number | null>(null);

  /* --------------------------------
     Restore previous session (UNCHANGED)
  --------------------------------- */
  useEffect(() => {
    const saved = sessionStorage.getItem("risk_result");
    if (saved) {
      const parsed = JSON.parse(saved);
      setPatientId(parsed.patientId || "");
      setResult(parsed.result || null);
      setDetails(parsed.details || null);
      setInputValue(parsed.patientId || "");
    }
  }, []);

  /* --------------------------------
     Load model accuracy (UNCHANGED)
  --------------------------------- */
  useEffect(() => {
    async function loadAccuracy() {
      try {
        const res = await fetch("http://localhost:8000/api/model-metrics");
        const data = await res.json();
        setModelAccuracy(Number(data.accuracy));
      } catch {}
    }
    loadAccuracy();
  }, []);

  /* --------------------------------
     🔧 NEW: AUTO FETCH BY VISIT COUNT
     (replaces Find Patients button)
  --------------------------------- */
  useEffect(() => {
    if (!visitCount) {
      setVisitResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/api/patients/by-visits?count=${visitCount}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch");

        setVisitResults(data.patients || []);
        setVisitError("");
      } catch (err: any) {
        setVisitError(err.message);
      }
    }, 400); // debounce

    return () => clearTimeout(timer);
  }, [visitCount]);

  /* --------------------------------
     Predict Risk (UNCHANGED)
  --------------------------------- */
  async function predict() {
    if (!patientId) {
      setErrorMsg("Please select a patient");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setResult(null);
    setDetails(null);

    try {
      const res = await fetch("http://localhost:8000/api/predict-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Prediction failed");

      const newResult = {
        prediction: data.prediction,
        probability: data.probability,
        top_factors: data.top_factors,
        summary: data.summary || "",
        bullets: data.bullets || [],
      };

      setResult(newResult);
      setDetails(data.patient_data || null);

      sessionStorage.setItem(
        "risk_result",
        JSON.stringify({
          patientId,
          result: newResult,
          details: data.patient_data || null,
        })
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* --------------------------------
     Filter dropdown (UNCHANGED)
  --------------------------------- */
  const filteredPatients = useMemo(() => {
    const q = inputValue.toLowerCase();
    return visitResults.filter(
      (p) =>
        p.patient_id.toLowerCase().includes(q) ||
        (p.patient_name || "").toLowerCase().includes(q)
    );
  }, [visitResults, inputValue]);

  /* --------------------------------
     UI helpers (UNCHANGED)
  --------------------------------- */
  const blueBtn = {
    background: "#3E6DF6",
    color: "white",
    padding: "12px 16px",
    borderRadius: 8,
    marginTop: 10,
    width: "100%",
  };

  const pretty = (label: string) =>
    label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const followupRecommendation = (patient: any) => {
    const follow = Number(patient?.target_urgent_followup ?? 0);
    if (follow === 0) return "No urgent follow-up is needed.";
    if (follow === 1) return "A follow-up scan is recommended.";
    return "Urgent follow-up is advised.";
  };

  /* ================================
            RENDER
  ================================ */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h2>Risk Predictor</h2>

      {/* 🔧 SINGLE ROW CONTROLS */}
      <div
        className="card"
        style={{
          padding: 16,
          display: "flex",
          gap: 16,
          alignItems: "flex-end",
          flexWrap: "wrap", // responsive
        }}
      >
        {/* VISIT COUNT */}
        <div style={{ flex: "0 0 220px" }}>
          <label><b>Visit Count</b></label>
          <input
            type="number"
            value={visitCount}
            onChange={(e) => setVisitCount(e.target.value)}
            placeholder="e.g. 4"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--card-border)",
            }}
          />
        </div>

        {/* PATIENT SELECT */}
        <div style={{ flex: 1, position: "relative" }}>
          <label>
            <b>Patients who visited {visitCount || "X"} times</b>
          </label>

          <input
            placeholder="Search Patient ID or Name"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--card-border)",
            }}
          />

          {open && filteredPatients.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                marginTop: 6,
                left: 0,
                right: 0,
                maxHeight: 240,
                overflowY: "auto",
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: 10,
                zIndex: 9999,
                boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
              }}
            >
              {filteredPatients.map((p, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setPatientId(p.patient_id);
                    setInputValue(`${p.patient_id} – ${p.patient_name}`);
                    setOpen(false);
                  }}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--card-border)",
                  }}
                >
                  {p.patient_id} – {p.patient_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PREDICT */}
        <div style={{ flex: "0 0 180px" }}>
          <button
            onClick={predict}
            disabled={!patientId}
            style={{ ...blueBtn, opacity: patientId ? 1 : 0.5 }}
          >
            {loading ? "Predicting..." : "Predict Risk"}
          </button>
        </div>
      </div>

      {/* DETAILS */}
      {details && (
        <div className="card" style={{ padding: 16 }}>
          <h3>Patient Details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(details).map(([k, v]) => (
              <div key={k}>
                <b>{pretty(k)}:</b> {String(v)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULT */}
      {result && (
        <div className="card" style={{ padding: 16 }}>
          <h3>Prediction Result</h3>

          <div style={{ display: "flex", gap: 16 }}>
            <div className="card" style={{ flex: 1, textAlign: "center" }}>
              <h4>Risk Class</h4>
              <p>{result.prediction}</p>
            </div>

            <div className="card" style={{ flex: 1, textAlign: "center" }}>
              <h4>Probability</h4>
              <p>{(result.probability * 100).toFixed(2)}%</p>
            </div>

            <div className="card" style={{ flex: 1, textAlign: "center" }}>
              <h4>Accuracy</h4>
              <p>
                {modelAccuracy !== null
                  ? `${(modelAccuracy * 100).toFixed(2)}%`
                  : "—"}
              </p>
            </div>
          </div>

          {result.summary && (
            <>
              <h4>Doctor Summary</h4>
              <ReactMarkdown>{result.summary}</ReactMarkdown>
            </>
          )}

          <div style={{ marginTop: 12 }}>
            <b>Recommendation:</b> {followupRecommendation(details)}
          </div>
        </div>
      )}
    </div>
  );
}
