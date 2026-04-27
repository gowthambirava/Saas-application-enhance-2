import { useState } from "react";
import API from "../api/axios";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const register = async () => {
    if (!email || !password) return setError("Please fill in all fields");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/auth/register", { email, password, role });
      setSuccess(`Registered successfully! Verification token: ${res.data.verification_token}`);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h1 style={{ color: "#2563eb", fontSize: "28px", margin: 0 }}>SaaS</h1>
          <p style={{ color: "#64748b", marginTop: "4px" }}>Create your account</p>
        </div>

        {error && <div style={errorBox}>{error}</div>}
        {success && <div style={successBox}>{success}</div>}

        <div style={{ marginBottom: "14px" }}>
          <label style={labelStyle}>Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={labelStyle}>Password</label>
          <input type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Account Type</label>
          <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button onClick={register} disabled={loading} style={btnStyle}>
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p style={{ textAlign: "center", marginTop: "16px", color: "#64748b", fontSize: "13px" }}>
          Already have an account? <Link to="/login" style={{ color: "#2563eb" }}>Login</Link>
        </p>
      </div>
    </div>
  );
}

const pageStyle = { minHeight: "100vh", background: "linear-gradient(135deg,#eff6ff,#f0fdf4)", display: "flex", alignItems: "center", justifyContent: "center" };
const cardStyle = { background: "white", padding: "40px", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.1)", width: "360px", maxWidth: "90vw" };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" };
const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" };
const btnStyle = { width: "100%", padding: "11px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer" };
const errorBox = { background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" };
const successBox = { background: "#dcfce7", color: "#166534", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" };
