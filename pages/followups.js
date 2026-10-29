import { useEffect, useState } from "react";
import Link from "next/link";

export default function Followups() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [notification, setNotification] = useState("");

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ai/decision", {
        headers: {
          Authorization: "Bearer " + (localStorage.getItem("token") || ""),
        },
      });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch follow-ups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleAction = async (customer, actionName) => {
    try {
      const res = await fetch("/api/followups/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + (localStorage.getItem("token") || ""),
        },
        body: JSON.stringify({ customer_id: customer.id, action: actionName }),
      });

      if (res.ok) {
        showNotification(`✓ Executive action '${actionName}' executed for ${customer.name}`);
        loadTasks();
      } else {
        showNotification("Failed to record intervention action.");
      }
    } catch (err) {
      showNotification("Error executing retention intervention.");
    }
  };

  const pending = tasks.filter((t) => t.ai_action !== "NO_ACTION");
  const filtered = filterLevel === "ALL" ? pending : pending.filter((t) => t.ai_level === filterLevel);

  const criticalCount = pending.filter((t) => t.ai_level === "CRITICAL").length;
  const highCount = pending.filter((t) => t.ai_level === "HIGH").length;
  const escalations = pending.filter((t) => t.ai_action === "ESCALATE_MANAGER").length;

  return (
    <div style={pageContainer}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={managerBadge}>💼 Account Manager Cockpit</span>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>• Churn Mitigation & Executive Retention</span>
          </div>
          <h1 style={titleStyle}>AI Decision Engine & Retention Matrix</h1>
          <p style={subtitleStyle}>
            Algorithmic churn vulnerability analysis. Intervene proactively on accounts exhibiting high inactivity velocity.
          </p>
        </div>

        <button onClick={loadTasks} style={refreshBtn}>
          ↻ Re-calculate AI Models
        </button>
      </div>

      {notification && (
        <div style={toastBanner}>
          <span>{notification}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 20, marginBottom: 32, flexWrap: "wrap" }}>
        <div style={metricCard}>
          <div style={metricLabel}>Critical At-Risk Accounts</div>
          <div style={{ ...metricValue, color: criticalCount > 0 ? "#ef4444" : "#10b981" }}>
            {criticalCount}
          </div>
          <div style={metricSubtext}>Immediate churn danger (&gt;60 days)</div>
        </div>

        <div style={metricCard}>
          <div style={metricLabel}>Executive Escalations</div>
          <div style={{ ...metricValue, color: escalations > 0 ? "#f59e0b" : "#9ca3af" }}>
            {escalations}
          </div>
          <div style={metricSubtext}>Requires manager direct outreach</div>
        </div>

        <div style={metricCard}>
          <div style={metricLabel}>High Priority Pipeline</div>
          <div style={{ ...metricValue, color: "#3b82f6" }}>
            {highCount} Accounts
          </div>
          <div style={metricSubtext}>Scheduled for re-engagement nurture</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={filterBar}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setFilterLevel("ALL")}
            style={filterBtn(filterLevel === "ALL")}
          >
            All Pending ({pending.length})
          </button>
          <button
            onClick={() => setFilterLevel("CRITICAL")}
            style={filterBtn(filterLevel === "CRITICAL")}
          >
            🚨 Critical ({criticalCount})
          </button>
          <button
            onClick={() => setFilterLevel("HIGH")}
            style={filterBtn(filterLevel === "HIGH")}
          >
            ⚠️ High Risk ({highCount})
          </button>
        </div>

        <span style={{ fontSize: 13, color: "#9ca3af" }}>
          Target SLA: Resolve Critical items within 24 hours
        </span>
      </div>

      {/* Tasks Grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>Evaluating predictive models...</div>
      ) : filtered.length === 0 ? (
        <div style={emptyCard}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛡️</div>
          <h3 style={{ color: "#f9fafb", margin: "0 0 6px 0" }}>Portfolio In Good Standing</h3>
          <p style={{ color: "#9ca3af", margin: 0, fontSize: 14 }}>
            No accounts in this category require immediate manager intervention.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {filtered.map((c) => {
            const isCritical = c.ai_level === "CRITICAL";
            const isHigh = c.ai_level === "HIGH";

            return (
              <div
                key={c.id}
                style={{
                  ...taskCard,
                  borderLeft: isCritical ? "5px solid #dc2626" : isHigh ? "5px solid #f97316" : "5px solid #f59e0b",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: 17, fontWeight: 700, color: "#f9fafb" }}>
                      {c.name}
                    </h3>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                      {c.company || "Enterprise Account"} • ID #{c.id}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: isCritical ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                      color: isCritical ? "#fca5a5" : "#fcd34d",
                    }}
                  >
                    {c.ai_level} RISK
                  </span>
                </div>

                {/* Churn & Priority Stats */}
                <div style={statsRow}>
                  <div>
                    <span style={statLabel}>Churn Vulnerability</span>
                    <div style={{ fontWeight: 700, color: c.churn_score >= 50 ? "#ef4444" : "#fcd34d", fontSize: 15 }}>
                      {c.churn_score}%
                    </div>
                  </div>
                  <div>
                    <span style={statLabel}>Days Dormant</span>
                    <div style={{ fontWeight: 600, color: "#f9fafb", fontSize: 15 }}>
                      {c.days_since_contact} days
                    </div>
                  </div>
                  <div>
                    <span style={statLabel}>Priority Score</span>
                    <div style={{ fontWeight: 600, color: "#f9fafb", fontSize: 15 }}>
                      {c.priority_score} pts
                    </div>
                  </div>
                </div>

                {/* AI Rationale */}
                <div style={rationaleBox}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#93c5fd", marginBottom: 4 }}>
                    🤖 AI Decision Rationale
                  </div>
                  <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.4 }}>
                    {c.ai_reason}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  {c.ai_action === "ESCALATE_MANAGER" && (
                    <button
                      onClick={() => handleAction(c, "ESCALATE_MANAGER")}
                      style={escalateActionBtn}
                    >
                      ⚡ Execute Manager Escalation
                    </button>
                  )}

                  {c.ai_action === "CALL_CUSTOMER" && (
                    <button
                      onClick={() => handleAction(c, "CALL_CUSTOMER")}
                      style={callActionBtn}
                    >
                      📞 Direct Account Outreach
                    </button>
                  )}

                  {c.ai_action === "SEND_EMAIL" && (
                    <button
                      onClick={() => handleAction(c, "SEND_EMAIL")}
                      style={emailActionBtn}
                    >
                      ✉️ Trigger Re-engagement
                    </button>
                  )}

                  <Link href={`/customer/${c.id}`} style={timelineActionBtn}>
                    Timeline
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Styling definitions
const pageContainer = {
  padding: "36px 40px",
  background: "#08080a",
  minHeight: "100vh",
  color: "#f3f4f6",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const titleStyle = {
  fontSize: 26,
  fontWeight: 700,
  margin: "0 0 6px 0",
  letterSpacing: "-0.02em",
  color: "#f9fafb",
};

const subtitleStyle = {
  margin: 0,
  fontSize: 14,
  color: "#9ca3af",
  maxWidth: 720,
  lineHeight: 1.5,
};

const managerBadge = {
  background: "rgba(245, 158, 11, 0.15)",
  border: "1px solid rgba(245, 158, 11, 0.3)",
  color: "#fcd34d",
  fontSize: 12,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: 6,
};

const refreshBtn = {
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  color: "#e5e7eb",
  padding: "8px 16px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};

const toastBanner = {
  background: "rgba(59, 130, 246, 0.15)",
  border: "1px solid rgba(59, 130, 246, 0.3)",
  color: "#93c5fd",
  padding: "12px 18px",
  borderRadius: 8,
  marginBottom: 24,
  fontSize: 14,
  fontWeight: 500,
};

const metricCard = {
  flex: "1 1 240px",
  background: "rgba(18, 18, 22, 0.9)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 12,
  padding: "20px 24px",
};

const metricLabel = {
  fontSize: 13,
  fontWeight: 500,
  color: "#9ca3af",
  marginBottom: 8,
};

const metricValue = {
  fontSize: 24,
  fontWeight: 700,
  marginBottom: 4,
};

const metricSubtext = {
  fontSize: 12,
  color: "#6b7280",
};

const filterBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
  flexWrap: "wrap",
  gap: 12,
};

const filterBtn = (active) => ({
  background: active ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.04)",
  border: active ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
  color: active ? "#fcd34d" : "#9ca3af",
  padding: "8px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: active ? 600 : 500,
});

