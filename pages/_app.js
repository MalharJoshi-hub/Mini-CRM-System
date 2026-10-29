import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [switchingRole, setSwitchingRole] = useState(false);

  const fetchUserProfile = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + token },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
        }
      }
    } catch (err) {
      console.warn("Could not fetch user profile:", err.message);
    }
  };

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const publicRoutes = ["/login", "/register"];
    const isPublic = publicRoutes.includes(router.pathname);

    if (!token && !isPublic) {
      router.push("/login");
    }

    if (token && (router.pathname === "/login" || router.pathname === "/register")) {
      router.push("/dashboard");
    }

    if (token && !isPublic) {
      fetchUserProfile();
    }
  }, [router.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
    router.push("/login");
  };

  const handleRoleSwitch = async (targetRole) => {
    setSwitchingRole(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/auth/me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ role: targetRole }),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error("Role switch error:", err);
    } finally {
      setSwitchingRole(false);
    }
  };

  const isAuthPage = router.pathname === "/login" || router.pathname === "/register";
  const role = currentUser?.role || "agent";

  return (
    <div style={{ minHeight: "100vh", background: "#08080a", color: "#f3f4f6", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {!isAuthPage && (
        <nav
          style={{
            padding: "12px 28px",
            background: "rgba(14, 14, 18, 0.95)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backdropFilter: "blur(14px)",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          {/* Left: Brand & Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
              <div style={logoIcon}>M</div>
              <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", color: "#f9fafb" }}>
                MiniCRM
              </span>
            </div>

            {/* Common Navigation */}
            <Link href="/dashboard" style={linkStyle(router.pathname === "/dashboard")}>
              Dashboard
            </Link>
            <Link href="/customers" style={linkStyle(router.pathname === "/customers")}>
              Customers
            </Link>

            {/* Sales Agent & Outreach Link */}
            <Link href="/outreach" style={linkStyle(router.pathname === "/outreach")}>
              Outreach Queue
            </Link>

            {/* Account Manager & Admin Link */}
            {(role === "manager" || role === "admin") && (
              <Link href="/followups" style={linkStyle(router.pathname === "/followups")}>
                Retention & Churn
              </Link>
            )}

            {/* Administrator Only Link */}
            {role === "admin" && (
              <Link href="/admin" style={linkStyle(router.pathname === "/admin")}>
                👑 Admin Console
              </Link>
            )}

            <Link href="/add-customer" style={linkStyle(router.pathname === "/add-customer")}>
              + Add Lead
            </Link>
          </div>

          {/* Right: Evaluator Role Switcher & User Profile */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Interactive Role Switcher for Evaluation */}
            <div style={roleSwitcherContainer}>
              <span style={{ fontSize: 11, color: "#9ca3af", marginRight: 6, fontWeight: 500 }}>
                Role View:
              </span>
              <button
                type="button"
                onClick={() => handleRoleSwitch("agent")}
                disabled={switchingRole}
                style={roleOptionBtn(role === "agent", "#10b981")}
                title="View as Sales Agent"
              >
                👤 Agent
              </button>
              <button
                type="button"
                onClick={() => handleRoleSwitch("manager")}
                disabled={switchingRole}
                style={roleOptionBtn(role === "manager", "#f59e0b")}
                title="View as Account Manager"
              >
                💼 Manager
              </button>
              <button
                type="button"
                onClick={() => handleRoleSwitch("admin")}
                disabled={switchingRole}
                style={roleOptionBtn(role === "admin", "#a855f7")}
                title="View as Administrator"
              >
                👑 Admin
              </button>
            </div>

            {/* User Profile Pill */}
            {currentUser && (
              <div style={userPill}>
                <span style={{ fontSize: 13, color: "#f9fafb", fontWeight: 600 }}>
                  {currentUser.name || currentUser.email.split("@")[0]}
                </span>
              </div>
            )}

            {/* Sign Out Button */}
            <button onClick={logout} style={logoutBtn} title="Sign Out">
              Sign Out
            </button>
          </div>
        </nav>
      )}

      <Component {...pageProps} />
    </div>
  );
}

// Styling definitions
const logoIcon = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 14,
  color: "#ffffff",
  boxShadow: "0 2px 8px rgba(59, 130, 246, 0.4)",
};

const linkStyle = (active) => ({
  color: active ? "#60a5fa" : "#9ca3af",
  textDecoration: "none",
  fontWeight: active ? 600 : 500,
  fontSize: 13,
  padding: "6px 12px",
  borderRadius: 6,
  background: active ? "rgba(59, 130, 246, 0.12)" : "transparent",
  transition: "all 0.15s ease",
});

const roleSwitcherContainer = {
  display: "flex",
  alignItems: "center",
  background: "rgba(255, 255, 255, 0.04)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 8,
  padding: "3px 6px",
};

const roleOptionBtn = (active, activeColor) => ({
  background: active ? `${activeColor}25` : "transparent",
  border: active ? `1px solid ${activeColor}60` : "1px solid transparent",
  color: active ? activeColor : "#9ca3af",
  padding: "3px 8px",
  borderRadius: 5,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: active ? 700 : 500,
  transition: "all 0.15s ease",
});

const userPill = {
  display: "flex",
  alignItems: "center",
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  padding: "5px 12px",
  borderRadius: 6,
};

const logoutBtn = {
  background: "rgba(239, 68, 68, 0.12)",
  border: "1px solid rgba(239, 68, 68, 0.25)",
  color: "#fca5a5",
  padding: "6px 12px",
  cursor: "pointer",
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 12,
  transition: "all 0.15s ease",
};