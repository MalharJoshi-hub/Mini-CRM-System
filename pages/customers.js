import { useEffect, useState } from "react";
import Link from "next/link";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [userRole, setUserRole] = useState("agent");
  const [notification, setNotification] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token") || "";

      // 1. Fetch user role
      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + token },
      });
      const meData = await meRes.json();
      if (meData.user) {
        setUserRole(meData.user.role || "agent");
      }

      // 2. Fetch customer analytics
      const res = await fetch("/api/ai/decision", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load customer list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete '${name}'? This action is restricted to administrators.`)) {
      return;
    }

    try {
      const res = await fetch("/api/customers/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + (localStorage.getItem("token") || ""),
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (res.ok) {
        setNotification(`✓ Customer '${name}' permanently removed by administrator.`);
        setCustomers(customers.filter((c) => c.id !== id));
      } else {
        setNotification(data.error || "Deletion denied. Administrator role required.");
      }
    } catch (err) {
      setNotification("Failed to delete customer record.");
    }
  };

  return (
    <div style={pageContainer}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={catalogBadge}>📂 Enterprise Directory</span>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>
              Active Role: <b>{userRole.toUpperCase()}</b>
            </span>
          </div>
          <h1 style={titleStyle}>Customer Account Catalog</h1>
          <p style={subtitleStyle}>
            Comprehensive account registry showing touchpoints, priority scoring, predictive churn risk, and timeline records.
          </p>
        </div>

        <Link href="/add-customer" style={addBtn}>
          + Add New Account
        </Link>
      </div>

      {notification && (
        <div style={toastBanner}>
          <span>{notification}</span>
        </div>
      )}

      <div style={tableContainer}>
        <div style={tableHeader}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f9fafb" }}>
            Accounts ({customers.length})
          </h3>
          {userRole === "admin" && (
            <span style={{ fontSize: 12, color: "#d8b4fe", background: "rgba(168, 85, 247, 0.15)", padding: "3px 8px", borderRadius: 4 }}>
              👑 Admin Deletion Privileges Enabled
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading customer accounts...</div>
        ) : customers.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No customer records found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <th style={th}>Account ID</th>
                <th style={th}>Customer Name</th>
                <th style={th}>Last Contact</th>
                <th style={th}>Interactions</th>
                <th style={th}>Priority</th>
                <th style={th}>Churn Risk</th>
                <th style={th}>AI Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                  <td style={td}>
                    <span style={{ fontFamily: "monospace", color: "#9ca3af", fontSize: 13 }}>#{c.id}</span>
                  </td>
                  <td style={td}>
                    <div style={{ fontWeight: 600, color: "#f9fafb" }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{c.email}</div>
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 13, color: "#d1d5db" }}>
                      {c.last_contact ? new Date(c.last_contact).toLocaleDateString() : "Never"}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={metricBadge}>{c.interaction_count} touchpoints</span>
                  </td>
                  <td style={td}>
                    <span style={{ fontWeight: 600, color: c.priority_score >= 15 ? "#ef4444" : "#f9fafb" }}>
                      {c.priority_score} pts
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ fontWeight: 600, color: c.churn_score >= 50 ? "#ef4444" : "#10b981" }}>
                      {c.churn_score}%
                    </span>
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        background:
                          c.ai_level === "CRITICAL"
                            ? "rgba(220, 38, 38, 0.15)"
                            : c.ai_level === "HIGH"
                            ? "rgba(239, 68, 68, 0.15)"
                            : c.ai_level === "MEDIUM"
                            ? "rgba(245, 158, 11, 0.15)"
                            : "rgba(34, 197, 94, 0.15)",
                        color:
                          c.ai_level === "CRITICAL"
                            ? "#fca5a5"
                            : c.ai_level === "HIGH"
                            ? "#fca5a5"
                            : c.ai_level === "MEDIUM"
                            ? "#fcd34d"
                            : "#86efac",
                      }}
                    >
                      {c.ai_level}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <Link href={`/customer/${c.id}`} style={timelineBtn}>
                        360° Timeline
                      </Link>

                      {/* Hard Delete button is strictly gated for Administrators */}
                      {userRole === "admin" && (
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          style={deleteBtn}
                          title="Administrator Hard Delete"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
  maxWidth: 700,
  lineHeight: 1.5,
};

const catalogBadge = {
  background: "rgba(59, 130, 246, 0.15)",
  border: "1px solid rgba(59, 130, 246, 0.3)",
  color: "#93c5fd",
  fontSize: 12,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: 6,
};

const addBtn = {
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#ffffff",
  textDecoration: "none",
  padding: "10px 18px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
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

const tableContainer = {
  background: "rgba(18, 18, 22, 0.9)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 14,
  overflow: "hidden",
};

const tableHeader = {
  padding: "18px 24px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
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

const metricBadge = {
  background: "rgba(255, 255, 255, 0.06)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  color: "#d1d5db",
  fontSize: 12,
  padding: "2px 8px",
  borderRadius: 4,
};

const timelineBtn = {
  background: "rgba(59, 130, 246, 0.12)",
  border: "1px solid rgba(59, 130, 246, 0.25)",
  color: "#93c5fd",
  padding: "6px 12px",
  borderRadius: 6,
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 600,
};

const deleteBtn = {
  background: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "#fca5a5",
  padding: "6px 12px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};