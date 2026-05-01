import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiClient } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

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

  const submitAddUser = async (event) => {
    event.preventDefault();

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
    <div className="admin-page">
      <header className="admin-header">
        <h1>Terminal Dashboard</h1>
        <button onClick={logout} className="secondary-button" type="button">
          Sign out
        </button>
      </header>

      <section className="admin-card">
        <h3>Manually Add User</h3>
        <form className="admin-user-form" onSubmit={submitAddUser}>
          <label>
            Full Name
            <input
              required
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              placeholder="John Doe"
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="john@example.com"
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Password"
            />
          </label>
          <label>
            Role
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="patient">Patient</option>
              <option value="psychologist">Psychologist</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit" disabled={isAdding} className="primary-button">
            {isAdding ? "Adding..." : "Add User"}
          </button>
        </form>
      </section>

      {loading ? (
        <div className="screen-loader">Loading users...</div>
      ) : (
        <section className="admin-card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Warnings</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((listedUser) => (
                <tr key={listedUser.id}>
                  <td data-label="Name">
                    <strong>{listedUser.fullName}</strong>
                  </td>
                  <td data-label="Email">{listedUser.email}</td>
                  <td data-label="Role" className="admin-table__role">{listedUser.role}</td>
                  <td data-label="Warnings">{listedUser.warningCount}</td>
                  <td data-label="Status">
                    {listedUser.isSuspended ? (
                      <span className="admin-status admin-status--suspended">Suspended</span>
                    ) : (
                      <span className="admin-status">Active</span>
                    )}
                  </td>
                  <td data-label="Actions">
                    <div className="admin-table__actions">
                      {listedUser.isSuspended ? (
                        <button
                          type="button"
                          onClick={() => unsuspend(listedUser.id)}
                          className="primary-button"
                        >
                          Unsuspend
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeUser(listedUser.id)}
                        className="secondary-button admin-danger-button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td className="admin-table__empty" colSpan="6">No users found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