const taskCard = {
  background: "rgba(18, 18, 22, 0.92)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 12,
  padding: 22,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const statsRow = {
  display: "flex",
  justifyContent: "space-between",
  background: "#16161b",
  padding: "10px 14px",
  borderRadius: 8,
  marginBottom: 14,
};

const statLabel = {
  display: "block",
  fontSize: 11,
  color: "#9ca3af",
  marginBottom: 2,
};

const rationaleBox = {
  background: "rgba(30, 41, 59, 0.45)",
  border: "1px solid rgba(59, 130, 246, 0.2)",
  borderRadius: 8,
  padding: 12,
};

const escalateActionBtn = {
  flex: 1,
  background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
  border: "none",
  color: "#ffffff",
  padding: "9px 14px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const callActionBtn = {
  flex: 1,
  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
  border: "none",
  color: "#ffffff",
  padding: "9px 14px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const emailActionBtn = {
  flex: 1,
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  border: "none",
  color: "#ffffff",
  padding: "9px 14px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const timelineActionBtn = {
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  color: "#d1d5db",
  padding: "9px 14px",
  borderRadius: 6,
  textDecoration: "none",
  fontSize: 13,
  display: "inline-flex",
  alignItems: "center",
};

const emptyCard = {
  background: "rgba(18, 18, 22, 0.9)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 14,
  padding: 60,
  textAlign: "center",
};