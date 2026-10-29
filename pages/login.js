import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } else {
      setError(data.error || "Login failed");
    }
  };

  return (
    <div style={{
      background: "#0b0b0b",
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      color: "white"
    }}>
      <form
        onSubmit={handleLogin}
        style={{
          background: "#121212",
          padding: 40,
          borderRadius: 10,
          width: 350
        }}
      >
        <h2 style={{ marginBottom: 20 }}>CRM Login</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />

        <button style={btn}>Login</button>

        {error && (
          <div style={{ color: "red", marginTop: 15 }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}

const input = {
  width: "100%",
  padding: 10,
  marginBottom: 15,
  background: "#1f1f1f",
  border: "none",
  color: "white",
  borderRadius: 5
};

const btn = {
  width: "100%",
  padding: 10,
  background: "#4f8cff",
  border: "none",
  color: "white",
  borderRadius: 5,
  cursor: "pointer"
};