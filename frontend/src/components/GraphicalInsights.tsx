// import { useEffect, useState } from "react";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   PieChart,
//   Pie,
//   Cell,
//   Legend,
//   RadialBarChart,
//   RadialBar,
//   ResponsiveContainer,
// } from "recharts";

// export default function GraphicalInsights() {
//   const [visitData, setVisitData] = useState<any[]>([]);
//   const [riskData, setRiskData] = useState<any[]>([]);
//   const [heartData, setHeartData] = useState<any[]>([]);
//   const [smokingData, setSmokingData] = useState<any[]>([]);
//   const [diabetesData, setDiabetesData] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     async function loadFromCSV() {
//       setLoading(true);
//       setError(null);

//       try {
//         const res = await fetch("/healthvisionpro_dataset_300.csv");
//         if (!res.ok) throw new Error(`CSV load error: ${res.status}`);

//         const csvText = await res.text();
//         const lines = csvText.trim().split(/\r?\n/);
//         if (lines.length <= 1) return;

//         const headers = lines[0].split(",");

//         const visitIdx = headers.findIndex((h) => h.trim() === "patients_visited");
//         const riskIdx = headers.findIndex((h) => h.trim() === "target_urgent_followup");

//         const heartIdx = headers.findIndex((h) => h.trim() === "heart_disease");
//         const smokeIdx = headers.findIndex((h) => h.trim() === "smoking_status");
//         const diabetesIdx = headers.findIndex((h) => h.trim() === "diabetes");

//         if (visitIdx === -1 || riskIdx === -1)
//           throw new Error("Required columns not found in CSV");

//         const visitCounts: Record<string, number> = {};
//         let lowRisk = 0,
//           highRisk = 0;

//         let heart0 = 0,
//           heart1 = 0;

//         let smokeNever = 0,
//           smokeFormer = 0,
//           smokeCurrent = 0;

//         let diab0 = 0,
//           diab1 = 0;

//         for (let i = 1; i < lines.length; i++) {
//           const row = lines[i].split(",");
//           if (row.length <= Math.max(visitIdx, riskIdx)) continue;

//           const visits = Number(row[visitIdx]);
//           const risk = Number(row[riskIdx]);

//           if (!Number.isNaN(visits)) {
//             const key = String(visits);
//             visitCounts[key] = (visitCounts[key] || 0) + 1;
//           }

//           if (risk === 0) lowRisk++;
//           if (risk === 1) highRisk++;

//           if (heartIdx >= 0) {
//             const val = Number(row[heartIdx]);
//             if (val === 0) heart0++;
//             if (val === 1) heart1++;
//           }

//           if (smokeIdx >= 0) {
//             const val = row[smokeIdx].trim().toLowerCase();
//             if (val === "never") smokeNever++;
//             if (val === "former") smokeFormer++;
//             if (val === "current") smokeCurrent++;
//           }

//           if (diabetesIdx >= 0) {
//             const val = Number(row[diabetesIdx]);
//             if (val === 0) diab0++;
//             if (val === 1) diab1++;
//           }
//         }

//         setVisitData(
//           Object.keys(visitCounts)
//             .map((v) => ({ visits: v, patients: visitCounts[v] }))
//             .sort((a, b) => Number(a.visits) - Number(b.visits))
//         );

//         setRiskData([
//           { name: "Low Risk", value: lowRisk },
//           { name: "High Risk", value: highRisk },
//         ]);

//         setHeartData([
//           { name: "No Heart Disease", value: heart0 },
//           { name: "Heart Disease", value: heart1 },
//         ]);

//         setSmokingData([
//           { name: "Never Smoked", value: smokeNever },
//           { name: "Former Smoker", value: smokeFormer },
//           { name: "Current Smoker", value: smokeCurrent },
//         ]);

//         setDiabetesData([
//           { name: "No Diabetes", value: diab0 },
//           { name: "Diabetic", value: diab1 },
//         ]);
//       } catch (e: any) {
//         setError(e.message || "Failed to load CSV data");
//       } finally {
//         setLoading(false);
//       }
//     }

//     loadFromCSV();
//   }, []);

