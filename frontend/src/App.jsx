import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Teams from "./pages/Teams";
import Notifications from "./pages/Notifications";
import Tasks from "./pages/Tasks";

const isAuthenticated = () => !!localStorage.getItem("token");
const isAdmin = () => localStorage.getItem("role") === "admin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* USER PROTECTED */}
        <Route path="/dashboard" element={isAuthenticated() ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/billing" element={isAuthenticated() ? <Billing /> : <Navigate to="/login" />} />
        <Route path="/profile" element={isAuthenticated() ? <Profile /> : <Navigate to="/login" />} />
        <Route path="/teams" element={isAuthenticated() ? <Teams /> : <Navigate to="/login" />} />
        <Route path="/notifications" element={isAuthenticated() ? <Notifications /> : <Navigate to="/login" />} />
        <Route path="/projects/:projectId/tasks" element={isAuthenticated() ? <Tasks /> : <Navigate to="/login" />} />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={isAuthenticated() && isAdmin() ? <Admin /> : <Navigate to="/dashboard" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
