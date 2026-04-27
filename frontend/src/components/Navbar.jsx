import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../api/axios";

export default function Navbar() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [unreadCount, setUnreadCount] = useState(0);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await API.get("/notifications/unread-count");
        setUnreadCount(res.data.unread_count);
      } catch (_) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav style={navStyle}>
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <span style={{ fontWeight: "bold", color: "#2563eb", marginRight: "8px" }}>SaaS</span>
        <Link to="/dashboard" style={linkStyle}>Dashboard</Link>
        <Link to="/billing" style={linkStyle}>Billing</Link>
        <Link to="/profile" style={linkStyle}>Profile</Link>
        <Link to="/teams" style={linkStyle}>Teams</Link>
        <Link to="/notifications" style={linkStyle}>
          🔔 Notifications
          {unreadCount > 0 && (
            <span style={badgeStyle}>{unreadCount}</span>
          )}
        </Link>
        {role === "admin" && (
          <Link to="/admin" style={{ ...linkStyle, color: "#f59e0b" }}>⚙ Admin</Link>
        )}
      </div>
      <button onClick={logout} style={logoutBtn}>Logout</button>
    </nav>
  );
}

const navStyle = {
  padding: "12px 24px",
  background: "#0f172a",
  color: "white",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const linkStyle = {
  color: "#cbd5e1",
  textDecoration: "none",
  fontSize: "14px",
  padding: "4px 8px",
  borderRadius: "4px",
  position: "relative"
};

const badgeStyle = {
  position: "absolute",
  top: "-6px",
  right: "-6px",
  background: "#ef4444",
  color: "white",
  borderRadius: "50%",
  fontSize: "10px",
  padding: "1px 5px",
  minWidth: "16px",
  textAlign: "center"
};

const logoutBtn = {
  background: "#ef4444",
  color: "white",
  padding: "6px 14px",
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
  fontSize: "13px"
};
