import { useEffect, useState } from "react";
import API from "../api/axios";
import Navbar from "../components/Navbar";

const typeColors = {
  info: { bg: "#dbeafe", text: "#1d4ed8", icon: "ℹ️" },
  alert: { bg: "#fee2e2", text: "#dc2626", icon: "⚠️" },
  billing: { bg: "#fef3c7", text: "#d97706", icon: "💳" },
  system: { bg: "#f0fdf4", text: "#16a34a", icon: "📢" },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const limit = 10;

  const fetchNotifications = async (s = 0) => {
    try {
      setLoading(true);
      const res = await API.get(`/notifications/?skip=${s}&limit=${limit}`);
      setNotifications(res.data.items);
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      alert("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await API.post("/notifications/mark-all-read");
      fetchNotifications(skip);
    } catch (err) {}
  };

  const markOneRead = async (id) => {
    try {
      await API.post(`/notifications/${id}/read`);
      fetchNotifications(skip);
    } catch (err) {}
  };

  useEffect(() => {
    fetchNotifications(skip);
  }, [skip]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar />
      <div style={{ padding: "30px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h2 style={{ margin: 0, color: "#1e293b" }}>Notifications</h2>
            {unreadCount > 0 && (
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
                {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={markAllBtn}>✓ Mark all read</button>
          )}
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : notifications.length === 0 ? (
          <div style={emptyState}>
            <p style={{ fontSize: "48px", margin: 0 }}>🔔</p>
            <p style={{ color: "#94a3b8" }}>No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => {
            const style = typeColors[n.type] || typeColors.info;
            return (
              <div
                key={n.id}
                style={{
                  ...notifCard,
                  borderLeft: `4px solid ${style.text}`,
                  opacity: n.is_read ? 0.65 : 1,
                  background: n.is_read ? "#f8fafc" : "white"
                }}
              >
                <div style={{ display: "flex", gap: "12px", flex: 1 }}>
                  <span style={{ fontSize: "20px" }}>{style.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ color: "#1e293b" }}>{n.title}</strong>
                      <span style={{ ...typeBadge, background: style.bg, color: style.text }}>{n.type}</span>
                      {!n.is_read && <span style={unreadDot} />}
                    </div>
                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>{n.message}</p>
                    <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "11px" }}>
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!n.is_read && (
                  <button onClick={() => markOneRead(n.id)} style={readBtn}>Mark read</button>
                )}
              </div>
            );
          })
        )}

        {/* PAGINATION */}
        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "center" }}>
          <button disabled={skip === 0} onClick={() => setSkip(s => Math.max(0, s - limit))} style={pageBtn}>← Prev</button>
          <button disabled={notifications.length < limit} onClick={() => setSkip(s => s + limit)} style={pageBtn}>Next →</button>
        </div>
      </div>
    </div>
  );
}

const notifCard = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.2s" };
const typeBadge = { display: "inline-block", padding: "1px 8px", borderRadius: "99px", fontSize: "10px", fontWeight: "600", textTransform: "uppercase" };
const unreadDot = { display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" };
const markAllBtn = { padding: "7px 14px", background: "#e0e7ff", color: "#4338ca", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" };
const readBtn = { padding: "4px 10px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" };
const pageBtn = { padding: "6px 16px", background: "#e2e8f0", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" };
const emptyState = { textAlign: "center", padding: "60px", color: "#94a3b8" };
