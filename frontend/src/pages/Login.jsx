import { useState } from "react";
import API from "../api/axios";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    if (!email || !password) return setError("Please fill in all fields");
    setLoading(true);
    setError("");
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const res = await API.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token || "");
      localStorage.setItem("role", res.data.role);
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.detail || "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h1 style={{ color: "#2563eb", fontSize: "28px", margin: 0 }}>SaaS</h1>
          <p style={{ color: "#64748b", marginTop: "4px" }}>Sign in to your account</p>
        </div>

        {error && <div style={errorBox}>{error}</div>}

        <div style={{ marginBottom: "14px" }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}
            style={inputStyle}
          />
        </div>

        <button onClick={login} disabled={loading} style={btnStyle}>
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p style={{ textAlign: "center", marginTop: "16px", color: "#64748b", fontSize: "13px" }}>
          Don't have an account? <Link to="/register" style={{ color: "#2563eb" }}>Register</Link>
        </p>
      </div>
    </div>
  );
}

const pageStyle = { minHeight: "100vh", background: "linear-gradient(135deg,#eff6ff,#f0fdf4)", display: "flex", alignItems: "center", justifyContent: "center" };
const cardStyle = { background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.1)", width: "360px", maxWidth: "90vw" };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" };
const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", outline: "none" };
const btnStyle = { width: "100%", padding: "11px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer" };
const errorBox = { background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" };
