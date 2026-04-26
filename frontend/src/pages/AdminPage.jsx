import { useEffect, useState } from "react";
import { apiClient } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Navigate } from "react-router-dom";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "patient" });
  const [isAdding, setIsAdding] = useState(false);

  if (user?.role !== "admin") {
    return <Navigate to="/chat" replace />;
  }

  const loadUsers = async () => {
    try {
      const { data } = await apiClient.get("/admin/users");
      setUsers(data.users);
    } catch (error) {
      console.error("Failed to load users", error);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadUsers(); }, []);

  const unsuspend = async (id) => {
    try {
      await apiClient.post(`/admin/users/${id}/unsuspend`);
      await loadUsers();
    } catch (error) {
      alert("Failed to unsuspend user");
    }
  };

  const removeUser = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      await apiClient.delete(`/admin/users/${id}`);
      await loadUsers();
    } catch (error) {
      alert("Failed to remove user");
    }
  };

  const submitAddUser = async (e) => {
    e.preventDefault();
    try {
      setIsAdding(true);
      await apiClient.post("/admin/users", form);
      setForm({ fullName: "", email: "", password: "", role: "patient" });
      await loadUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add user");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", alignItems: "center" }}>
        <h1 style={{ fontFamily: "Fraunces, serif", margin: 0 }}>Terminal Dashboard</h1>
        <button onClick={logout} className="secondary-button" type="button">Sign out</button>
      </header>

      {/* Add User Form Section */}
      <div style={{ background: "var(--panel-strong)", padding: "24px", borderRadius: "18px", border: "1px solid var(--line)", marginBottom: "30px" }}>
        <h3 style={{ marginTop: 0 }}>Manually Add User</h3>
        <form onSubmit={submitAddUser} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label>Full Name</label>
            <input required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="John Doe" />
          </div>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label>Email</label>
            <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@example.com" />
          </div>
          <div style={{ flex: 1, minWidth: "150px" }}>
            <label>Password</label>
            <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
          </div>
          <div style={{ flex: 1, minWidth: "120px" }}>
            <label>Role</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="patient">Patient</option>
              <option value="psychologist">Psychologist</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={isAdding} className="primary-button">
            {isAdding ? "Adding..." : "Add User"}
          </button>
        </form>
      </div>
      
      {loading ? (
        <div className="screen-loader">Loading users...</div>
      ) : (
        <div style={{ background: "var(--panel-strong)", padding: "24px", borderRadius: "18px", border: "1px solid var(--line)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line)" }}>
                <th style={{ padding: "12px 8px" }}>Name</th>
                <th style={{ padding: "12px 8px" }}>Email</th>
                <th style={{ padding: "12px 8px" }}>Role</th>
                <th style={{ padding: "12px 8px" }}>Warnings</th>
                <th style={{ padding: "12px 8px" }}>Status</th>
                <th style={{ padding: "12px 8px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "12px 8px" }}><strong>{u.fullName}</strong></td>
                  <td style={{ padding: "12px 8px" }}>{u.email}</td>
                  <td style={{ padding: "12px 8px", textTransform: "capitalize" }}>{u.role}</td>
                  <td style={{ padding: "12px 8px" }}>{u.warningCount}</td>
                  <td style={{ padding: "12px 8px" }}>
                    {u.isSuspended ? (
                      <span style={{ color: "var(--alert)", fontWeight: "bold" }}>Suspended</span>
                    ) : (
                      <span style={{ color: "var(--accent)" }}>Active</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 8px", display: "flex", gap: "8px" }}>
                    {u.isSuspended && (
                      <button 
                        type="button"
                        onClick={() => unsuspend(u.id)}
                        className="primary-button" 
                        style={{ padding: "6px 12px", fontSize: "14px" }}
                      >
                        Unsuspend
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => removeUser(u.id)}
                      className="secondary-button" 
                      style={{ padding: "6px 12px", fontSize: "14px", background: "rgba(180, 83, 9, 0.16)", color: "var(--alert)" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
