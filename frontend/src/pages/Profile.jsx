import { useEffect, useState } from "react";
import API from "../api/axios";
import Navbar from "../components/Navbar";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/user/profile");
      setProfile(res.data);
    } catch (err) {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const upgradeToPro = async () => {
    try {
      const res = await API.post("/subscriptions/create-checkout-session");
      window.location.href = res.data.checkout_url;
    } catch (err) { alert("Upgrade failed"); }
  };

  const cancelSubscription = async () => {
    try {
      await API.post("/subscriptions/cancel-subscription");
      alert("Subscription canceled");
      fetchProfile();
    } catch (err) { alert("Cancel failed"); }
  };

  useEffect(() => { fetchProfile(); }, []);

  if (loading) return <div><Navbar /><p style={{ padding: "30px" }}>Loading profile...</p></div>;
  if (error) return <div><Navbar /><p style={{ padding: "30px", color: "red" }}>{error} <button onClick={fetchProfile}>Retry</button></p></div>;

  const plan = profile?.subscription?.plan || "free";
  const status = profile?.subscription?.status || "inactive";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar />
      <div style={{ padding: "30px", maxWidth: "700px", margin: "0 auto" }}>
        <h2 style={{ color: "#1e293b" }}>My Profile</h2>

        {/* ACCOUNT INFO */}
        <div style={section}>
          <h3 style={sectionTitle}>Account Details</h3>
          <div style={row}>
            <span style={label}>Email</span>
            <span style={value}>{profile?.email}</span>
          </div>
          <div style={row}>
            <span style={label}>Role</span>
            <span style={{ ...badge, background: profile?.role === "admin" ? "#fef3c7" : "#e0e7ff", color: profile?.role === "admin" ? "#92400e" : "#3730a3" }}>
              {profile?.role}
            </span>
          </div>
          <div style={row}>
            <span style={label}>Email Verified</span>
            <span>{profile?.is_verified ? "✅ Verified" : "❌ Not verified"}</span>
          </div>
        </div>

        {/* SUBSCRIPTION */}
        <div style={section}>
          <h3 style={sectionTitle}>Subscription</h3>
          <div style={row}>
            <span style={label}>Plan</span>
            <span style={{ ...badge, background: plan === "pro" ? "#ddd6fe" : "#e0e7ff", color: plan === "pro" ? "#5b21b6" : "#3730a3" }}>
              {plan.toUpperCase()}
            </span>
          </div>
          <div style={row}>
            <span style={label}>Status</span>
            <span style={{ ...badge, background: status === "active" ? "#dcfce7" : "#fee2e2", color: status === "active" ? "#166534" : "#991b1b" }}>
              {status}
            </span>
          </div>
          <div style={{ marginTop: "16px" }}>
            {plan === "free" ? (
              <button onClick={upgradeToPro} style={upgradeBtn}>🚀 Upgrade to Pro</button>
            ) : (
              <button onClick={cancelSubscription} style={cancelBtn}>Cancel Subscription</button>
            )}
          </div>
        </div>

        {/* ANALYTICS */}
        <div style={section}>
          <h3 style={sectionTitle}>Usage Overview</h3>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <MiniStat label="Projects" value={profile?.analytics?.total_projects ?? 0} />
            <MiniStat label="Teams" value={profile?.analytics?.team_memberships ?? 0} />
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        {profile?.recent_activity?.length > 0 && (
          <div style={section}>
            <h3 style={sectionTitle}>Recent Activity</h3>
            {profile.recent_activity.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", padding: "8px 0", borderBottom: "1px solid #f1f5f9", alignItems: "center" }}>
                <span>{a.action === "created" ? "✅" : a.action === "updated" ? "✏️" : "🗑️"}</span>
                <div>
                  <span style={{ color: "#1e293b", fontSize: "13px" }}>Project #{a.project_id} was <strong>{a.action}</strong></span>
                  <div style={{ color: "#94a3b8", fontSize: "11px" }}>{new Date(a.timestamp).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={fetchProfile} style={refreshBtn}>↻ Refresh</button>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "10px", padding: "16px 24px", textAlign: "center", minWidth: "100px" }}>
      <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0369a1" }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>{label}</div>
    </div>
  );
}

const section = { background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", marginBottom: "20px" };
const sectionTitle = { margin: "0 0 16px", color: "#1e293b", fontSize: "15px", fontWeight: "700" };
const row = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" };
const label = { color: "#64748b", fontSize: "13px" };
const value = { color: "#1e293b", fontSize: "13px", fontWeight: "500" };
const badge = { display: "inline-block", padding: "3px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: "600" };
const upgradeBtn = { padding: "9px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600" };
const cancelBtn = { padding: "9px 20px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px" };
const refreshBtn = { padding: "7px 16px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "13px" };
