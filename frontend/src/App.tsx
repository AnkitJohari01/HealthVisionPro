// import { useState, useEffect } from "react";
// import UploadRadiologyImage from "./components/UploadRadiologyImage";
// import VoiceAssistant from "./components/VoiceAssistant";
// import History from "./components/History";
// import RiskPredictor from "./components/RiskPredictor";
// import { useTheme } from "./theme/ThemeContext";

// type SettingsSection = "about" | "contact" | "help" | "terms";

// export default function App() {
//   const getStoredState = () => {
//     try {
//       const raw = sessionStorage.getItem("app_state");
//       if (!raw) return {};
//       return JSON.parse(raw);
//     } catch {
//       return {};
//     }
//   };

//   const stored = getStoredState() as any;

//   const [activeTab, setActiveTab] = useState<
//     "upload" | "voice" | "history" | "settings" | "predict"
//   >(() => stored.activeTab || "upload");

//   const [settingsSection, setSettingsSection] =
//     useState<SettingsSection>("about");

//   const { theme, setTheme } = useTheme();

//   useEffect(() => {
//     try {
//       sessionStorage.setItem(
//         "app_state",
//         JSON.stringify({ activeTab, settingsSection })
//       );
//     } catch {}
//   }, [activeTab, settingsSection]);

//   return (
//     <div className="wrapper">
//       {/* HEADER */}
//       <header
//         style={{
//           marginBottom: 10,
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//         }}
//       >
//         {/* LEFT */}
//         <div>
//           <h1 style={{ marginBottom: 4 }}>HealthVisionPro</h1>
//           <div style={{ opacity: 0.7 }}>
//             AI Radiology • Voice Diagnosis • Patient Insights
//           </div>
//         </div>

//         {/* RIGHT ICON GROUP */}
//         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
//           {/* THEME TOGGLE */}
//           <button
//             onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
//             title="Toggle light / dark mode"
//             style={{
//               padding: "10px 12px",
//               borderRadius: "8px",
//               fontSize: "18px",
//               cursor: "pointer",
//             }}
//           >
//             {theme === "dark" ? "☀️" : "🌙"}
//           </button>

//           {/* SETTINGS + HOVER MENU */}
//           <div className="settings-wrapper">
//             <button
//               onClick={() => {
//                 setActiveTab("settings");
//                 setSettingsSection("about");
//               }}
//               style={{
//                 padding: "10px 14px",
//                 borderRadius: "8px",
//                 fontWeight: 600,
//               }}
//             >
//               ⚙
//             </button>

//             <div className="settings-menu">
//               <div
//                 onClick={() => {
//                   setActiveTab("settings");
//                   setSettingsSection("about");
//                 }}
//               >
//                 About
//               </div>
//               <div
//                 onClick={() => {
//                   setActiveTab("settings");
//                   setSettingsSection("contact");
//                 }}
//               >
//                 Contact Us
//               </div>
//               <div
//                 onClick={() => {
//                   setActiveTab("settings");
//                   setSettingsSection("help");
//                 }}
//               >
//                 Help
//               </div>
//               <div
//                 onClick={() => {
//                   setActiveTab("settings");
//                   setSettingsSection("terms");
//                 }}
//               >
//                 Terms & Policies
//               </div>
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* TABS */}
//       <nav className="tabs">
//         <div
//           className={`tab ${activeTab === "upload" ? "active" : ""}`}
//           onClick={() => setActiveTab("upload")}
//         >
//           Upload & Analyze
//         </div>

//         <div
//           className={`tab ${activeTab === "voice" ? "active" : ""}`}
//           onClick={() => setActiveTab("voice")}
//         >
//           Voice Assistant
//         </div>

//         <div
//           className={`tab ${activeTab === "history" ? "active" : ""}`}
//           onClick={() => setActiveTab("history")}
//         >
//           History
//         </div>

//         <div
//           className={`tab ${activeTab === "predict" ? "active" : ""}`}
//           onClick={() => setActiveTab("predict")}
//         >
//           Risk Predictor
//         </div>
//       </nav>

//       {/* CONTENT */}
//       <main style={{ marginTop: 20 }}>
//         {activeTab === "upload" && (
//           <div className="card">
//             <UploadRadiologyImage />
//           </div>
//         )}

//         {activeTab === "voice" && (
//           <div className="card">
//             <VoiceAssistant />
//           </div>
//         )}

//         {activeTab === "history" && (
//           <div className="card">
//             <History />
//           </div>
//         )}

//         {activeTab === "predict" && (
//           <div className="card">
//             <RiskPredictor />
//           </div>
//         )}

//         {/* SETTINGS CONTENT */}
//         {activeTab === "settings" && (
//           <div className="card">
//             {settingsSection === "about" && (
//               <>
//                 <h2>About HealthVisionPro</h2>
//                 <p>
//                   HealthVisionPro is an AI-powered healthcare assistant designed
//                   to support radiology analysis, voice-based diagnostics, and
//                   patient risk prediction.
//                 </p>
//                 <p>
//                   It helps surface meaningful insights while keeping clinicians
//                   in full control of medical decisions.
//                 </p>
//               </>
//             )}

