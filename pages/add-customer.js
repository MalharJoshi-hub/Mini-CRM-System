import { useState } from "react";
import { useRouter } from "next/router";

export default function AddCustomer() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    await fetch("/api/customers/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify({ name, email, phone }),
    });

    alert("Customer Added ✅");
    router.push("/dashboard");
  };

  return (
    <div style={{ padding: 40, background: "#0b0b0b", minHeight: "100vh", color: "white" }}>
      <h2>Add New Customer</h2>

      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={inputStyle}
        />

        <button style={btnStyle}>Add Customer</button>
      </form>
    </div>
  );
}

const inputStyle = {
  display: "block",
  marginBottom: 10,
  padding: 10,
  width: 300,
  background: "#121212",
  color: "white",
  border: "1px solid #333",
};

const btnStyle = {
  padding: "10px 20px",
  background: "#4f46e5",
  border: "none",
  color: "white",
  cursor: "pointer",
};