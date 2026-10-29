import { useRouter } from "next/router";
import { useEffect } from "react";
import Link from "next/link";

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const publicRoutes = ["/login"];
    const isPublic = publicRoutes.includes(router.pathname);

    if (!token && !isPublic) {
      router.push("/login");
    }

    if (token && router.pathname === "/login") {
      router.push("/dashboard");
    }
  }, [router.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div>
      <nav
        style={{
          padding: 15,
          background: "#111",
          borderBottom: "1px solid #222",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <Link href="/dashboard" style={link}>Dashboard</Link>
          <Link href="/customers" style={link}>Customers</Link>
          <Link href="/followups" style={link}>AI Panel</Link>
          <Link href="/add-customer" style={link}>Add Customer</Link>
        </div>

        <button onClick={logout} style={logoutBtn}>Logout</button>
      </nav>

      <Component {...pageProps} />
    </div>
  );
}

const link = {
  marginRight: 20,
  color: "white",
  textDecoration: "none"
};

const logoutBtn = {
  background: "#ef4444",
  border: "none",
  color: "white",
  padding: "6px 12px",
  cursor: "pointer",
  borderRadius: 5
};