//             {settingsSection === "contact" && (
//               <>
//                 <h2>Contact Us</h2>
//                 <p>Email: support@healthvisionpro.ai</p>
//                 <p>For technical or product-related queries, reach out anytime.</p>
//               </>
//             )}

//             {settingsSection === "help" && (
//               <>
//                 <h2>Help</h2>
//                 <p>
//                   Use the tabs to navigate features. Patient risk predictions
//                   are AI-assisted and meant for clinical support.
//                 </p>
//                 <p>If something feels unclear, we’re here to help.</p>
//               </>
//             )}

//             {settingsSection === "terms" && (
//               <>
//                 <h2>Terms & Policies</h2>
//                 <p>
//                   HealthVisionPro is intended for informational and clinical
//                   support only. It does not replace professional medical
//                   judgment.
//                 </p>
//                 <p>
//                   Data privacy and responsible AI usage are core to our design.
//                 </p>
//               </>
//             )}
//           </div>
//         )}
//       </main>
//     </div>
//   );
// }




































































import { useState, useEffect } from "react";
import UploadRadiologyImage from "./components/UploadRadiologyImage";
import VoiceAssistant from "./components/VoiceAssistant";
import History from "./components/History";
import GraphicalInsights from "./components/GraphicalInsights";
import RiskPredictor from "./components/RiskPredictor";
import { useTheme } from "./theme/ThemeContext";

type SettingsSection = "about" | "contact" | "help" | "terms";

export default function App() {
  const getStoredState = () => {
    try {
      const raw = sessionStorage.getItem("app_state");
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  };

  const stored = getStoredState() as any;

  // ✅ ADD "graphs" (no logic change)
  const [activeTab, setActiveTab] = useState<
    "upload" | "voice" | "history" | "graphs" | "settings" | "predict"
  >(() => stored.activeTab || "upload");


  const [settingsSection, setSettingsSection] =
    useState<SettingsSection>("about");

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "app_state",
        JSON.stringify({ activeTab, settingsSection })
      );
    } catch {}
  }, [activeTab, settingsSection]);

  return (
    <div className="wrapper">
      {/* HEADER */}
      <header
        style={{
          marginBottom: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 4 }}>HealthVisionPro</h1>
          <div style={{ opacity: 0.7 }}>
            AI Radiology • Voice Diagnosis • Patient Insights
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle light / dark mode"
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          <div className="settings-wrapper">
            <button
              onClick={() => {
                setActiveTab("settings");
                setSettingsSection("about");
              }}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              ⚙
            </button>

            <div className="settings-menu">
              <div onClick={() => { setActiveTab("settings"); setSettingsSection("about"); }}>About</div>
              <div onClick={() => { setActiveTab("settings"); setSettingsSection("contact"); }}>Contact Us</div>
              <div onClick={() => { setActiveTab("settings"); setSettingsSection("help"); }}>Help</div>
              <div onClick={() => { setActiveTab("settings"); setSettingsSection("terms"); }}>Terms & Policies</div>
            </div>
          </div>
        </div>
      </header>

      {/* TABS */}
      <nav className="tabs">
        <div className={`tab ${activeTab === "upload" ? "active" : ""}`} onClick={() => setActiveTab("upload")}>
          Upload & Analyze
        </div>

        <div className={`tab ${activeTab === "voice" ? "active" : ""}`} onClick={() => setActiveTab("voice")}>
          Voice Assistant
        </div>

        <div className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          History
        </div>

        {/* ✅ NEW TAB */}
        <div className={`tab ${activeTab === "graphs" ? "active" : ""}`} onClick={() => setActiveTab("graphs")}>
          Graphical Insights
        </div>

        <div className={`tab ${activeTab === "predict" ? "active" : ""}`} onClick={() => setActiveTab("predict")}>
          Risk Predictor
        </div>
      </nav>

      {/* CONTENT */}
      <main style={{ marginTop: 20 }}>
        {activeTab === "upload" && <div className="card"><UploadRadiologyImage /></div>}
        {activeTab === "voice" && <div className="card"><VoiceAssistant /></div>}
        {activeTab === "history" && <div className="card"><History /></div>}
        {activeTab === "graphs" && <div className="card"><GraphicalInsights /></div>}
        {activeTab === "predict" && <div className="card"><RiskPredictor /></div>}

        {activeTab === "settings" && (
          <div className="card">
            {settingsSection === "about" && (
              <>
                <h2>About HealthVisionPro</h2>
                <p>HealthVisionPro is an AI-powered healthcare assistant.</p>
              </>
            )}
            {settingsSection === "contact" && <p>Email: support@healthvisionpro.ai</p>}
            {settingsSection === "help" && <p>Use tabs to navigate features.</p>}
            {settingsSection === "terms" && <p>For clinical support only.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
