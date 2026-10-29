import { useEffect, useState } from "react";

export default function Dashboard() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetch("/api/ai/decision", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    })
      .then((res) => res.json())
      .then((data) => setCustomers(data));
  }, []);

  const total = customers.length;
  const highPriority = customers.filter(c => c.priority_score >= 15).length;
  const callsNeeded = customers.filter(c => c.ai_action === "CALL_CUSTOMER").length;
  const emailsNeeded = customers.filter(c => c.ai_action === "SEND_EMAIL").length;
  const escalations = customers.filter(c => c.ai_action === "ESCALATE_MANAGER").length;
  const highChurn = customers.filter(c => c.ai_level === "HIGH").length;
  const mediumChurn = customers.filter(c => c.ai_level === "MEDIUM").length;

  const handleAction = async (id, action) => {
    await fetch("/api/followups/action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ customer_id: id, action })
    });

    window.location.reload();
  };

  return (
    <div style={{ padding: 40, background: "#0b0b0b", minHeight: "100vh", color: "white" }}>
      <h2>CRM Intelligence Dashboard</h2>

      {/* KPI CARDS */}
      <div style={{ display: "flex", gap: 20, marginBottom: 40, flexWrap: "wrap" }}>
        <Card title="Total Customers" value={total} color="#3b82f6" />
        <Card title="High Priority" value={highPriority} color="#ef4444" />
        <Card title="Calls Needed" value={callsNeeded} color="#f97316" />
        <Card title="Emails Needed" value={emailsNeeded} color="#22c55e" />
        <Card title="Escalations" value={escalations} color="#dc2626" />
        <Card title="High Churn Risk" value={highChurn} color="#ef4444" />
        <Card title="Medium Churn Risk" value={mediumChurn} color="#f59e0b" />
      </div>

      {/* TABLE */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#1f1f1f" }}>
            <th style={th}>ID</th>
            <th style={th}>Name</th>
            <th style={th}>Last Contact</th>
            <th style={th}>Days Since</th>
            <th style={th}>Priority</th>
            <th style={th}>Churn</th>
            <th style={th}>AI Level</th>
            <th style={th}>AI Action</th>
            <th style={th}>AI Reason</th>
          </tr>
        </thead>

        <tbody>
          {customers.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #333" }}>
              <td style={td}>{c.id}</td>
              <td style={td}>{c.name}</td>
              <td style={td}>{new Date(c.last_contact).toDateString()}</td>
              <td style={td}>{c.days_since_last_contact}</td>
              <td style={td}>{c.priority_score}</td>
              <td style={td}>{c.churn_score}</td>

              <td style={{
                ...td,
                color:
                  c.ai_level === "CRITICAL"
                    ? "#dc2626"
                    : c.ai_level === "HIGH"
                    ? "#ef4444"
                    : c.ai_level === "MEDIUM"
                    ? "#f59e0b"
                    : "#22c55e"
              }}>
                {c.ai_level}
              </td>

              <td>
                {c.ai_action === "CALL_CUSTOMER" && (
                  <button onClick={() => handleAction(c.id, "CALL_CUSTOMER")} style={btnCall}>
                    ✓ Call Done
                  </button>
                )}

                {c.ai_action === "SEND_EMAIL" && (
                  <button onClick={() => handleAction(c.id, "SEND_EMAIL")} style={btnEmail}>
                    ✓ Email Sent
                  </button>
                )}

                {c.ai_action === "ESCALATE_MANAGER" && (
                  <button onClick={() => handleAction(c.id, "ESCALATE_MANAGER")} style={btnEsc}>
                    ⚠ Escalated
                  </button>
                )}

                {c.ai_action === "NO_ACTION" && <span>✓ No Action</span>}
              </td>

              <td style={td}>{c.ai_reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div style={{
      background: "#121212",
      padding: 20,
      borderRadius: 10,
      minWidth: 200,
      borderLeft: `5px solid ${color}`
    }}>
      <div style={{ color: "#ccc" }}>{title}</div>
      <div style={{ fontSize: 24, color }}>{value}</div>
    </div>
  );
}

const th = {
  padding: 15,
  textAlign: "left",
  fontWeight: "bold"
};

const td = {
  padding: 15
};

const btnCall = {
  background: "#ef4444",
  border: "none",
  padding: "6px 12px",
  color: "white",
  cursor: "pointer",
  borderRadius: "6px"
};

const btnEmail = {
  background: "#22c55e",
  border: "none",
  padding: "6px 12px",
  color: "white",
  cursor: "pointer",
  borderRadius: "6px"
};

const btnEsc = {
  background: "#dc2626",
  border: "none",
  padding: "6px 12px",
  color: "white",
  cursor: "pointer",
  borderRadius: "6px"
};