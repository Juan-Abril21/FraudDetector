import { useState, useRef } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000/predict";

const KAGGLE_SAMPLE = {
  normal: {
    Time: 406, V1: -1.3598071, V2: -0.0727812, V3: 2.5363467, V4: 1.3781553,
    V5: -0.3383208, V6: 0.4623878, V7: 0.2395986, V8: 0.0986979,
    V9: 0.3637870, V10: 0.0907942, V11: -0.5515995, V12: -0.6178009,
    V13: -0.9913898, V14: -0.3111694, V15: 1.4681770, V16: -0.4704005,
    V17: 0.2079709, V18: 0.0257906, V19: 0.4039936, V20: 0.2514121,
    V21: -0.0183068, V22: 0.2778376, V23: -0.1104740, V24: 0.0669281,
    V25: 0.1285394, V26: -0.1891093, V27: 0.1335584, V28: -0.0210530,
    Amount: 149.62,
  },
  suspicious: {
    Time: 406, V1: -3.0435406, V2: -3.1572081, V3: 1.0888809, V4: 2.2886436,
    V5: 1.3597843, V6: -1.0664534, V7: 0.9257636, V8: -0.2818408,
    V9: -0.4463591, V10: -4.9778928, V11: 2.3347659, V12: -6.7218934,
    V13: 0.2882374, V14: -9.1570110, V15: -0.1635476, V16: -2.5959285,
    V17: -7.5633966, V18: 2.1420649, V19: 0.4827623, V20: 0.4277422,
    V21: 0.4726985, V22: -0.1839547, V23: -0.4277264, V24: -0.5357408,
    V25: -0.2024282, V26: -0.1660564, V27: -0.1481793, V28: 0.0579888,
    Amount: 239.93,
  },
};

const initialForm = {
  Time: 10000, Amount: 100,
  V1: 0, V2: 0, V3: 0, V4: 0, V5: 0, V6: 0, V7: 0,
  V8: 0, V9: 0, V10: 0, V11: 0, V12: 0, V13: 0, V14: 0,
  V15: 0, V16: 0, V17: 0, V18: 0, V19: 0, V20: 0, V21: 0,
  V22: 0, V23: 0, V24: 0, V25: 0, V26: 0, V27: 0, V28: 0,
};

