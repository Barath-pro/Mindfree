import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell.jsx";
import PasswordField from "../components/PasswordField.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function getRegistrationError(requestError) {
  const response = requestError.response?.data;

  if (Array.isArray(response?.details) && response.details.length > 0) {
    const passwordError = response.details.find((detail) => detail.path === "password");

    if (passwordError) {
      return "Password must be at least 8 characters and include uppercase, lowercase, and a number.";
    }

    const emailError = response.details.find((detail) => detail.path === "email");

    if (emailError) {
      return "Enter a valid email address.";
    }

    const nameError = response.details.find((detail) => detail.path === "fullName");

    if (nameError) {
      return "Full name must be between 2 and 80 characters.";
    }
  }

  return response?.message || "Unable to create the account.";
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "patient"
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await register(form);
      navigate("/chat");
    } catch (requestError) {
      setError(getRegistrationError(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your secure profile"
      subtitle="Choose the role that matches your work in the platform."
      alternateHref="/login"
      alternateLabel="Already have an account?"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Full name
          <input name="fullName" value={form.fullName} onChange={handleChange} required />
        </label>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
        </label>
        <PasswordField name="password" label="Password" value={form.password} onChange={handleChange} required />
        <p className="helper-text">Use 8+ characters with uppercase, lowercase, and a number.</p>
        <label>
          Role
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="patient">Patient</option>
            <option value="psychologist">Psychologist</option>
          </select>
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
