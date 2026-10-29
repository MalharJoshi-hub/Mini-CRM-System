import { useRouter } from "next/router";
import { useEffect } from "react";
import Link from "next/link";

export default function App({ Component, pageProps }) {
  const router = useRouter();

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
  }, [router.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const isAuthPage = router.pathname === "/login" || router.pathname === "/register";

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#f3f4f6", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {!isAuthPage && (
        <nav
          style={{
            padding: "14px 28px",
            background: "rgba(17, 17, 17, 0.95)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backdropFilter: "blur(12px)",
            position: "sticky",
            top: 0,
            zIndex: 50
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 12 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
                color: "white"
              }}>
                M
              </div>
              <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em", color: "#f9fafb" }}>
                MiniCRM
              </span>
            </div>

            <Link href="/dashboard" style={linkStyle(router.pathname === "/dashboard")}>Dashboard</Link>
            <Link href="/customers" style={linkStyle(router.pathname === "/customers")}>Customers</Link>
            <Link href="/followups" style={linkStyle(router.pathname === "/followups")}>AI Panel</Link>
            <Link href="/add-customer" style={linkStyle(router.pathname === "/add-customer")}>+ Add Customer</Link>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={logout} style={logoutBtn}>
              Sign Out
            </button>
          </div>
        </nav>
      )}

      <Component {...pageProps} />
    </div>
  );
}

const linkStyle = (active) => ({
  color: active ? "#60a5fa" : "#9ca3af",
  textDecoration: "none",
  fontWeight: active ? 600 : 500,
  fontSize: 14,
  padding: "6px 12px",
  borderRadius: 6,
  background: active ? "rgba(59, 130, 246, 0.12)" : "transparent",
  transition: "all 0.15s ease",
});

const logoutBtn = {
  background: "rgba(239, 68, 68, 0.15)",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  color: "#fca5a5",
  padding: "7px 14px",
  cursor: "pointer",
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 13,
  transition: "all 0.15s ease",
};