//   return (
//     <div className="card graph-root">
//       <h2>Graphical Insights</h2>
//       <p className="graph-subtitle">
//         Visual showing how risk and key factors change across your patients.
//       </p>

//       {loading && <div className="graph-loading">Loading graphs...</div>}
//       {error && <div className="graph-error">{error}</div>}

//       {!loading && !error && (
//         <>
//           {/* ================= OVERVIEW ================= */}
//           <section className="graph-section">
//             <h3 className="graph-section-title">Patient Distribution Overview</h3>

//             <div className="graph-row">
//               <div className="graph-box">
//                 <h4>Visit Count Distribution</h4>
//                 <BarChart width={650} height={300} data={visitData}>
//                   <XAxis dataKey="visits" />
//                   <YAxis />
//                   <Tooltip />
//                   <Bar dataKey="patients" fill="#4A63FF" />
//                 </BarChart>
//               </div>

//               <div className="graph-box">
//                 <h4>Risk Class Distribution</h4>

//                 <PieChart width={420} height={300} style={{ overflow: "visible" }}>
//                   <Pie
//                     data={riskData}
//                     dataKey="value"
//                     nameKey="name"
//                     cx="55%"
//                     cy="50%"
//                     innerRadius={55}
//                     outerRadius={95}
//                     paddingAngle={3}
//                     label={({ name, value }) => `${name}: ${value}`}
//                   >
//                     <Cell fill="#4CAF50" />
//                     <Cell fill="#E53935" />
//                   </Pie>

//                   <Tooltip />
//                   <Legend />
//                 </PieChart>
//               </div>
//             </div>
//           </section>

//           {/* ================= HEALTH INDICATORS ================= */}
//           <section className="graph-section">
//             <h3 className="graph-section-title">Health Indicators</h3>

//             <div className="graph-row">

//               {/* ❤️ CLEAN VERTICAL BAR CHART FOR HEART DISEASE */}
//               <div className="graph-box">
//                 <h4>Heart Disease Distribution</h4>

//                 <ResponsiveContainer width="100%" height={260}>
//                   <BarChart
//                     data={[
//                       {
//                         category: "Heart Disease",
//                         count: heartData[1]?.value || 0,
//                       },
//                       {
//                         category: "No Heart Disease",
//                         count: heartData[0]?.value || 0,
//                       },
//                     ]}
//                     margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
//                   >
//                     <XAxis dataKey="category" />
//                     <YAxis />
//                     <Tooltip />

//                     <Bar
//                       dataKey="count"
//                       fill="#4A63FF"
//                       radius={[6, 6, 0, 0]}
//                       barSize={70}
//                     />
//                   </BarChart>
//                 </ResponsiveContainer>

//                 <p style={{ marginTop: "10px", fontSize: "16px", fontWeight: 600 }}>
//                   💚 No Heart Disease: {heartData[0]?.value || 0}
//                 </p>
//                 <p style={{ marginTop: "5px", fontSize: "16px", fontWeight: 600 }}>
//                   ❤️ Heart Disease: {heartData[1]?.value || 0}
//                 </p>
//               </div>

//               {/* 🚬 SMOKING */}
//               <div className="graph-box">
//                 <h4>Smoking Status</h4>

//                 <RadialBarChart
//                   width={420}
//                   height={300}
//                   cx="50%"
//                   cy="50%"
//                   innerRadius="10%"
//                   outerRadius="85%"
//                   data={smokingData.map((d, i) => ({
//                     name: d.name,
//                     value: d.value,
//                     fill: ["#FFB74D", "#FB8C00", "#E65100"][i],
//                   }))}
//                 >
//                   <RadialBar dataKey="value" fillOpacity={0.9} />
//                   <Legend iconSize={12} layout="horizontal" verticalAlign="bottom" />
//                   <Tooltip />
//                 </RadialBarChart>
//               </div>

//               {/* 💉 DIABETES */}
//               <div className="graph-box">
//                 <h4>Diabetes Distribution</h4>

