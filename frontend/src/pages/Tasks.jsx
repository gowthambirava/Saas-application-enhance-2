import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axios";
import Navbar from "../components/Navbar";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  todo: { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
  in_progress: { bg: "#eff6ff", text: "#2563eb", border: "#93c5fd" },
  done: { bg: "#f0fdf4", text: "#16a34a", border: "#86efac" },
  blocked: { bg: "#fff7ed", text: "#ea580c", border: "#fdba74" },
};
const PRIORITY_COLORS = {
  low: "#22c55e", medium: "#f59e0b", high: "#ef4444", critical: "#7c3aed",
};
const STATUS_LIST = ["todo", "in_progress", "done", "blocked"];
const PRIORITY_LIST = ["low", "medium", "high", "critical"];

const ALLOWED_TRANSITIONS = {
  todo: ["in_progress"],
  in_progress: ["done", "blocked"],
  blocked: ["in_progress"],
  done: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const badge = (label, color, bg) => (
  <span style={{ padding: "2px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 600,
    background: bg || "#f1f5f9", color: color || "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
    {label}
  </span>
);

function isOverdue(task) {
  return task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();
}
function isDueToday(task) {
  if (!task.due_date || task.status === "done") return false;
  const d = new Date(task.due_date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Tasks() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("table"); // "table" | "kanban"
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null); // for detail modal
  const [activities, setActivities] = useState([]);

  // Filter state
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [savedFilters, setSavedFilters] = useState([]);
  const [filterName, setFilterName] = useState("");
  const [showSaveFilter, setShowSaveFilter] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDueDate, setNewDueDate] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  // Dashboard widgets
  const [overdueCount, setOverdueCount] = useState(0);
  const [dueTodayCount, setDueTodayCount] = useState(0);
  const [dueWeekCount, setDueWeekCount] = useState(0);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterPriority) params.append("priority", filterPriority);
      if (filterOverdue) params.append("overdue_only", "true");
      const res = await API.get(`/projects/${projectId}/tasks?${params}`);
      setTasks(res.data.items || []);
    } catch {
      alert("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [projectId, filterStatus, filterPriority, filterOverdue]);

  const fetchSavedFilters = async () => {
    try { const r = await API.get("/filters"); setSavedFilters(r.data || []); } catch {}
  };

  const fetchDeadlineWidgets = async () => {
    try {
      const [od, dt, dw] = await Promise.all([
        API.get("/tasks/overdue"), API.get("/tasks/due-today"), API.get("/tasks/due-week")
      ]);
      setOverdueCount((od.data || []).length);
      setDueTodayCount((dt.data || []).length);
      setDueWeekCount((dw.data || []).length);
    } catch {}
  };

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { fetchSavedFilters(); fetchDeadlineWidgets(); }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const createTask = async () => {
    if (!newTitle.trim()) return alert("Title required");
    try {
      await API.post(`/projects/${projectId}/tasks`, {
        title: newTitle, description: newDesc, priority: newPriority,
        due_date: newDueDate ? new Date(newDueDate).toISOString() : null,
      });
      setNewTitle(""); setNewDesc(""); setNewPriority("medium"); setNewDueDate(""); setShowCreate(false);
      fetchTasks(); fetchDeadlineWidgets();
    } catch (e) { alert(e.response?.data?.detail || "Error creating task"); }
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try { await API.delete(`/tasks/${id}`); fetchTasks(); fetchDeadlineWidgets(); }
    catch (e) { alert(e.response?.data?.detail || "Delete failed"); }
  };

  const changeStatus = async (taskId, newStatus) => {
    try { await API.patch(`/tasks/${taskId}/status`, { status: newStatus }); fetchTasks(); fetchDeadlineWidgets(); }
    catch (e) { alert(e.response?.data?.detail || "Status change failed"); }
  };

  const saveEdit = async (id) => {
    try {
      await API.put(`/tasks/${id}`, editData);
      setEditingId(null); setEditData({});
      fetchTasks();
    } catch (e) { alert(e.response?.data?.detail || "Update failed"); }
  };

  const saveFilter = async () => {
    if (!filterName.trim()) return alert("Name required");
    const payload = { status: filterStatus, priority: filterPriority, overdue_only: filterOverdue };
    try {
      await API.post("/filters", { name: filterName, filters_json: JSON.stringify(payload) });
      setFilterName(""); setShowSaveFilter(false); fetchSavedFilters();
    } catch { alert("Save failed"); }
  };

  const applyFilter = (f) => {
    const p = JSON.parse(f.filters_json);
    setFilterStatus(p.status || "");
    setFilterPriority(p.priority || "");
    setFilterOverdue(p.overdue_only || false);
  };

  const deleteFilter = async (id) => {
    try { await API.delete(`/filters/${id}`); fetchSavedFilters(); }
    catch { alert("Delete failed"); }
  };

  const openDetail = async (task) => {
    setSelectedTask(task);
    try {
      const res = await API.get(`/tasks/${task.id}/activities`);
      setActivities(res.data || []);
    } catch { setActivities([]); }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const statusC = (s) => STATUS_COLORS[s] || STATUS_COLORS.todo;

  const TaskRow = ({ task }) => (
    <tr style={{ borderBottom: "1px solid #f1f5f9", background: isOverdue(task) ? "#fff5f5" : "white" }}>
      <td style={{ padding: "12px 16px" }}>
        <span style={{ fontWeight: 500, color: "#1e293b" }}>{task.title}</span>
        {isOverdue(task) && <span style={{ marginLeft: 6, color: "#ef4444", fontSize: 11, fontWeight: 700 }}>⚠ OVERDUE</span>}
        {isDueToday(task) && !isOverdue(task) && <span style={{ marginLeft: 6, color: "#f59e0b", fontSize: 11, fontWeight: 700 }}>⏰ TODAY</span>}
      </td>
      <td style={{ padding: "12px 8px" }}>
        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
          background: statusC(task.status).bg, color: statusC(task.status).text, border: `1px solid ${statusC(task.status).border}` }}>
          {task.status.replace("_", " ")}
        </span>
      </td>
      <td style={{ padding: "12px 8px" }}>
        <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
          background: "#f8fafc", color: PRIORITY_COLORS[task.priority] || "#94a3b8",
          border: `1px solid ${PRIORITY_COLORS[task.priority] || "#e2e8f0"}` }}>
          {task.priority}
        </span>
      </td>
      <td style={{ padding: "12px 8px", fontSize: 12, color: "#64748b" }}>
        {task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}
      </td>
      <td style={{ padding: "12px 8px" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(ALLOWED_TRANSITIONS[task.status] || []).map(s => (
            <button key={s} onClick={() => changeStatus(task.id, s)}
              style={{ padding: "3px 10px", fontSize: 11, border: `1px solid ${statusC(s).border}`,
                borderRadius: 5, background: statusC(s).bg, color: statusC(s).text, cursor: "pointer" }}>
              → {s.replace("_", " ")}
            </button>
          ))}
          <button onClick={() => { setEditingId(task.id); setEditData({ title: task.title, description: task.description, priority: task.priority, due_date: task.due_date ? task.due_date.split("T")[0] : "" }); }}
            style={btnSm("#7c3aed")}>Edit</button>
          <button onClick={() => openDetail(task)} style={btnSm("#0891b2")}>Detail</button>
          <button onClick={() => deleteTask(task.id)} style={btnSm("#ef4444")}>Del</button>
        </div>
      </td>
    </tr>
  );

  const EditRow = ({ task }) => (
    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
      <td colSpan={5} style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <input value={editData.title || ""} onChange={e => setEditData(p => ({...p, title: e.target.value}))}
            placeholder="Title" style={{...inputSt, width: 200}} />
          <input value={editData.description || ""} onChange={e => setEditData(p => ({...p, description: e.target.value}))}
            placeholder="Description" style={{...inputSt, width: 250}} />
          <select value={editData.priority || "medium"} onChange={e => setEditData(p => ({...p, priority: e.target.value}))} style={inputSt}>
            {PRIORITY_LIST.map(p => <option key={p}>{p}</option>)}
          </select>
          <input type="date" value={editData.due_date || ""} onChange={e => setEditData(p => ({...p, due_date: e.target.value}))} style={inputSt} />
          <button onClick={() => saveEdit(task.id)} style={{...btnSm("#16a34a"), padding: "8px 16px"}}>Save</button>
          <button onClick={() => setEditingId(null)} style={{...btnSm("#94a3b8"), padding: "8px 16px"}}>Cancel</button>
        </div>
      </td>
    </tr>
  );

  const KanbanColumn = ({ status }) => {
    const colTasks = tasks.filter(t => t.status === status);
    const c = statusC(status);
    return (
      <div style={{ flex: 1, minWidth: 220, background: "#f8fafc", borderRadius: 10, padding: 14, border: `1px solid ${c.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 700, color: c.text, fontSize: 13, textTransform: "uppercase" }}>
            {status.replace("_", " ")}
          </span>
          <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`,
            borderRadius: 999, fontSize: 11, padding: "1px 8px", fontWeight: 700 }}>{colTasks.length}</span>
        </div>
        {colTasks.map(task => (
          <div key={task.id} style={{ background: "white", borderRadius: 8, padding: 12, marginBottom: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.07)", border: isOverdue(task) ? "1px solid #fca5a5" : "1px solid #e2e8f0" }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b", marginBottom: 4 }}>{task.title}</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: PRIORITY_COLORS[task.priority], fontWeight: 700 }}>● {task.priority}</span>
              {isOverdue(task) && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>⚠ Overdue</span>}
              {isDueToday(task) && !isOverdue(task) && <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>⏰ Today</span>}
            </div>
            {task.due_date && <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>Due: {new Date(task.due_date).toLocaleDateString()}</div>}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {(ALLOWED_TRANSITIONS[task.status] || []).map(s => (
                <button key={s} onClick={() => changeStatus(task.id, s)}
                  style={{ fontSize: 10, padding: "2px 8px", border: `1px solid ${statusC(s).border}`,
                    borderRadius: 4, background: statusC(s).bg, color: statusC(s).text, cursor: "pointer" }}>
                  → {s.replace("_", " ")}
                </button>
              ))}
              <button onClick={() => openDetail(task)} style={{ fontSize: 10, padding: "2px 8px", border: "1px solid #e2e8f0", borderRadius: 4, cursor: "pointer", background: "#f8fafc", color: "#64748b" }}>Detail</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar />
      <div style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: 13, marginBottom: 4, padding: 0 }}>← Back to Dashboard</button>
            <h2 style={{ margin: 0, color: "#1e293b" }}>Task Management</h2>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Project #{projectId}</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setView("table")} style={{ padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 7, cursor: "pointer", fontWeight: view === "table" ? 700 : 400, background: view === "table" ? "#2563eb" : "white", color: view === "table" ? "white" : "#475569", fontSize: 13 }}>☰ Table</button>
            <button onClick={() => setView("kanban")} style={{ padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 7, cursor: "pointer", fontWeight: view === "kanban" ? 700 : 400, background: view === "kanban" ? "#2563eb" : "white", color: view === "kanban" ? "white" : "#475569", fontSize: 13 }}>⬛ Kanban</button>
            <button onClick={() => setShowCreate(!showCreate)} style={{ padding: "8px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ New Task</button>
          </div>
        </div>

        {/* Deadline Widgets */}
        <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
          <WidgetCard label="Overdue" value={overdueCount} color="#ef4444" icon="⚠️" onClick={() => { setFilterOverdue(true); setFilterStatus(""); }} />
          <WidgetCard label="Due Today" value={dueTodayCount} color="#f59e0b" icon="⏰" onClick={() => { setFilterStatus(""); setFilterOverdue(false); }} />
          <WidgetCard label="Due This Week" value={dueWeekCount} color="#7c3aed" icon="📅" onClick={() => {}} />
          <WidgetCard label="Total Tasks" value={tasks.length} color="#2563eb" icon="📋" onClick={() => { setFilterOverdue(false); setFilterStatus(""); setFilterPriority(""); }} />
        </div>

        {/* Create Task Form */}
        {showCreate && (
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 14px", color: "#1e293b" }}>Create New Task</h4>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <input placeholder="Title *" value={newTitle} onChange={e => setNewTitle(e.target.value)} style={{ ...inputSt, flex: 2, minWidth: 200 }} />
              <input placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ ...inputSt, flex: 3, minWidth: 200 }} />
              <select value={newPriority} onChange={e => setNewPriority(e.target.value)} style={inputSt}>
                {PRIORITY_LIST.map(p => <option key={p}>{p}</option>)}
              </select>
              <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} style={inputSt} />
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <button onClick={createTask} style={{ padding: "8px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600 }}>Create Task</button>
              <button onClick={() => setShowCreate(false)} style={{ padding: "8px 16px", background: "#e2e8f0", color: "#475569", border: "none", borderRadius: 7, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Filter Panel */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, color: "#475569", fontSize: 13 }}>🔍 Filters:</span>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputSt, width: "auto" }}>
              <option value="">All Status</option>
              {STATUS_LIST.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ ...inputSt, width: "auto" }}>
              <option value="">All Priority</option>
              {PRIORITY_LIST.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", cursor: "pointer" }}>
              <input type="checkbox" checked={filterOverdue} onChange={e => setFilterOverdue(e.target.checked)} />
              Overdue only
            </label>
            <button onClick={() => { setFilterStatus(""); setFilterPriority(""); setFilterOverdue(false); }}
              style={{ padding: "6px 14px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
              Clear
            </button>
            <button onClick={() => setShowSaveFilter(!showSaveFilter)}
              style={{ padding: "6px 14px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
              💾 Save Filter
            </button>
            {savedFilters.length > 0 && (
              <select onChange={e => { if (e.target.value) { const f = savedFilters.find(sf => sf.id == e.target.value); if (f) applyFilter(f); } }}
                style={{ ...inputSt, width: "auto" }} defaultValue="">
                <option value="">Load saved view…</option>
                {savedFilters.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            )}
          </div>
          {showSaveFilter && (
            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <input placeholder="Filter name" value={filterName} onChange={e => setFilterName(e.target.value)} style={{ ...inputSt, width: 200 }} />
              <button onClick={saveFilter} style={{ padding: "6px 16px", background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Save</button>
              <button onClick={() => setShowSaveFilter(false)} style={{ padding: "6px 12px", background: "#e2e8f0", color: "#475569", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Cancel</button>
            </div>
          )}
          {savedFilters.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {savedFilters.map(f => (
                <span key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f1f5f9", borderRadius: 999, padding: "3px 12px", fontSize: 12, color: "#475569" }}>
                  <button onClick={() => applyFilter(f)} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: 12, padding: 0 }}>{f.name}</button>
                  <button onClick={() => deleteFilter(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 11, padding: 0 }}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Table View */}
        {view === "table" && (
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading tasks…</div>
            ) : tasks.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No tasks found. Create your first task!</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    {["Task", "Status", "Priority", "Due Date", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => editingId === task.id ? <EditRow key={task.id} task={task} /> : <TaskRow key={task.id} task={task} />)}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Kanban View */}
        {view === "kanban" && (
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
            {STATUS_LIST.map(s => <KanbanColumn key={s} status={s} />)}
          </div>
        )}

        {/* Task Detail Modal */}
        {selectedTask && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
            onClick={e => { if (e.target === e.currentTarget) setSelectedTask(null); }}>
            <div style={{ background: "white", borderRadius: 14, padding: 28, width: "min(600px, 95vw)", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, color: "#1e293b" }}>{selectedTask.title}</h3>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>{selectedTask.description || "No description"}</p>
                </div>
                <button onClick={() => setSelectedTask(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8" }}>✕</button>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: STATUS_COLORS[selectedTask.status]?.bg, color: STATUS_COLORS[selectedTask.status]?.text }}>
                  {selectedTask.status.replace("_", " ")}
                </span>
                <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#f8fafc", color: PRIORITY_COLORS[selectedTask.priority] }}>
                  {selectedTask.priority} priority
                </span>
                {isOverdue(selectedTask) && <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#fff5f5", color: "#ef4444" }}>⚠ OVERDUE</span>}
                {isDueToday(selectedTask) && !isOverdue(selectedTask) && <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "#fffbeb", color: "#f59e0b" }}>⏰ DUE TODAY</span>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>DUE DATE</div>
                  <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 600 }}>{selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : "—"}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>COMPLETED AT</div>
                  <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 600 }}>{selectedTask.completed_at ? new Date(selectedTask.completed_at).toLocaleDateString() : "—"}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>CREATED</div>
                  <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 600 }}>{new Date(selectedTask.created_at).toLocaleString()}</div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>ASSIGNED TO</div>
                  <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 600 }}>User #{selectedTask.assigned_to || "Unassigned"}</div>
                </div>
              </div>

              {/* Status change */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: "0 0 10px", color: "#475569", fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>Change Status</h4>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {STATUS_LIST.map(s => (
                    <button key={s} onClick={() => { changeStatus(selectedTask.id, s); setSelectedTask({ ...selectedTask, status: s }); }}
                      disabled={s === selectedTask.status}
                      style={{ padding: "6px 14px", border: `1px solid ${STATUS_COLORS[s]?.border}`,
                        borderRadius: 6, background: s === selectedTask.status ? STATUS_COLORS[s]?.bg : "white",
                        color: STATUS_COLORS[s]?.text, cursor: s === selectedTask.status ? "default" : "pointer",
                        fontWeight: s === selectedTask.status ? 700 : 400, fontSize: 12 }}>
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Timeline */}
              <div>
                <h4 style={{ margin: "0 0 12px", color: "#475569", fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>Activity Timeline</h4>
                {activities.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 13 }}>No activity yet</p>
                ) : (
                  activities.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: i < activities.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>
                        {a.action === "created" ? "✅" : a.action === "status_changed" ? "🔄" : a.action === "updated" ? "✏️" : a.action === "deleted" ? "🗑️" : "📌"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{a.action.replace("_", " ")}</div>
                        {a.new_value_json && (() => { try { const v = JSON.parse(a.new_value_json); return <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(" · ")}</div>; } catch { return null; } })()}
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{new Date(a.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function WidgetCard({ label, value, color, icon, onClick }) {
  return (
    <div onClick={onClick} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 10,
      padding: "16px 20px", flex: 1, minWidth: 130, cursor: "pointer", borderTop: `3px solid ${color}`,
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "box-shadow 0.15s" }}>
      <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{icon} {label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const inputSt = { padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, background: "white", outline: "none" };
const btnSm = (bg) => ({ padding: "3px 10px", fontSize: 11, background: bg, color: "white", border: "none", borderRadius: 5, cursor: "pointer" });
