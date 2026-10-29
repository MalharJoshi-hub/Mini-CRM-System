import { useEffect, useState } from "react";

export default function Followups() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetch("/api/ai/decision", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    })
      .then(res => res.json())
      .then(data => setTasks(data));
  }, []);

  const handleAction = async (id, action) => {
    await fetch("/api/followups/action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ customer_id: id, action })
    });

    alert("Follow-up marked done");
    window.location.reload();
  };

  const pending = tasks.filter(t => t.ai_action !== "NO_ACTION");

  return (
    <div style={{
      padding: 40,
      background: "#0b0b0b",
      minHeight: "100vh",
      color: "white"
    }}>
      <h2>AI Follow-Up Panel</h2>

      {pending.length === 0 && (
        <p style={{ marginTop: 20 }}>No pending AI tasks 🎉</p>
      )}

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 20,
        marginTop: 30
      }}>
        {pending.map(c => (
          <div key={c.id} style={{
            background: "#121212",
            padding: 20,
            borderRadius: 10,
            width: 280,
            borderLeft:
              c.ai_level === "CRITICAL" ? "5px solid red" :
              c.ai_level === "HIGH" ? "5px solid orange" :
              c.ai_level === "MEDIUM" ? "5px solid yellow" :
              "5px solid green"
          }}>
            <h3>{c.name}</h3>

            <p><b>Churn Score:</b> {c.churn_score}</p>
            <p><b>Priority Score:</b> {c.priority_score}</p>
            <p><b>AI Level:</b> {c.ai_level}</p>
            <p style={{ lineHeight: "1.4" }}>
  <b>Reason:</b> {c.ai_reason}
</p>

            {c.ai_action === "CALL_CUSTOMER" && (
              <button
                onClick={() => handleAction(c.id, "CALL_CUSTOMER")}
                style={btnStyle("#ff4d4d")}
              >
                Call Done
              </button>
            )}

            {c.ai_action === "SEND_EMAIL" && (
              <button
                onClick={() => handleAction(c.id, "SEND_EMAIL")}
                style={btnStyle("#28a745")}
              >
                Email Sent
              </button>
            )}

            {c.ai_action === "ESCALATE_MANAGER" && (
              <button
                onClick={() => handleAction(c.id, "ESCALATE_MANAGER")}
                style={btnStyle("#ff0000")}
              >
                Escalated
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function btnStyle(color) {
  return {
    marginTop: 10,
    background: color,
    border: "none",
    padding: "8px 14px",
    color: "white",
    borderRadius: 6,
    cursor: "pointer"
  };
}