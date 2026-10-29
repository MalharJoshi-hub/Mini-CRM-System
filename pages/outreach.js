import { useEffect, useState } from "react";
import Link from "next/link";

export default function OutreachQueue() {
  const [overdueAccounts, setOverdueAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState("");
  const [activeModalCust, setActiveModalCust] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [channel, setChannel] = useState("call");
  const [submitting, setSubmitting] = useState(false);

  const fetchOverdue = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customers/overdue", {
        headers: {
          Authorization: "Bearer " + (localStorage.getItem("token") || ""),
        },
      });
      const data = await res.json();
      setOverdueAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load overdue queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdue();
  }, []);

  const handleQuickLog = async (customer, touchpointChannel, defaultNote) => {
    try {
      const res = await fetch("/api/interactions/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + (localStorage.getItem("token") || ""),
        },
        body: JSON.stringify({
          customer_id: customer.id,
          channel: touchpointChannel,
          notes: defaultNote,
        }),
      });

      if (res.ok) {
        showNotification(`✓ Logged ${touchpointChannel.toUpperCase()} for ${customer.name}`);
        fetchOverdue();
      } else {
        showNotification("Failed to log interaction. Check permissions.");
      }
    } catch (err) {
      showNotification("Error connecting to server.");
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!activeModalCust) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/interactions/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + (localStorage.getItem("token") || ""),
        },
        body: JSON.stringify({
          customer_id: activeModalCust.id,
          channel,
          notes: noteText || `Sales agent check-in via ${channel}`,
        }),
      });

      if (res.ok) {
        showNotification(`✓ Custom touchpoint logged for ${activeModalCust.name}`);
        setActiveModalCust(null);
        setNoteText("");
        fetchOverdue();
      }
    } catch (err) {
      showNotification("Failed to save touchpoint.");
    } finally {
      setSubmitting(false);
    }
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
  };

  return (
    <div style={pageContainer}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={roleBadge}>👤 Sales Agent Cockpit</span>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>• Frontline Outreach Workflow</span>
          </div>
          <h1 style={titleStyle}>Daily Customer Outreach Queue</h1>
          <p style={subtitleStyle}>
            Accounts uncontacted for 7+ days. Keep communication velocity high to prevent accounts from slipping into churn risk.
          </p>
        </div>

        <Link href="/add-customer" style={addLeadBtn}>
          + Onboard New Lead
        </Link>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div style={toastBanner}>
          <span>{notification}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: "flex", gap: 20, marginBottom: 32, flexWrap: "wrap" }}>
        <div style={metricCard}>
          <div style={metricLabel}>Accounts Due for Outreach</div>
          <div style={{ ...metricValue, color: overdueAccounts.length > 0 ? "#ef4444" : "#22c55e" }}>
            {overdueAccounts.length}
          </div>
          <div style={metricSubtext}>Exceeding 7-day touchpoint SLA</div>
        </div>

        <div style={metricCard}>
          <div style={metricLabel}>Outreach Channels Active</div>
          <div style={{ ...metricValue, color: "#3b82f6" }}>Phone, Email, Meeting</div>
          <div style={metricSubtext}>Multi-channel engagement</div>
        </div>

        <div style={metricCard}>
          <div style={metricLabel}>Target Velocity SLA</div>
          <div style={{ ...metricValue, color: "#10b981" }}>&lt; 7 Days</div>
          <div style={metricSubtext}>Maximum uncontacted interval</div>
        </div>
      </div>

      {/* Overdue Accounts Table */}
      <div style={tableContainer}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f9fafb" }}>
            Pending Outreach Targets ({overdueAccounts.length})
          </h3>
          <button onClick={fetchOverdue} style={refreshBtn}>
            ↻ Refresh Queue
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading outreach queue...</div>
        ) : overdueAccounts.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
            <h4 style={{ color: "#f9fafb", margin: "0 0 6px 0" }}>All Caught Up!</h4>
            <p style={{ color: "#9ca3af", margin: 0, fontSize: 14 }}>Every customer account has been contacted within the last 7 days.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <th style={th}>Customer & Company</th>
                <th style={th}>Contact Details</th>
                <th style={th}>Last Contact</th>
                <th style={th}>Dormancy</th>
                <th style={th}>Quick Outreach Action</th>
              </tr>
            </thead>
            <tbody>
              {overdueAccounts.map((c) => {
                const daysDormant = c.last_contact
                  ? Math.floor((new Date() - new Date(c.last_contact)) / (1000 * 60 * 60 * 24))
                  : "N/A";

                return (
                  <tr key={c.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: "#f9fafb" }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{c.company || "Enterprise Account"}</div>
                    </td>
                    <td style={td}>
                      <div style={{ color: "#d1d5db", fontSize: 13 }}>{c.email}</div>
                      <div style={{ color: "#9ca3af", fontSize: 12 }}>{c.phone || "No phone listed"}</div>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 13, color: "#d1d5db" }}>
                        {c.last_contact ? new Date(c.last_contact).toLocaleDateString() : "Never"}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        background: daysDormant > 30 ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        color: daysDormant > 30 ? "#fca5a5" : "#fcd34d",
                      }}>
                        {daysDormant} days ago
                      </span>
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleQuickLog(c, "call", "Outreach check-in call completed by sales agent")}
                          style={actionCallBtn}
                          title="Log quick phone call"
                        >
                          📞 Log Call
                        </button>
                        <button
                          onClick={() => handleQuickLog(c, "email", "Follow-up email dispatched by sales agent")}
                          style={actionEmailBtn}
                          title="Log quick email"
                        >
                          ✉️ Log Email
                        </button>
                        <button
                          onClick={() => {
                            setActiveModalCust(c);
                            setNoteText("");
                          }}
                          style={actionNoteBtn}
                          title="Add detailed note"
                        >
                          📝 Note
                        </button>
                        <Link href={`/customer/${c.id}`} style={timelineLink}>
                          360° View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Custom Note Modal */}
      {activeModalCust && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={{ margin: "0 0 16px 0", color: "#f9fafb" }}>
              Log Touchpoint: {activeModalCust.name}
            </h3>
            <form onSubmit={handleCustomSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Interaction Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  style={inputStyle}
                >
                  <option value="call">Phone Call</option>
                  <option value="email">Email Outreach</option>
                  <option value="meeting">Video / On-Site Meeting</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Discussion Notes & Next Steps</label>
                <textarea
                  rows={4}
                  placeholder="Summarize customer feedback, objections, or scheduled next steps..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  required
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setActiveModalCust(null)}
                  style={cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={saveBtn}
                >
                  {submitting ? "Saving..." : "Save Interaction"}
                </button>
              </div>
            </form>
          </div>
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
  maxWidth: 680,
  lineHeight: 1.5,
};

const roleBadge = {
  background: "rgba(16, 185, 129, 0.15)",
  border: "1px solid rgba(16, 185, 129, 0.3)",
  color: "#6ee7b7",
  fontSize: 12,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: 6,
};

const addLeadBtn = {
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "#ffffff",
  textDecoration: "none",
  padding: "10px 18px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
  transition: "all 0.15s ease",
};

const toastBanner = {
  background: "rgba(16, 185, 129, 0.15)",
  border: "1px solid rgba(16, 185, 129, 0.3)",
  color: "#86efac",
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

const tableContainer = {
  background: "rgba(18, 18, 22, 0.9)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 14,
  overflow: "hidden",
};

const refreshBtn = {
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  color: "#e5e7eb",
  padding: "6px 12px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
};

const th = {
  padding: "14px 20px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const td = {
  padding: "16px 20px",
  fontSize: 14,
  verticalAlign: "middle",
};

const actionCallBtn = {
  background: "rgba(59, 130, 246, 0.15)",
  border: "1px solid rgba(59, 130, 246, 0.3)",
  color: "#93c5fd",
  padding: "6px 12px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

const actionEmailBtn = {
  background: "rgba(139, 92, 246, 0.15)",
  border: "1px solid rgba(139, 92, 246, 0.3)",
  color: "#c4b5fd",
  padding: "6px 12px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

const actionNoteBtn = {
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  color: "#e5e7eb",
  padding: "6px 12px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

const timelineLink = {
  background: "transparent",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  color: "#9ca3af",
  padding: "6px 12px",
  borderRadius: 6,
  textDecoration: "none",
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.75)",
  backdropFilter: "blur(6px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 100,
  padding: 20,
};

const modalCard = {
  background: "#16161c",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 14,
  padding: 28,
  width: "100%",
  maxWidth: 500,
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 500,
  color: "#d1d5db",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "#1e1e26",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 8,
  color: "#f9fafb",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const cancelBtn = {
  background: "rgba(255, 255, 255, 0.08)",
  border: "none",
  color: "#d1d5db",
  padding: "8px 16px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
};

const saveBtn = {
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  border: "none",
  color: "#ffffff",
  padding: "8px 18px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};
