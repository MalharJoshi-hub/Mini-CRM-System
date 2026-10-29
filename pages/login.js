import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    if (router.query.registered) {
      setInfoMessage("Registration complete! Please enter your credentials to log in.");
    }
  }, [router.query]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");

    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        router.push("/dashboard");
      } else {
        setError(data.message || data.error || "Login failed. Check your email or password.");
      }
    } catch (err) {
      setError("Unable to connect to server. Ensure PostgreSQL and Next.js are running.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
    setInfoMessage(`Loaded credentials for ${demoEmail}`);
  };

  return (
    <div style={containerStyle}>
      {/* Background ambient decorative glow */}
      <div style={glowBg1} />
      <div style={glowBg2} />

      <div style={cardStyle}>
        {/* Header with Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={logoIcon}>
            <span>M</span>
          </div>
          <h1 style={titleStyle}>Welcome Back</h1>
          <p style={subtitleStyle}>Sign in to your MiniCRM intelligence portal</p>
        </div>

        {/* Info Notification */}
        {infoMessage && (
          <div style={infoBanner}>
            <span style={{ marginRight: 8, fontSize: 16 }}>ℹ️</span>
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div style={errorBanner}>
            <span style={{ marginRight: 8, fontSize: 16 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Email Input */}
          <div style={formGroup}>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. admin@minicrm.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Password Input */}
          <div style={formGroup}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Authenticating..." : "Sign In to Dashboard"}
          </button>
        </form>

        {/* Create Account Link */}
        <div style={{ textAlign: "center", marginTop: 14, marginBottom: 24 }}>
          <span style={{ color: "#9ca3af", fontSize: 14 }}>Don't have an account? </span>
          <Link href="/register" style={registerLink}>
            Create New Account →
          </Link>
        </div>

        {/* Quick Demo Helper Box */}
        <div style={demoCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={demoBadge}>Demo & Evaluation Access</span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>Click to autofill</span>
          </div>
          <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "#9ca3af", lineHeight: 1.4 }}>
            For quick testing, evaluation, or grading, use pre-configured administrator credentials:
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => fillDemoAccount("admin@test.com", "password123")}
              style={demoQuickBtn}
            >
              <span style={{ fontWeight: 600, color: "#f9fafb" }}>admin@test.com</span>
              <span style={{ color: "#93c5fd", marginLeft: 6 }}>/ password123</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount("admin@minicrm.io", "password123")}
              style={demoQuickBtn}
            >
              <span style={{ fontWeight: 600, color: "#f9fafb" }}>admin@minicrm.io</span>
              <span style={{ color: "#93c5fd", marginLeft: 6 }}>/ password123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Styling definitions matching register.js
const containerStyle = {
  background: "#08080a",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "24px 16px",
  position: "relative",
  overflow: "hidden",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const glowBg1 = {
  position: "absolute",
  width: 480,
  height: 480,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)",
  top: "-10%",
  left: "15%",
  filter: "blur(60px)",
  pointerEvents: "none",
};

const glowBg2 = {
  position: "absolute",
  width: 420,
  height: 420,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)",
  bottom: "-10%",
  right: "15%",
  filter: "blur(60px)",
  pointerEvents: "none",
};

const cardStyle = {
  background: "rgba(18, 18, 22, 0.92)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.04)",
  backdropFilter: "blur(20px)",
  borderRadius: 16,
  padding: "40px 36px",
  width: "100%",
  maxWidth: 440,
  position: "relative",
  zIndex: 10,
};

const logoIcon = {
  width: 44,
  height: 44,
  margin: "0 auto 16px",
  borderRadius: 12,
  background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ffffff",
  fontWeight: 800,
  fontSize: 20,
  boxShadow: "0 8px 16px -4px rgba(59, 130, 246, 0.4)",
};

const titleStyle = {
  margin: "0 0 8px 0",
  fontSize: 24,
  fontWeight: 700,
  color: "#f9fafb",
  letterSpacing: "-0.02em",
};

const subtitleStyle = {
  margin: 0,
  fontSize: 14,
  color: "#9ca3af",
  lineHeight: 1.4,
};

const formGroup = {
  marginBottom: 18,
};

const labelStyle = {
  display: "block",
  marginBottom: 7,
  fontSize: 13,
  fontWeight: 500,
  color: "#d1d5db",
};

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  background: "#16161b",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: 8,
  color: "#f9fafb",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  border: "none",
  color: "#ffffff",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
  marginTop: 6,
  marginBottom: 12,
};

const registerLink = {
  color: "#60a5fa",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 14,
  marginLeft: 4,
};

const errorBanner = {
  background: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  color: "#fca5a5",
  padding: "10px 14px",
  borderRadius: 8,
  marginBottom: 20,
  fontSize: 13,
  display: "flex",
  alignItems: "center",
};

const infoBanner = {
  background: "rgba(59, 130, 246, 0.12)",
  border: "1px solid rgba(59, 130, 246, 0.3)",
  color: "#93c5fd",
  padding: "10px 14px",
  borderRadius: 8,
  marginBottom: 20,
  fontSize: 13,
  display: "flex",
  alignItems: "center",
};

const demoCard = {
  marginTop: 18,
  background: "rgba(30, 41, 59, 0.45)",
  border: "1px solid rgba(59, 130, 246, 0.2)",
  borderRadius: 10,
  padding: 14,
};

const demoBadge = {
  display: "inline-block",
  background: "rgba(59, 130, 246, 0.2)",
  color: "#93c5fd",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  padding: "3px 8px",
  borderRadius: 4,
};

const demoQuickBtn = {
  flex: "1 1 45%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#1e293b",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 12,
  cursor: "pointer",
  color: "#cbd5e1",
  transition: "all 0.15s ease",
};