//                 <PieChart width={420} height={300} style={{ overflow: "visible" }}>
//                   <Pie
//                     data={diabetesData}
//                     dataKey="value"
//                     nameKey="name"
//                     cx="55%"
//                     cy="50%"
//                     outerRadius={95}
//                     paddingAngle={3}
//                     label={({ name, value }) => `${name}: ${value}`}
//                   >
//                     {diabetesData.map((_, i) => (
//                       <Cell key={i} fill={i === 0 ? "#81C784" : "#388E3C"} />
//                     ))}
//                   </Pie>

//                   <Tooltip formatter={(v, n) => [`${v}`, n]} />
//                   <Legend />
//                 </PieChart>
//               </div>

//             </div>
//           </section>
//         </>
//       )}
//     </div>
//   );
// }

















































































































// import { useEffect, useState } from "react";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   PieChart,
//   Pie,
//   Cell,
//   Legend,
//   RadialBarChart,
//   RadialBar,
//   ResponsiveContainer,
// } from "recharts";

// export default function GraphicalInsights() {
//   const [visitData, setVisitData] = useState<any[]>([]);
//   const [riskData, setRiskData] = useState<any[]>([]);
//   const [heartData, setHeartData] = useState<any[]>([]);
//   const [smokingData, setSmokingData] = useState<any[]>([]);
//   const [diabetesData, setDiabetesData] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     async function loadFromCSV() {
//       setLoading(true);
//       setError(null);

//       try {
//         const res = await fetch("/healthvisionpro_dataset_1000.csv");
//         if (!res.ok) throw new Error(`CSV load error: ${res.status}`);

//         const csvText = await res.text();
//         const lines = csvText.trim().split(/\r?\n/);
//         if (lines.length <= 1) return;

//         const headers = lines[0].split(",");

//         const visitIdx = headers.findIndex((h) => h.trim() === "patients_visited");
//         const riskIdx = headers.findIndex((h) => h.trim() === "target_urgent_followup");

//         const heartIdx = headers.findIndex((h) => h.trim() === "heart_disease");
//         const smokeIdx = headers.findIndex((h) => h.trim() === "smoking_status");
//         const diabetesIdx = headers.findIndex((h) => h.trim() === "diabetes");

//         if (visitIdx === -1 || riskIdx === -1)
//           throw new Error("Required columns not found in CSV");

//         const visitCounts: Record<string, number> = {};
//         let lowRisk = 0,
//           highRisk = 0;

//         let heart0 = 0,
//           heart1 = 0;

//         let smokeNever = 0,
//           smokeFormer = 0,
//           smokeCurrent = 0;

//         let diab0 = 0,
//           diab1 = 0;

//         for (let i = 1; i < lines.length; i++) {
//           const row = lines[i].split(",");
//           if (row.length <= Math.max(visitIdx, riskIdx)) continue;

//           const visits = Number(row[visitIdx]);
//           const risk = Number(row[riskIdx]);

//           if (!Number.isNaN(visits)) {
//             const key = String(visits);
//             visitCounts[key] = (visitCounts[key] || 0) + 1;
//           }

//           if (risk === 0) lowRisk++;
//           if (risk === 1) highRisk++;

//           if (heartIdx >= 0) {
//             const val = Number(row[heartIdx]);
//             if (val === 0) heart0++;
//             if (val === 1) heart1++;
//           }

//           if (smokeIdx >= 0) {
//             const val = row[smokeIdx].trim().toLowerCase();
//             if (val === "never") smokeNever++;
//             if (val === "former") smokeFormer++;
//             if (val === "current") smokeCurrent++;
//           }

//           if (diabetesIdx >= 0) {
//             const val = Number(row[diabetesIdx]);
//             if (val === 0) diab0++;
//             if (val === 1) diab1++;
//           }
//         }

//         setVisitData(
//           Object.keys(visitCounts)
//             .map((v) => ({ visits: v, patients: visitCounts[v] }))
//             .sort((a, b) => Number(a.visits) - Number(b.visits))
//         );

//         setRiskData([
//           { name: "Low Risk", value: lowRisk },
//           { name: "High Risk", value: highRisk },
//         ]);

