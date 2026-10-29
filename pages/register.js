import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Register() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("agent");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        if (data.token) {
          localStorage.setItem("token", data.token);
          setTimeout(() => {
            router.push("/dashboard");
          }, 800);
        } else {
          // Fallback: auto-login via /api/auth/login
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const loginData = await loginRes.json();
          if (loginRes.ok && loginData.token) {
            localStorage.setItem("token", loginData.token);
            setTimeout(() => {
              router.push("/dashboard");
            }, 800);
          } else {
            router.push("/login?registered=true");
          }
        }
      } else {
        const errorMsg = data.error || data.message || "Registration failed. Please try again.";
        if (errorMsg.includes("duplicate") || errorMsg.includes("unique")) {
          setError("An account with this email already exists. Try logging in instead.");
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      setError("Network or server connection failed. Please ensure server is running.");
    } finally {
      setLoading(false);
    }
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
          <h1 style={titleStyle}>Create CRM Account</h1>
          <p style={subtitleStyle}>Set up your login credentials to access the MiniCRM platform</p>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={errorBanner}>
            <span style={{ marginRight: 8, fontSize: 16 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Success Notification */}
        {success && (
          <div style={successBanner}>
            <span style={{ marginRight: 8, fontSize: 16 }}>✓</span>
            <span>Account created successfully! Redirecting to dashboard...</span>
          </div>
        )}

        <form onSubmit={handleRegister}>
          {/* Full Name */}
          <div style={formGroup}>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              placeholder="e.g. Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Work Email */}
          <div style={formGroup}>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Role Selection */}
          <div style={formGroup}>
            <label style={labelStyle}>Account Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={selectStyle}
            >
              <option value="agent">Sales Agent</option>
              <option value="manager">Account Manager</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {/* Password */}
          <div style={formGroup}>
            <label style={labelStyle}>Password (min 6 characters)</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Confirm Password */}
          <div style={formGroup}>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            style={{
              ...buttonStyle,
              opacity: loading || success ? 0.7 : 1,
              cursor: loading || success ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Creating Account..." : success ? "✓ Registered!" : "Create Account & Sign In"}
          </button>
        </form>

        {/* Footer Link to Login */}
        <div style={footerStyle}>
          <span style={{ color: "#9ca3af", fontSize: 14 }}>Already have an account? </span>
          <Link href="/login" style={linkHighlight}>
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}

// Styling definitions
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

const selectStyle = {
  ...inputStyle,
  appearance: "none",
  backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  backgroundSize: "10px",
  paddingRight: 32,
  cursor: "pointer",
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
  marginBottom: 16,
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

const successBanner = {
  background: "rgba(34, 197, 94, 0.12)",
  border: "1px solid rgba(34, 197, 94, 0.3)",
  color: "#86efac",
  padding: "10px 14px",
  borderRadius: 8,
  marginBottom: 20,
  fontSize: 13,
  display: "flex",
  alignItems: "center",
};

const footerStyle = {
  textAlign: "center",
  marginTop: 12,
  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
  paddingTop: 18,
};

const linkHighlight = {
  color: "#60a5fa",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 14,
};
