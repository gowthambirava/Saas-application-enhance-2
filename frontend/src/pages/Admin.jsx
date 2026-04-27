import { useEffect, useState } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line
} from "recharts";

const COLORS = ["#2563eb", "#7c3aed", "#16a34a", "#f59e0b", "#ef4444"];

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [subscriptions, setSubscriptions] = useState([]);
  const [userSubs, setUserSubs] = useState([]);
  const [stats, setStats] = useState(null);
  const [advStats, setAdvStats] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userPage, setUserPage] = useState(0);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");
  const navigate = useNavigate();
  const PAGE_SIZE = 10;

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  const fetchData = async (uSkip = 0) => {
    try {
      const [usersRes, subsRes, statsRes, userSubsRes, advRes] = await Promise.all([
        API.get(`/admin/users?skip=${uSkip}&limit=${PAGE_SIZE}`),
        API.get("/admin/subscriptions?skip=0&limit=100"),
        API.get("/admin/stats"),
        API.get("/admin/user-subscriptions"),
        API.get("/admin/advanced-stats"),
      ]);
      setUsers(usersRes.data.items);
      setUserTotal(usersRes.data.total);
      setSubscriptions(subsRes.data.items);
      setStats(statsRes.data);
      setUserSubs(userSubsRes.data);
      setAdvStats(advRes.data);
    } catch (err) {
      alert("Admin access failed");
    }
  };

  const cancelUserSub = async (userId) => {
    if (!window.confirm("Cancel this user's subscription?")) return;
    try {
      await API.post(`/admin/cancel/${userId}`);
      fetchData(userPage * PAGE_SIZE);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed");
    }
  };

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifMsg.trim()) return alert("Fill both fields");
    try {
      await API.post(`/admin/notify-all?title=${encodeURIComponent(notifTitle)}&message=${encodeURIComponent(notifMsg)}`);
      alert("Notification sent to all users!");
      setNotifTitle(""); setNotifMsg("");
    } catch (err) {
      alert("Failed to send");
    }
  };

  useEffect(() => { fetchData(userPage * PAGE_SIZE); }, [userPage]);

  const planData = advStats ? [
    { name: "Free", value: advStats.free_users },
    { name: "Pro", value: advStats.pro_users },
  ] : [];

  const subStatusData = stats ? [
    { name: "Active", value: stats.active },
    { name: "Canceled", value: stats.canceled },
    { name: "Past Due", value: stats.past_due },
  ] : [];

  const monthlyData = advStats?.monthly_registrations?.map(r => ({
    name: `${r.year}-${String(r.month).padStart(2, "0")}`,
    users: r.count
  })) || [];

  const totalPages = Math.ceil(userTotal / PAGE_SIZE);

  const tabs = ["dashboard", "analytics", "users", "subscriptions", "notify"];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* SIDEBAR */}
      <div style={sidebar}>
        <h2 style={{ color: "white", marginBottom: "8px" }}>⚙ Admin</h2>
        <p style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "24px" }}>Control Panel</p>
        {tabs.map(tab => (
          <p key={tab} style={{ ...sideLink, background: activeTab === tab ? "#1d4ed8" : "transparent" }}
            onClick={() => setActiveTab(tab)}>
            {tab === "dashboard" ? "📊 Dashboard" :
             tab === "analytics" ? "📈 Analytics" :
             tab === "users" ? "👥 Users" :
             tab === "subscriptions" ? "💳 Subscriptions" : "📢 Notify All"}
          </p>
        ))}
        <button style={logoutBtn} onClick={handleLogout}>Logout</button>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, padding: "30px", background: "#f8fafc", overflow: "auto" }}>

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <>
            <h2>Admin Dashboard</h2>
            <div style={cardGrid}>
              <StatCard title="Total Users" value={advStats?.total_users ?? 0} color="#2563eb" />
              <StatCard title="Pro Subscribers" value={advStats?.pro_users ?? 0} color="#7c3aed" />
              <StatCard title="Active Subs" value={stats?.active ?? 0} color="#16a34a" />
              <StatCard title="Total Projects" value={advStats?.total_projects ?? 0} color="#0891b2" />
              <StatCard title="Canceled" value={stats?.canceled ?? 0} color="#ef4444" />
            </div>
          </>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <>
            <h2>Analytics</h2>

            <div style={{ display: "flex", gap: "30px", flexWrap: "wrap", marginTop: "20px" }}>
              <div style={chartBox}>
                <h4 style={{ marginTop: 0 }}>Plan Distribution</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {planData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={chartBox}>
                <h4 style={{ marginTop: 0 }}>Subscription Status</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={subStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {monthlyData.length > 0 && (
                <div style={{ ...chartBox, width: "100%" }}>
                  <h4 style={{ marginTop: 0 }}>Monthly User Registrations</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="users" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <>
            <h2>Users ({userTotal})</h2>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={th}>ID</th><th style={th}>Email</th><th style={th}>Role</th>
                  <th style={th}>Verified</th><th style={th}>Joined</th><th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={trHover}>
                    <td style={td}>{u.id}</td>
                    <td style={td}>{u.email}</td>
                    <td style={td}>
                      <span style={{ ...badge, background: u.role === "admin" ? "#fef3c7" : "#e0e7ff", color: u.role === "admin" ? "#92400e" : "#3730a3" }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={td}>{u.is_verified ? "✅" : "❌"}</td>
                    <td style={td}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                    <td style={td}>
                      <button onClick={() => cancelUserSub(u.id)} style={dangerBtn}>Cancel Sub</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                <button disabled={userPage === 0} onClick={() => setUserPage(p => p - 1)} style={pageBtn}>← Prev</button>
                <span style={{ lineHeight: "32px", color: "#64748b" }}>Page {userPage + 1} / {totalPages}</span>
                <button disabled={userPage >= totalPages - 1} onClick={() => setUserPage(p => p + 1)} style={pageBtn}>Next →</button>
              </div>
            )}
          </>
        )}

        {/* SUBSCRIPTIONS TAB */}
        {activeTab === "subscriptions" && (
          <>
            <h2>User Subscriptions</h2>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={th}>Email</th><th style={th}>Plan</th><th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {userSubs.map((u, i) => (
                  <tr key={i} style={trHover}>
                    <td style={td}>{u.email}</td>
                    <td style={td}>
                      <span style={{ ...badge, background: u.plan === "pro" ? "#ddd6fe" : "#e0e7ff", color: u.plan === "pro" ? "#5b21b6" : "#3730a3" }}>
                        {u.plan}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ ...badge, background: u.status === "active" ? "#dcfce7" : "#fee2e2", color: u.status === "active" ? "#166534" : "#991b1b" }}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* NOTIFY ALL TAB */}
        {activeTab === "notify" && (
          <>
            <h2>Send System Notification</h2>
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", maxWidth: "500px" }}>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Notification Title</label>
                <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="e.g. Scheduled Maintenance" style={inputStyle} />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Message</label>
                <textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} placeholder="Enter message..." rows={4}
                  style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <button onClick={sendNotification} style={sendBtn}>📢 Send to All Users</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", flex: "1", minWidth: "140px", borderTop: `4px solid ${color}` }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</p>
      <p style={{ margin: "8px 0 0", fontSize: "28px", fontWeight: "bold", color }}>{value}</p>
    </div>
  );
}

const sidebar = { width: "230px", background: "#0f172a", padding: "24px 16px", display: "flex", flexDirection: "column" };
const sideLink = { color: "#cbd5e1", cursor: "pointer", padding: "10px 12px", borderRadius: "8px", margin: "2px 0", fontSize: "14px" };
const logoutBtn = { marginTop: "auto", background: "#ef4444", color: "white", padding: "10px", border: "none", width: "100%", borderRadius: "8px", cursor: "pointer", marginTop: "30px" };
const cardGrid = { display: "flex", gap: "16px", marginTop: "20px", flexWrap: "wrap" };
const chartBox = { background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", flex: "1", minWidth: "300px" };
const tableStyle = { width: "100%", borderCollapse: "collapse", background: "white", borderRadius: "10px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
const th = { padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" };
const td = { padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", color: "#1e293b" };
const trHover = {};
const badge = { display: "inline-block", padding: "2px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "600" };
const dangerBtn = { padding: "4px 10px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "12px" };
const pageBtn = { padding: "6px 14px", background: "#e2e8f0", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "13px" };
const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" };
const inputStyle = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: "7px", fontSize: "14px", boxSizing: "border-box" };
const sendBtn = { padding: "10px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600" };