//         setHeartData([
//           { name: "No Heart Disease", value: heart0 },
//           { name: "Heart Disease", value: heart1 },
//         ]);

//         setSmokingData([
//           { name: "Never Smoked", value: smokeNever },
//           { name: "Former Smoker", value: smokeFormer },
//           { name: "Current Smoker", value: smokeCurrent },
//         ]);

//         setDiabetesData([
//           { name: "No Diabetes", value: diab0 },
//           { name: "Diabetic", value: diab1 },
//         ]);
//       } catch (e: any) {
//         setError(e.message || "Failed to load CSV data");
//       } finally {
//         setLoading(false);
//       }
//     }

//     loadFromCSV();
//   }, []);

//   return (
//     <div className="card graph-root">
//       <h2>Graphical Insights</h2>
//       <p className="graph-subtitle">
//         Visual showing how risk and key factors change across your patients.
//       </p>

//       {loading && <div className="graph-loading">Loading graphs...</div>}
//       {error && <div className="graph-error">{error}</div>}

//       {!loading && !error && (
//         <>
//           {/* ================= OVERVIEW ================= */}
//           <section className="graph-section">
//             <h3 className="graph-section-title">Patient Distribution Overview</h3>

//             <div className="graph-row">
//               <div className="graph-box">
//                 <h4>Visit Count Distribution</h4>
//                 <BarChart width={650} height={300} data={visitData}>
//                   <XAxis dataKey="visits" />
//                   <YAxis />
//                   <Tooltip />
//                   <Bar dataKey="patients" fill="#4A63FF" />
//                 </BarChart>
//               </div>

//               <div className="graph-box">
//                 <h4>Risk Class Distribution</h4>

//                 <PieChart width={420} height={300} style={{ overflow: "visible" }}>
//                   <Pie
//                     data={riskData}
//                     dataKey="value"
//                     nameKey="name"
//                     cx="55%"
//                     cy="50%"
//                     innerRadius={55}
//                     outerRadius={95}
//                     paddingAngle={3}
//                     label={({ name, value }) => `${name}: ${value}`}
//                   >
//                     <Cell fill="#4CAF50" />
//                     <Cell fill="#E53935" />
//                   </Pie>

//                   <Tooltip />
//                   <Legend />
//                 </PieChart>
//               </div>
//             </div>
//           </section>

//           {/* ================= HEALTH INDICATORS ================= */}
//           <section className="graph-section">
//             <h3 className="graph-section-title">Health Indicators</h3>

//             <div className="graph-row">

//               {/* ❤️ CLEAN VERTICAL BAR CHART */}
//               <div className="graph-box">
//                 <h4>Heart Disease Distribution</h4>

//                 <ResponsiveContainer width="100%" height={260}>
//                   <BarChart
//                     data={[
//                       { category: "Heart Disease", count: heartData[1]?.value || 0 },
//                       { category: "No Heart Disease", count: heartData[0]?.value || 0 },
//                     ]}
//                     margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
//                   >
//                     <XAxis dataKey="category" />
//                     <YAxis />
//                     <Tooltip />
//                     <Bar dataKey="count" fill="#4A63FF" radius={[6, 6, 0, 0]} barSize={70} />
//                   </BarChart>
//                 </ResponsiveContainer>

//                 <p style={{ marginTop: "10px", fontSize: "16px", fontWeight: 600 }}>
//                   💚 No Heart Disease: {heartData[0]?.value || 0}
//                 </p>
//                 <p style={{ marginTop: "5px", fontSize: "16px", fontWeight: 600 }}>
//                   ❤️ Heart Disease: {heartData[1]?.value || 0}
//                 </p>
//               </div>

//               {/* 🚬 SMOKING — NOW WITH LABELS */}
//               <div className="graph-box">
//                 <h4>Smoking Status</h4>

//                 <RadialBarChart
//                   width={420}
//                   height={300}
//                   cx="50%"
//                   cy="50%"
//                   innerRadius="10%"
//                   outerRadius="85%"
//                   data={smokingData.map((d, i) => ({
//                     name: d.name,
//                     value: d.value,
//                     fill: ["#FFB74D", "#FB8C00", "#E65100"][i],
//                   }))}
//                 >
//                   <RadialBar
//                     dataKey="value"
//                     fillOpacity={0.9}
//                     label={{ position: "insideStart", fill: "#fff", fontSize: 14 }}
//                   />

