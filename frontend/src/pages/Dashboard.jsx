import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import Navbar from "../components/Navbar";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [page, setPage] = useState(0);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const limit = 5;
  const navigate = useNavigate();

  const fetchProjects = async (skip = 0) => {
    try {
      setLoading(true);
      const res = await API.get(`/projects/?skip=${skip}&limit=${limit}`);
      setProjects(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      alert("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await API.get("/user/profile");
      setProfile(res.data);
      setActivities(res.data.recent_activity || []);
    } catch (err) {}
  };

  const createProject = async () => {
    if (!newName.trim()) return alert("Project name is required");
    try {
      await API.post("/projects/", { name: newName, description: newDesc });
      setNewName(""); setNewDesc(""); setShowCreate(false);
      fetchProjects(page * limit);
      fetchProfile();
    } catch (err) {
      alert(err.response?.data?.detail || "Error creating project");
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await API.delete(`/projects/${id}`);
      fetchProjects(page * limit);
      fetchProfile();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditDesc(p.description || "");
  };

  const saveEdit = async (id) => {
    try {
      await API.put(`/projects/${id}`, { name: editName, description: editDesc });
      setEditingId(null);
      fetchProjects(page * limit);
    } catch (err) {
      alert("Update failed");
    }
  };

  useEffect(() => {
    fetchProjects(page * limit);
    fetchProfile();
  }, [page]);

  const plan = profile?.subscription?.plan || "free";
  const status = profile?.subscription?.status || "inactive";
  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar />
      <div style={{ padding: "30px", maxWidth: "1100px", margin: "0 auto" }}>
        <h2 style={{ color: "#1e293b" }}>Dashboard</h2>

        {/* STATS CARDS */}
        <div style={cardGrid}>
          <StatCard title="Total Projects" value={total} color="#2563eb" />
          <StatCard title="Plan" value={plan.toUpperCase()} color="#7c3aed" />
          <StatCard
            title="Status"
            value={status}
            color={status === "active" ? "#16a34a" : "#dc2626"}
          />
          <StatCard
            title="Team Memberships"
            value={profile?.analytics?.team_memberships ?? 0}
            color="#0891b2"
          />
        </div>

        {/* CREATE PROJECT */}
        <div style={{ marginTop: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: "#1e293b" }}>Your Projects</h3>
          <button
            style={addBtn}
            onClick={() => setShowCreate(!showCreate)}
            disabled={plan === "free" && total >= 3}
          >
            + New Project
          </button>
        </div>

        {plan === "free" && total >= 3 && (
          <p style={{ color: "#dc2626", fontSize: "13px" }}>
            Free plan limit reached (3). <a href="/billing">Upgrade to Pro 🚀</a>
          </p>
        )}

        {showCreate && (
          <div style={createBox}>
            <input
              placeholder="Project name *"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Description (optional)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={createProject} style={addBtn}>Create</button>
              <button onClick={() => setShowCreate(false)} style={cancelBtn}>Cancel</button>
            </div>
          </div>
        )}

        {/* PROJECT LIST */}
        {loading ? (
          <p>Loading projects...</p>
        ) : projects.length === 0 ? (
          <p style={{ color: "#94a3b8", marginTop: "20px" }}>No projects found. Create your first one!</p>
        ) : (
          projects.map((p) => (
            <div key={p.id} style={projectCard}>
              {editingId === p.id ? (
                <div>
                  <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />
                  <input value={editDesc} onChange={e => setEditDesc(e.target.value)} style={inputStyle} />
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button onClick={() => saveEdit(p.id)} style={addBtn}>Save</button>
                    <button onClick={() => setEditingId(null)} style={cancelBtn}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ margin: 0, color: "#1e293b" }}>{p.name}</h4>
                    <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>{p.description}</p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => navigate(`/projects/${p.id}/tasks`)} style={tasksBtn}>📋 Tasks</button>
                    <button onClick={() => startEdit(p)} style={editBtn}>Edit</button>
                    <button onClick={() => deleteProject(p.id)} style={deleteBtn}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={pageBtn}>← Prev</button>
            <span style={{ lineHeight: "32px", color: "#64748b" }}>Page {page + 1} / {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={pageBtn}>Next →</button>
          </div>
        )}

        {/* RECENT ACTIVITY */}
        {activities.length > 0 && (
          <div style={{ marginTop: "36px" }}>
            <h3 style={{ color: "#1e293b" }}>Recent Activity</h3>
            {activities.map((a, i) => (
              <div key={i} style={activityItem}>
                <span style={{ fontSize: "18px" }}>
                  {a.action === "created" ? "✅" : a.action === "updated" ? "✏️" : "🗑️"}
                </span>
                <div>
                  <span style={{ color: "#1e293b", fontWeight: "500" }}>Project #{a.project_id}</span>
                  <span style={{ color: "#64748b", fontSize: "13px" }}> was {a.action}</span>
                  <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                    {new Date(a.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div style={{ ...card, borderTop: `4px solid ${color}` }}>
      <p style={{ margin: 0, color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</p>
      <p style={{ margin: "8px 0 0", fontSize: "28px", fontWeight: "bold", color }}>{value}</p>
    </div>
  );
}

const cardGrid = { display: "flex", gap: "16px", marginTop: "20px", flexWrap: "wrap" };
const card = { border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", flex: "1", minWidth: "160px", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
const addBtn = { padding: "8px 16px", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" };
const cancelBtn = { padding: "8px 16px", background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" };
const editBtn = { padding: "5px 12px", background: "#7c3aed", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "12px" };
const deleteBtn = { padding: "5px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "12px" };
const tasksBtn = { padding: "5px 12px", background: "#0891b2", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "12px" };
const projectCard = { border: "1px solid #e2e8f0", padding: "16px", marginTop: "10px", borderRadius: "10px", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" };
const createBox = { background: "white", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px", marginTop: "12px" };
const inputStyle = { display: "block", width: "100%", padding: "8px 12px", marginBottom: "10px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" };
const pageBtn = { padding: "6px 14px", background: "#e2e8f0", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "13px" };
const activityItem = { display: "flex", gap: "12px", alignItems: "flex-start", padding: "10px", borderBottom: "1px solid #f1f5f9" };