const statusConfig = {
  APPROVED: { color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", label: "Approved", icon: "✓" },
  REVIEW:   { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Under Review", icon: "⚠" },
  BLOCKED:  { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Blocked", icon: "✕" },
};

function RiskBar({ score }) {
  const pct = Math.round(score * 100);
  const color = score < 0.3 ? "#059669" : score < 0.7 ? "#d97706" : "#dc2626";
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>Risk Score</span>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999, transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
    </div>
  );
}

function StatusBadge({ decision }) {
  const cfg = statusConfig[decision];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 999,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: 12, fontWeight: 600, letterSpacing: "0.04em",
    }}>
      <span style={{ fontSize: 11 }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#f3f4f6", margin: "20px 0" }} />;
}

export default function App() {
  const [formData, setFormData] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("manual");
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: parseFloat(e.target.value) || 0 });
  };

  const loadSample = (type) => {
    setFormData(KAGGLE_SAMPLE[type]);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (data = formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(API_URL, data);
      const res = response.data;
      setResult(res);
      setTransactions((prev) => [
        { ...res, amount: data.Amount, ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) },
        ...prev.slice(0, 49),
      ]);
    } catch {
      setError("Could not reach the API. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines = ev.target.result.trim().split("\n");
        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
        const rows = lines.slice(1).map((line) => {
          const vals = line.split(",");
          return Object.fromEntries(headers.map((h, i) => [h, parseFloat(vals[i])]));
        });
        if (rows.length > 0) {
          setFormData(rows[0]);
          setActiveTab("manual");
          setError(null);
        }
      } catch {
        setError("Could not parse CSV. Make sure it matches the Kaggle creditcard.csv format.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const vFields = Array.from({ length: 28 }, (_, i) => `V${i + 1}`);

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", height: 60, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 4V7C13 10.3 10.3 13 7 13C3.7 13 1 10.3 1 7V4L7 1Z" stroke="white" strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M4.5 7L6.2 8.7L9.5 5.3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontWeight: 600, fontSize: 15, color: "#111827", letterSpacing: "-0.01em" }}>FraudShield</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 2px #d1fae5" }} />
            <span style={{ fontSize: 12, color: "#6b7280" }}>API Connected</span>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>

        {/* LEFT: Input */}
        <div>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>

            {/* Card header */}
            <div style={{ padding: "20px 24px 0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#111827", letterSpacing: "-0.01em" }}>Transaction Analysis</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>Enter transaction features or load a sample</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => loadSample("normal")} style={{ padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#374151", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                    Load Normal
                  </button>
                  <button onClick={() => loadSample("suspicious")} style={{ padding: "6px 12px", border: "1px solid #fecaca", borderRadius: 7, background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                    Load Suspicious
                  </button>
                  <button onClick={() => fileRef.current.click()} style={{ padding: "6px 12px", border: "1px solid #e5e7eb", borderRadius: 7, background: "#fff", color: "#374151", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                    Upload CSV
                  </button>
                  <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFileUpload} />
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, marginTop: 18, borderBottom: "1px solid #f3f4f6" }}>
                {["manual", "json"].map((t) => (
                  <button key={t} onClick={() => setActiveTab(t)} style={{
                    padding: "8px 14px", border: "none", background: "transparent",
                    borderBottom: activeTab === t ? "2px solid #111827" : "2px solid transparent",
                    color: activeTab === t ? "#111827" : "#9ca3af",
                    fontSize: 13, fontWeight: activeTab === t ? 600 : 400,
                    cursor: "pointer", marginBottom: -1, textTransform: "capitalize",
                  }}>
                    {t === "manual" ? "Manual Input" : "JSON View"}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div style={{ padding: "20px 24px 24px" }}>
              {activeTab === "manual" && (
                <>
                  {/* Main fields */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                    {["Time", "Amount"].map((key) => (
                      <div key={key}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>{key}</label>
                        <input type="number" step="any" name={key} value={formData[key]} onChange={handleChange}
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, color: "#111827", background: "#fff", boxSizing: "border-box", outline: "none" }} />
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>PCA Components (V1–V28)</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {vFields.map((key) => (
                      <div key={key}>
                        <label style={{ display: "block", fontSize: 11, color: "#9ca3af", marginBottom: 3, fontWeight: 500 }}>{key}</label>
                        <input type="number" step="any" name={key} value={formData[key]} onChange={handleChange}
                          style={{ width: "100%", padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, color: "#374151", background: "#fafafa", boxSizing: "border-box", outline: "none" }} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeTab === "json" && (
                <div>
                  <textarea
                    value={JSON.stringify(formData, null, 2)}
                    onChange={(e) => {
                      try { setFormData(JSON.parse(e.target.value)); } catch {}
                    }}
                    style={{ width: "100%", height: 320, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, fontFamily: "monospace", color: "#374151", background: "#fafafa", resize: "vertical", boxSizing: "border-box", outline: "none" }}
                  />
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "8px 0 0" }}>Edit JSON directly to update the form</p>
                </div>
              )}

              {error && (
                <div style={{ marginTop: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626" }}>
                  {error}
                </div>
              )}

              <button onClick={() => handleSubmit()} disabled={loading}
                style={{
                  marginTop: 20, width: "100%", padding: "11px", border: "none",
                  borderRadius: 8, background: loading ? "#e5e7eb" : "#111827",
                  color: loading ? "#9ca3af" : "#fff", fontSize: 14, fontWeight: 600,
                  cursor: loading ? "default" : "pointer", letterSpacing: "-0.01em",
                  transition: "background 0.15s",
                }}>
                {loading ? "Analyzing…" : "Analyze Transaction"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Result + History */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Result card */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 24 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#111827", letterSpacing: "-0.01em" }}>Detection Result</h2>

            {result ? (
              <>
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  {(() => {
                    const cfg = statusConfig[result.decision];
                    return (
                      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 52, height: 52, borderRadius: "50%", background: cfg.bg, border: `2px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: cfg.color }}>
                          {cfg.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: cfg.color, letterSpacing: "-0.02em" }}>{cfg.label}</div>
                          <StatusBadge decision={result.decision} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <RiskBar score={result.risk_score} />
                <Divider />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ padding: "10px 12px", background: "#fafafa", borderRadius: 8, border: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 3 }}>Score</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{(result.risk_score * 100).toFixed(2)}%</div>
                  </div>
                  <div style={{ padding: "10px 12px", background: "#fafafa", borderRadius: 8, border: "1px solid #f3f4f6" }}>
                    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 3 }}>Decision</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{result.decision}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, padding: "10px 12px", background: "#fafafa", borderRadius: 8, border: "1px solid #f3f4f6", fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                  {result.decision === "APPROVED" && "Score below 0.30. Transaction is within normal risk parameters."}
                  {result.decision === "REVIEW" && "Score between 0.30–0.70. Additional verification recommended."}
                  {result.decision === "BLOCKED" && "Score above 0.70. Transaction flagged as high-risk and blocked."}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#d1d5db" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>◎</div>
                <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>No transaction analyzed yet</p>
              </div>
            )}
          </div>

          {/* Summary stats */}
          {transactions.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "#111827", letterSpacing: "-0.01em" }}>Session Summary</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {["APPROVED", "REVIEW", "BLOCKED"].map((d) => {
                  const cfg = statusConfig[d];
                  const count = transactions.filter((t) => t.decision === d).length;
                  return (
                    <div key={d} style={{ textAlign: "center", padding: "10px 4px", background: cfg.bg, borderRadius: 8, border: `1px solid ${cfg.border}` }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: cfg.color }}>{count}</div>
                      <div style={{ fontSize: 10, color: cfg.color, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.8 }}>{d}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* History */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827", letterSpacing: "-0.01em" }}>Recent Transactions</h2>
              {transactions.length > 0 && (
                <button onClick={() => setTransactions([])} style={{ padding: "3px 8px", border: "1px solid #e5e7eb", borderRadius: 5, background: "#fff", color: "#9ca3af", fontSize: 11, cursor: "pointer" }}>Clear</button>
              )}
            </div>

            {transactions.length === 0 ? (
              <div style={{ padding: "24px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No transactions yet</div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {transactions.map((tx, i) => {
                  const cfg = statusConfig[tx.decision];
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", padding: "11px 20px", borderBottom: i < transactions.length - 1 ? "1px solid #f9fafb" : "none", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: cfg.color, flexShrink: 0 }}>
                        {cfg.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>${typeof tx.amount === 'number' ? tx.amount.toFixed(2) : tx.amount}</span>
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>{tx.ts}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>{(tx.risk_score * 100).toFixed(1)}% risk</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}