//                   <Legend iconSize={12} layout="horizontal" verticalAlign="bottom" />
//                   <Tooltip />
//                 </RadialBarChart>
//               </div>

//               {/* 💉 DIABETES */}
//               <div className="graph-box">
//                 <h4>Diabetes Distribution</h4>

//                 <PieChart width={420} height={300} style={{ overflow: "visible" }}>
//                   <Pie
//                     data={diabetesData}
//                     dataKey="value"
//                     nameKey="name"
//                     cx="55%"
//                     cy="50%"
//                     outerRadius={95}
//                     paddingAngle={3}
//                     label={({ name, value }) => `${name}: ${value}`}
//                   >
//                     {diabetesData.map((_, i) => (
//                       <Cell key={i} fill={i === 0 ? "#81C784" : "#388E3C"} />
//                     ))}
//                   </Pie>

//                   <Tooltip formatter={(v, n) => [`${v}`, n]} />
//                   <Legend />
//                 </PieChart>
//               </div>

//             </div>
//           </section>
//         </>
//       )}
//     </div>
//   );
// }





































































































import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from "recharts";

export default function GraphicalInsights() {
  const [visitData, setVisitData] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any[]>([]);
  const [heartData, setHeartData] = useState<any[]>([]);
  const [smokingData, setSmokingData] = useState<any[]>([]);
  const [diabetesData, setDiabetesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFromCSV() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/healthvisionpro_dataset_1000.csv");
        if (!res.ok) throw new Error(`CSV load error: ${res.status}`);

        const csvText = await res.text();
        const lines = csvText.trim().split(/\r?\n/);
        if (lines.length <= 1) return;

        /* ===== HEADER NORMALIZATION (SAFE, NO LOGIC CHANGE) ===== */
        const rawHeaders = lines[0].split(",");
        const headers = rawHeaders.map((h) =>
          h.replace(/\uFEFF/g, "").trim().toLowerCase()
        );

        const visitIdx = headers.indexOf("patients_visited");
        const riskIdx = headers.indexOf("target_urgent_followup");
        const heartIdx = headers.indexOf("heart_disease");
        const smokeIdx = headers.indexOf("smoking_status");
        const diabetesIdx = headers.indexOf("diabetes");

        if (visitIdx === -1 || riskIdx === -1) {
          throw new Error("Required columns not found in CSV");
        }

        /* ===== ORIGINAL LOGIC (UNCHANGED) ===== */
        const visitCounts: Record<string, number> = {};
        let lowRisk = 0,
          highRisk = 0;

        let heart0 = 0,
          heart1 = 0;

        let smokeNever = 0,
          smokeFormer = 0,
          smokeCurrent = 0;

        let diab0 = 0,
          diab1 = 0;

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(",");

          const visits = Number(row[visitIdx]);
          const risk = Number(row[riskIdx]);

          if (!Number.isNaN(visits)) {
            const key = String(visits);
            visitCounts[key] = (visitCounts[key] || 0) + 1;
          }

          if (risk === 0) lowRisk++;
          if (risk === 1) highRisk++;

          if (heartIdx >= 0) {
            const val = Number(row[heartIdx]);
            if (val === 0) heart0++;
            if (val === 1) heart1++;
          }

          if (smokeIdx >= 0) {
            const val = row[smokeIdx]?.trim().toLowerCase();
            if (val === "never") smokeNever++;
            if (val === "former") smokeFormer++;
            if (val === "current") smokeCurrent++;
          }

          if (diabetesIdx >= 0) {
            const val = Number(row[diabetesIdx]);
            if (val === 0) diab0++;
            if (val === 1) diab1++;
          }
        }

        setVisitData(
          Object.keys(visitCounts)
            .map((v) => ({ visits: v, patients: visitCounts[v] }))
            .sort((a, b) => Number(a.visits) - Number(b.visits))
        );

        setRiskData([
          { name: "Low Risk", value: lowRisk },
          { name: "High Risk", value: highRisk },
        ]);

        setHeartData([
          { name: "No Heart Disease", value: heart0 },
          { name: "Heart Disease", value: heart1 },
        ]);

        setSmokingData([
          { name: "Never Smoked", value: smokeNever },
          { name: "Former Smoker", value: smokeFormer },
          { name: "Current Smoker", value: smokeCurrent },
        ]);

        setDiabetesData([
          { name: "No Diabetes", value: diab0 },
          { name: "Diabetic", value: diab1 },
        ]);
      } catch (e: any) {
        setError(e.message || "Failed to load CSV data");
      } finally {
        setLoading(false);
      }
    }

    loadFromCSV();
  }, []);

  return (
    <div className="card graph-root">
      <h2>Graphical Insights</h2>
      <p className="graph-subtitle">
        Visual showing how risk and key factors change across your patients.
      </p>

      {loading && <div className="graph-loading">Loading graphs...</div>}
      {error && <div className="graph-error">{error}</div>}

      {!loading && !error && (
        <>
          {/* ================= OVERVIEW ================= */}
          <section className="graph-section">
            <h3 className="graph-section-title">Patient Distribution Overview</h3>

            <div className="graph-row">
              <div className="graph-box">
                <h4>Visit Count Distribution</h4>
                <BarChart width={650} height={300} data={visitData}>
                  <XAxis dataKey="visits" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="patients" fill="#4A63FF" />
                </BarChart>
              </div>

              <div className="graph-box">
                <h4>Risk Class Distribution</h4>
                <PieChart width={420} height={300} style={{ overflow: "visible" }}>
                  <Pie
                    data={riskData}
                    dataKey="value"
                    nameKey="name"
                    cx="55%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    <Cell fill="#4CAF50" />
                    <Cell fill="#E53935" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </div>
            </div>
          </section>

          {/* ================= HEALTH INDICATORS ================= */}
          <section className="graph-section">
            <h3 className="graph-section-title">Health Indicators</h3>

            <div className="graph-row">
              <div className="graph-box">
                <h4>Heart Disease Distribution</h4>

                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={[
                      { category: "Heart Disease", count: heartData[1]?.value || 0 },
                      { category: "No Heart Disease", count: heartData[0]?.value || 0 },
                    ]}
                  >
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#4A63FF"
                      radius={[6, 6, 0, 0]}
                      barSize={70}
                    />
                  </BarChart>
                </ResponsiveContainer>

                <p style={{ marginTop: "10px", fontSize: "16px", fontWeight: 600 }}>
                  💚 No Heart Disease: {heartData[0]?.value || 0}
                </p>
                <p style={{ marginTop: "5px", fontSize: "16px", fontWeight: 600 }}>
                  ❤️ Heart Disease: {heartData[1]?.value || 0}
                </p>
              </div>

              <div className="graph-box">
                <h4>Smoking Status</h4>

                <RadialBarChart
                  width={420}
                  height={300}
                  cx="50%"
                  cy="50%"
                  innerRadius="10%"
                  outerRadius="85%"
                  data={smokingData.map((d, i) => ({
                    name: d.name,
                    value: d.value,
                    fill: ["#FFB74D", "#FB8C00", "#E65100"][i],
                  }))}
                >
                  <RadialBar
                    dataKey="value"
                    fillOpacity={0.9}
                    label={{ position: "insideStart", fill: "#fff", fontSize: 14 }}
                  />
                  <Legend iconSize={12} layout="horizontal" verticalAlign="bottom" />
                  <Tooltip />
                </RadialBarChart>
              </div>

              <div className="graph-box">
                <h4>Diabetes Distribution</h4>

                <PieChart width={420} height={300} style={{ overflow: "visible" }}>
                  <Pie
                    data={diabetesData}
                    dataKey="value"
                    nameKey="name"
                    cx="55%"
                    cy="50%"
                    outerRadius={95}
                    paddingAngle={3}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {diabetesData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#81C784" : "#388E3C"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
