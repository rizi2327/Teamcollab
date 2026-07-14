import { useState } from "react";
import axios from "axios";
import "../styles/Register.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ---------- tiny helpers ----------
const Field = ({ label, id, type = "text", value, onChange, error, placeholder }) => (
  <div className="register-field">
    <label htmlFor={id} className="register-label">
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={id}
      className={`register-input ${error ? "register-input--error" : ""}`}
    />
    {error && <span className="register-error-text">{error}</span>}
  </div>
);

// ---------- validation ----------
function validate({ name, email, password, confirm }) {
  const errs = {};
  if (!name.trim() || name.trim().length < 2)
    errs.name = "Name must be at least 2 characters";
  if (!email || !/^\S+@\S+\.\S+$/.test(email))
    errs.email = "Enter a valid email address";
  if (!password || password.length < 6)
    errs.password = "Password must be at least 6 characters";
  if (password !== confirm)
    errs.confirm = "Passwords do not match";
  return errs;
}

// ========== MAIN COMPONENT ==========
export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [serverMsg, setServerMsg] = useState("");
  const [showPass, setShowPass] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStatus("loading");
    setServerMsg("");

    try {
      const { data } = await axios.post(`${API_URL}/auth/register`, {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      setStatus("success");
      setServerMsg(data.message || "Account created successfully!");
      setForm({ name: "", email: "", password: "", confirm: "" });

      // If you want to redirect after register:
      // navigate('/login');
    } catch (err) {
      setStatus("error");
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        "Something went wrong. Please try again.";
      setServerMsg(msg);
    }
  };

  const isLoading = status === "loading";

  return (
    <div className="register-page">
      {/* Decorative background blobs */}
      <div className="register-blob1" />
      <div className="register-blob2" />

      <div className="register-card">
        {/* Logo / brand */}
        <div className="register-brand">
          <div className="register-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#6C63FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="register-brand-name">TeamCollab</span>
        </div>

        <h1 className="register-title">Create your account</h1>
        <p className="register-subtitle">
          Join your team on TeamCollab and start collaborating
        </p>

        {/* Success banner */}
        {status === "success" && (
          <div className="register-banner register-banner-success">
            <span className="register-banner-icon">✓</span>
            <span>{serverMsg}</span>
            <span className="register-banner-close" onClick={() => setStatus("idle")}>
              ✕
            </span>
          </div>
        )}

        {/* Error banner */}
        {status === "error" && (
          <div className="register-banner register-banner-error">
            <span className="register-banner-icon">✕</span>
            <span>{serverMsg}</span>
            <span className="register-banner-close" onClick={() => setStatus("idle")}>
              ✕
            </span>
          </div>
        )}

        {/* Form fields */}
        <div className="register-form">
          <Field
            label="Full name"
            id="name"
            value={form.name}
            onChange={set("name")}
            error={errors.name}
            placeholder="Ali Khan"
          />
          <Field
            label="Email address"
            id="email"
            type="email"
            value={form.email}
            onChange={set("email")}
            error={errors.email}
            placeholder="ali@company.com"
          />

          {/* Password with show/hide */}
          <div className="register-field">
            <label htmlFor="password" className="register-label">
              Password
            </label>
            <div className="register-password-wrap">
              <input
                id="password"
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password")(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className={`register-input register-input--password ${
                  errors.password ? "register-input--error" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="register-toggle-btn"
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <span className="register-error-text">{errors.password}</span>
            )}
            {/* Password strength indicator */}
            {form.password.length > 0 && (
              <PasswordStrength password={form.password} />
            )}
          </div>

          <Field
            label="Confirm password"
            id="confirm"
            type="password"
            value={form.confirm}
            onChange={set("confirm")}
            error={errors.confirm}
            placeholder="Re-enter your password"
          />
        </div>

        {/* Submit button */}
        <button onClick={handleSubmit} disabled={isLoading} className="register-btn">
          {isLoading ? (
            <span className="register-btn-loading-content">
              <Spinner /> Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </button>

        <p className="register-login-link">
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}

// ---------- Password strength bar ----------
function PasswordStrength({ password }) {
  const score = getStrength(password);
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["#E24B4A", "#EF9F27", "#639922", "#0F6E56"];

  return (
    <div className="register-strength">
      <div className="register-strength-bars">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="register-strength-bar"
            style={{
              background: i < score ? colors[score - 1] : undefined,
            }}
          />
        ))}
      </div>
      <span
        className="register-strength-label"
        style={{ color: score > 0 ? colors[score - 1] : undefined }}
      >
        {score > 0 ? labels[score - 1] : ""}
      </span>
    </div>
  );
}

function getStrength(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

// ---------- Spinner ----------
function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="register-spinner"
    >
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}