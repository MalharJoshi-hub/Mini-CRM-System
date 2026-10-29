import { useEffect, useState } from "react";

export default function Customers() {
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

  return (
    <div style={{ padding: 40, background: "#0b0b0b", minHeight: "100vh", color: "white" }}>
      <h2>Customers List</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 30 }}>
        <thead>
          <tr style={{ background: "#1f1f1f" }}>
            <th style={th}>ID</th>
            <th style={th}>Name</th>
            <th style={th}>Last Contact</th>
            <th style={th}>Interactions</th>
            <th style={th}>Priority</th>
            <th style={th}>Churn</th>
            <th style={th}>AI Level</th>
            <th style={th}>Timeline</th>
          </tr>
        </thead>

        <tbody>
          {customers.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #333" }}>
              <td style={td}>{c.id}</td>
              <td style={td}>{c.name}</td>
              <td style={td}>{new Date(c.last_contact).toDateString()}</td>
              <td style={td}>{c.interaction_count}</td>
              <td style={td}>{c.priority_score}</td>
              <td style={td}>{c.churn_score}</td>

              <td
                style={{
                  ...td,
                  color:
                    c.ai_level === "CRITICAL"
                      ? "#dc2626"
                      : c.ai_level === "HIGH"
                      ? "#ef4444"
                      : c.ai_level === "MEDIUM"
                      ? "#f59e0b"
                      : "#22c55e",
                }}
              >
                {c.ai_level}
              </td>

              <td style={td}>
                <a href={`/customer/${c.id}`} style={{ color: "#4f8cff" }}>
                  View Timeline
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = {
  padding: 15,
  textAlign: "left",
  fontWeight: "bold",
};

const td = {
  padding: 15,
};