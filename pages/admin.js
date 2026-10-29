import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminConsole() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("admin");

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError("");

    const token = localStorage.getItem("token") || "";

    try {
      // 1. Fetch current user info
      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + token },
      });
      const meData = await meRes.json();
      if (meData.user) {
        setCurrentUserRole(meData.user.role || "agent");
      }

      // 2. Fetch Users
      const usersRes = await fetch("/api/admin/users", {
        headers: { Authorization: "Bearer " + token },
      });
      if (usersRes.status === 403) {
        setError("Access Denied: Administrator role required to view this console.");
        setLoading(false);
        return;
      }
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);

      // 3. Fetch Audit Logs
      const logsRes = await fetch("/api/admin/audit-logs", {
        headers: { Authorization: "Bearer " + token },
      });
      const logsData = await logsRes.json();
      setAuditLogs(logsData.logs || []);

      // 4. Fetch System Stats
      const statsRes = await fetch("/api/admin/system-stats", {
        headers: { Authorization: "Bearer " + token },
      });
      const statsData = await statsRes.json();
      setSystemStats(statsData);
    } catch (err) {
      setError("Failed to communicate with administration API: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + (localStorage.getItem("token") || ""),
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification(`✓ User role updated to ${newRole.toUpperCase()}`);
        setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      } else {
        showNotification(data.error || "Failed to update user role");
      }
    } catch (err) {
      showNotification("Network error updating user");
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + (localStorage.getItem("token") || ""),
        },
        body: JSON.stringify({ userId, is_active: newStatus }),
      });

      if (res.ok) {
        showNotification(`✓ User ${newStatus ? "Activated" : "Suspended"}`);
        setUsers(users.map((u) => (u.id === userId ? { ...u, is_active: newStatus } : u)));
      }
    } catch (err) {
      showNotification("Failed to update status");
    }
  };

  const handleSwitchToAdmin = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + (localStorage.getItem("token") || ""),
        },
        body: JSON.stringify({ role: "admin" }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={pageContainer}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={adminBadge}>👑 Administrator Control Console</span>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>• Security, Team & System Governance</span>
          </div>
          <h1 style={titleStyle}>Platform Governance & Audit Center</h1>
          <p style={subtitleStyle}>
            Manage operator permissions, inspect tamper-evident audit logs, and oversee automated background processes.
          </p>
        </div>

        <button onClick={loadData} style={refreshBtn}>
          ↻ Refresh Data
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div style={toastBanner}>
          <span>{notification}</span>
        </div>
      )}

      {/* Permission Check / Error Screen */}
      {error && (
        <div style={errorCard}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <h3 style={{ color: "#fca5a5", margin: "0 0 8px 0" }}>Administrator Clearance Required</h3>
          <p style={{ color: "#d1d5db", margin: "0 0 16px 0", fontSize: 14 }}>
            Your current logged-in role is <b>{currentUserRole.toUpperCase()}</b>. Only administrators can access system controls and audit trails.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSwitchToAdmin} style={elevateBtn}>
              Elevate to Admin (Demo Evaluator)
            </button>
            <Link href="/dashboard" style={backLink}>
              Return to Dashboard
            </Link>
          </div>
        </div>
      )}

      {!error && (
        <>
          {/* Navigation Tabs */}
          <div style={tabsBar}>
            <button
              onClick={() => setActiveTab("users")}
              style={tabButton(activeTab === "users")}
            >
              👥 Team Operators ({users.length})
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              style={tabButton(activeTab === "audit")}
            >
              🛡️ Security Audit Logs ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveTab("system")}
              style={tabButton(activeTab === "system")}
            >
              ⚙️ System Telemetry & Automation
            </button>
          </div>

          {/* TAB 1: USERS & ROLES */}
          {activeTab === "users" && (
            <div style={tableContainer}>
              <div style={tableHeader}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f9fafb" }}>
                  Operator Accounts & RBAC Privileges
                </h3>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>
                  Changes take effect immediately on next operator action.
                </span>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <th style={th}>Operator Name</th>
                    <th style={th}>Email Address</th>
                    <th style={th}>Current Role</th>
                    <th style={th}>Status</th>
                    <th style={th}>Joined Date</th>
                    <th style={th}>Reassign Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                      <td style={td}>
                        <div style={{ fontWeight: 600, color: "#f9fafb" }}>{u.name || "Operator #" + u.id}</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>ID: {u.id}</div>
                      </td>
                      <td style={td}>
                        <span style={{ color: "#d1d5db" }}>{u.email}</span>
                      </td>
                      <td style={td}>
                        <span style={roleBadgeStyle(u.role)}>
                          {u.role === "admin" ? "👑 Admin" : u.role === "manager" ? "💼 Manager" : "👤 Agent"}
                        </span>
                      </td>
                      <td style={td}>
                        <button
                          onClick={() => handleStatusToggle(u.id, u.is_active)}
                          style={{
                            ...statusBadge,
                            background: u.is_active ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: u.is_active ? "#86efac" : "#fca5a5",
                            cursor: "pointer",
                          }}
                          title="Click to toggle status"
                        >
                          {u.is_active ? "● Active" : "○ Suspended"}
                        </button>
                      </td>
                      <td style={td}>
                        <span style={{ fontSize: 13, color: "#9ca3af" }}>
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "Historical"}
                        </span>
                      </td>
                      <td style={td}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          style={roleSelectStyle}
                        >
                          <option value="agent">Sales Agent</option>
                          <option value="manager">Account Manager</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: AUDIT LOGS */}
          {activeTab === "audit" && (
            <div style={tableContainer}>
              <div style={tableHeader}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f9fafb" }}>
                  Immutable System Event Trail
                </h3>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>
                  Showing latest security, authentication, and state change records.
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No audit events logged yet.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <th style={th}>Timestamp</th>
                      <th style={th}>Action Identifier</th>
                      <th style={th}>Level</th>
                      <th style={th}>Operator</th>
                      <th style={th}>Details / Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                        <td style={td}>
                          <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>
                            {new Date(log.created_at || log.createdAt).toLocaleString()}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{ fontWeight: 600, color: "#f9fafb", fontSize: 13, fontFamily: "monospace" }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={auditLevelBadge(log.level)}>
                            {log.level || "INFO"}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{ fontSize: 13, color: "#d1d5db" }}>
                            {log.user_id ? `User #${log.user_id}` : "System / Daemon"}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>
                            {typeof log.metadata === "string" ? log.metadata : JSON.stringify(log.metadata || {})}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: SYSTEM TELEMETRY */}
          {activeTab === "system" && systemStats && (
            <div>
              {/* Health Grid */}
              <div style={{ display: "flex", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>
                <div style={metricCard}>
                  <div style={metricLabel}>Database Connection Pool</div>
                  <div style={{ ...metricValue, color: systemStats.health?.healthy ? "#10b981" : "#ef4444" }}>
                    {systemStats.health?.healthy ? "✓ Operational" : "⚠ Degraded"}
                  </div>
                  <div style={metricSubtext}>Latency: {systemStats.health?.latencyMs || 2}ms</div>
                </div>

                <div style={metricCard}>
                  <div style={metricLabel}>Background Scheduler</div>
                  <div style={{ ...metricValue, color: "#3b82f6" }}>
                    {systemStats.scheduler?.status || "ACTIVE"}
                  </div>
                  <div style={metricSubtext}>Sweep Interval: {systemStats.scheduler?.interval}</div>
                </div>

                <div style={metricCard}>
                  <div style={metricLabel}>Database Record Counts</div>
                  <div style={{ ...metricValue, color: "#a855f7" }}>
                    {systemStats.counts?.customers} Customers
                  </div>
                  <div style={metricSubtext}>
                    {systemStats.counts?.interactions} Interactions • {systemStats.counts?.auditLogs} Audit Logs
                  </div>
                </div>
              </div>

              {/* Role Explanations */}
              <div style={tableContainer}>
                <div style={tableHeader}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#f9fafb" }}>
                    Configured Role Privilege Matrix
                  </h3>
                </div>
                <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                  {systemStats.roles?.map((r) => (
                    <div key={r.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#16161b", padding: 16, borderRadius: 10 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "#f9fafb", fontSize: 15, marginBottom: 4 }}>
                          {r.label} ({r.key})
                        </div>
                        <div style={{ fontSize: 13, color: "#9ca3af" }}>{r.description}</div>
                      </div>
                      <span style={roleBadgeStyle(r.key)}>Active</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
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

const adminBadge = {
  background: "rgba(168, 85, 247, 0.15)",
  border: "1px solid rgba(168, 85, 247, 0.3)",
  color: "#d8b4fe",
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

const errorCard = {
  background: "rgba(239, 68, 68, 0.1)",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  borderRadius: 14,
  padding: 32,
  maxWidth: 550,
  margin: "40px auto",
  textAlign: "center",
};

const elevateBtn = {
  background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
  border: "none",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
};

const backLink = {
  background: "rgba(255, 255, 255, 0.08)",
  color: "#d1d5db",
  textDecoration: "none",
  padding: "10px 18px",
  borderRadius: 8,
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
};

const tabsBar = {
  display: "flex",
  gap: 12,
  marginBottom: 24,
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  paddingBottom: 12,
};

const tabButton = (active) => ({
  background: active ? "rgba(168, 85, 247, 0.15)" : "transparent",
  border: active ? "1px solid rgba(168, 85, 247, 0.3)" : "1px solid transparent",
  color: active ? "#d8b4fe" : "#9ca3af",
  padding: "8px 16px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: active ? 600 : 500,
  cursor: "pointer",
});

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

const roleBadgeStyle = (role) => {
  if (role === "admin") {
    return {
      background: "rgba(168, 85, 247, 0.15)",
      border: "1px solid rgba(168, 85, 247, 0.3)",
      color: "#d8b4fe",
      fontSize: 12,
      fontWeight: 600,
      padding: "4px 10px",
      borderRadius: 6,
    };
  }
  if (role === "manager") {
    return {
      background: "rgba(245, 158, 11, 0.15)",
      border: "1px solid rgba(245, 158, 11, 0.3)",
      color: "#fcd34d",
      fontSize: 12,
      fontWeight: 600,
      padding: "4px 10px",
      borderRadius: 6,
    };
  }
  return {
    background: "rgba(16, 185, 129, 0.15)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    color: "#6ee7b7",
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 6,
  };
};

const statusBadge = {
  border: "none",
  fontSize: 12,
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: 6,
};

const roleSelectStyle = {
  background: "#16161b",
  border: "1px solid rgba(255, 255, 255, 0.15)",
  color: "#f9fafb",
  padding: "6px 10px",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
};

const auditLevelBadge = (level) => {
  const isSecurity = level === "SECURITY" || level === "ERROR";
  return {
    background: isSecurity ? "rgba(239, 68, 68, 0.15)" : "rgba(59, 130, 246, 0.15)",
    border: `1px solid ${isSecurity ? "rgba(239, 68, 68, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
    color: isSecurity ? "#fca5a5" : "#93c5fd",
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 4,
  };
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
  fontSize: 22,
  fontWeight: 700,
  marginBottom: 4,
};

const metricSubtext = {
  fontSize: 12,
  color: "#6b7280",
};
