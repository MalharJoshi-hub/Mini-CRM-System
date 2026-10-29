import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Timeline() {
  const router = useRouter();
  const { id } = router.query;

  const [interactions, setInteractions] = useState([]);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/interactions/customer?id=${id}`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    })
      .then((res) => res.json())
      .then((data) => setInteractions(data));
  }, [id]);

  return (
    <div style={{ padding: 40, background: "#0b0b0b", minHeight: "100vh", color: "white" }}>
      <h2>Customer Timeline</h2>

      {interactions.length === 0 && (
        <p style={{ marginTop: 30 }}>No interactions found.</p>
      )}

      {interactions.map((i) => (
        <div
          key={i.id}
          style={{
            background: "#121212",
            padding: 20,
            borderRadius: 10,
            marginTop: 20,
            borderLeft: "5px solid #4f8cff",
          }}
        >
          <div><b>Date:</b> {new Date(i.interaction_date).toDateString()}</div>
          <div><b>Type:</b> {i.type}</div>
          <div><b>Notes:</b> {i.notes}</div>
        </div>
      ))}
    </div>
  );
}