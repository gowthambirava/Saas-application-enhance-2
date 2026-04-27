import { useEffect, useState } from "react";
import API from "../api/axios";
import Navbar from "../components/Navbar";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [activeTab, setActiveTab] = useState("teams");
  const [loading, setLoading] = useState(false);

  const fetchTeams = async () => {
    try {
      const res = await API.get("/teams/");
      setTeams(res.data);
    } catch (err) {}
  };

  const fetchInvitations = async () => {
    try {
      const res = await API.get("/teams/invitations");
      setInvitations(res.data);
    } catch (err) {}
  };

  const fetchMembers = async (teamId) => {
    try {
      const res = await API.get(`/teams/${teamId}/members`);
      setMembers(res.data);
    } catch (err) {}
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return alert("Enter a team name");
    try {
      await API.post("/teams/", { name: newTeamName });
      setNewTeamName("");
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create team");
    }
  };

  const inviteMember = async (teamId) => {
    if (!inviteEmail.trim()) return alert("Enter an email");
    try {
      await API.post(`/teams/${teamId}/invite`, { email: inviteEmail });
      setInviteEmail("");
      alert("Invitation sent!");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to invite");
    }
  };

  const respondToInvite = async (teamId, action) => {
    try {
      await API.post(`/teams/${teamId}/respond`, { action });
      fetchInvitations();
      fetchTeams();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to respond");
    }
  };

  const removeMember = async (teamId, userId) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await API.delete(`/teams/${teamId}/members/${userId}`);
      fetchMembers(teamId);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to remove");
    }
  };

  const selectTeam = (team) => {
    setSelectedTeam(team);
    fetchMembers(team.id);
    setActiveTab("detail");
  };

  useEffect(() => {
    fetchTeams();
    fetchInvitations();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar />
      <div style={{ padding: "30px", maxWidth: "900px", margin: "0 auto" }}>
        <h2 style={{ color: "#1e293b" }}>Team Collaboration</h2>

        {/* TABS */}
        <div style={tabBar}>
          {["teams", "invitations"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ ...tabBtn, ...(activeTab === tab ? tabActive : {}) }}>
              {tab === "teams" ? `👥 My Teams (${teams.length})` : `📩 Invitations (${invitations.length})`}
            </button>
          ))}
        </div>

        {/* MY TEAMS */}
        {activeTab === "teams" && (
          <div>
            <div style={createBox}>
              <h3 style={{ margin: "0 0 12px", color: "#1e293b" }}>Create a Team</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                />
                <button onClick={createTeam} style={addBtn}>Create</button>
              </div>
            </div>

            {teams.length === 0 ? (
              <p style={{ color: "#94a3b8", marginTop: "20px" }}>No teams yet. Create one above!</p>
            ) : (
              teams.map(team => (
                <div key={team.id} style={teamCard}>
                  <div>
                    <h4 style={{ margin: 0, color: "#1e293b" }}>{team.name}</h4>
                    <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "12px" }}>
                      Created {new Date(team.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => selectTeam(team)} style={viewBtn}>Manage →</button>
                </div>
              ))
            )}
          </div>
        )}

        {/* INVITATIONS */}
        {activeTab === "invitations" && (
          <div>
            {invitations.length === 0 ? (
              <p style={{ color: "#94a3b8", marginTop: "20px" }}>No pending invitations.</p>
            ) : (
              invitations.map((inv, i) => (
                <div key={i} style={inviteCard}>
                  <div>
                    <h4 style={{ margin: 0, color: "#1e293b" }}>Team: {inv.team_name}</h4>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
                      Invited {new Date(inv.invited_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => respondToInvite(inv.team_id, "accept")} style={acceptBtn}>Accept</button>
                    <button onClick={() => respondToInvite(inv.team_id, "decline")} style={declineBtn}>Decline</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TEAM DETAIL */}
        {activeTab === "detail" && selectedTeam && (
          <div>
            <button onClick={() => setActiveTab("teams")} style={backBtn}>← Back</button>
            <h3 style={{ color: "#1e293b" }}>Team: {selectedTeam.name}</h3>

            <div style={createBox}>
              <h4 style={{ margin: "0 0 12px" }}>Invite Member</h4>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  placeholder="User email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                />
                <button onClick={() => inviteMember(selectedTeam.id)} style={addBtn}>Invite</button>
              </div>
            </div>

            <h4 style={{ marginTop: "24px", color: "#1e293b" }}>Members ({members.length})</h4>
            {members.map((m, i) => (
              <div key={i} style={{ ...teamCard, alignItems: "center" }}>
                <div>
                  <span style={{ color: "#1e293b", fontWeight: "500" }}>{m.email}</span>
                  <span style={{ ...roleBadge, background: m.role === "owner" ? "#7c3aed" : "#e2e8f0", color: m.role === "owner" ? "white" : "#475569" }}>
                    {m.role}
                  </span>
                </div>
                {m.role !== "owner" && (
                  <button onClick={() => removeMember(selectedTeam.id, m.user_id)} style={declineBtn}>Remove</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const tabBar = { display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "2px solid #e2e8f0", paddingBottom: "0" };
const tabBtn = { padding: "10px 20px", border: "none", background: "none", cursor: "pointer", fontSize: "14px", color: "#64748b", borderBottom: "2px solid transparent", marginBottom: "-2px" };
const tabActive = { color: "#2563eb", borderBottomColor: "#2563eb", fontWeight: "600" };
const createBox = { background: "white", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px", marginBottom: "20px" };
const inputStyle = { padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "14px", marginBottom: "10px" };
const addBtn = { padding: "8px 16px", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" };
const teamCard = { border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", background: "white", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" };
const inviteCard = { ...teamCard };
const viewBtn = { padding: "6px 14px", background: "#7c3aed", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" };
const acceptBtn = { padding: "6px 12px", background: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" };
const declineBtn = { padding: "6px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" };
const backBtn = { padding: "6px 14px", background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", marginBottom: "16px" };
const roleBadge = { display: "inline-block", padding: "2px 8px", borderRadius: "99px", fontSize: "11px", fontWeight: "600", marginLeft: "8px" };
