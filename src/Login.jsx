import { useState, useEffect } from "react";
import { Lock, Mail, User, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { api, setToken } from "./api";
import { HeroArt } from "./Art";

const HAS_ACCOUNT = "afa_has_account";
const LAST_EMAIL = "afa_last_email";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState(localStorage.getItem(HAS_ACCOUNT) === "1" ? "login" : "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(localStorage.getItem(LAST_EMAIL) || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [backendDown, setBackendDown] = useState(false);

  // Ask the backend if any account exists: no account -> Sign up, otherwise -> Log in
  useEffect(() => {
    api("/api/auth/status")
      .then(({ ok, data }) => {
        if (!ok) {
          setBackendDown(true);
          return;
        }
        if (!data.hasUsers) {
          setMode("signup");
          setNotice("No account yet. Create yours now (one time only). From the next visit you just log in.");
        } else {
          setMode("login");
        }
      })
      .catch(() => setBackendDown(true));
  }, []);

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setPassword("");
    setConfirm("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (mode === "signup") {
      if (password.length < 8) return setError("Password must be at least 8 characters");
      if (password !== confirm) return setError("Passwords do not match");
    }
    setBusy(true);
    try {
      const path = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
      const { ok, status, data } = await api(path, { method: "POST", body: { name, email, password } });
      if (!ok) {
        setError(data.error || `Server error (${status}). Restart the backend: Ctrl+C, then node server/index.js`);
        return;
      }
      setToken(data.token);
      sessionStorage.setItem("afa_email", data.email);
      sessionStorage.setItem("afa_name", data.name || "");
      localStorage.setItem(HAS_ACCOUNT, "1");
      localStorage.setItem(LAST_EMAIL, data.email);
      onLogin({ email: data.email, name: data.name || "" });
    } catch {
      setError("Cannot reach the backend. Open a terminal and run: node server/index.js");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-hero">
        <div className="auth-photo" />
        <div className="auth-content">
          <div className="brand">💰 AI Finance Assistant</div>
          <h2>Your money, finally under control.</h2>
          <p>Track spending, set budgets, chat with an AI coach and fund your savings goals with PayPal.</p>
          <HeroArt className="auth-art" />
          <ul className="auth-points">
            <li>🔒 Private to your account</li>
            <li>🤖 AI advice from your own data</li>
            <li>💸 PayPal Sandbox payments</li>
          </ul>
        </div>
      </div>

      <div className="auth-side">
        <form className="card auth-card" onSubmit={submit}>
          <div className="auth-icon"><Lock size={24} /></div>
          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="muted">
            {mode === "login" ? "Log in to open your private dashboard." : "One time only. Next time you just log in."}
          </p>

          <div className="seg wide">
            <button type="button" className={`seg-btn ${mode === "login" ? "on" : ""}`} onClick={() => switchMode("login")}>
              Log in
            </button>
            <button type="button" className={`seg-btn ${mode === "signup" ? "on" : ""}`} onClick={() => switchMode("signup")}>
              Sign up
            </button>
          </div>

          {backendDown && (
            <div className="banner">
              The backend is not running (or is an old version). Stop it with Ctrl+C, then run: node server/index.js
            </div>
          )}
          {notice && !backendDown && mode === "signup" && <div className="notice">{notice}</div>}

          {mode === "signup" && (
            <label className="field">
              <User size={16} />
              <input
                placeholder="Your name"
                autoComplete="name"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          )}

          <label className="field">
            <Mail size={16} />
            <input
              type="email"
              placeholder="Email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="field">
            <Lock size={16} />
            <input
              type={show ? "text" : "password"}
              placeholder={mode === "signup" ? "Password (min 8 characters)" : "Password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" className="eye" onClick={() => setShow(!show)} title="Show or hide password">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </label>

          {mode === "signup" && (
            <label className="field">
              <Lock size={16} />
              <input
                type={show ? "text" : "password"}
                placeholder="Confirm password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </label>
          )}

          {error && <div className="banner" style={{ marginBottom: 0 }}>{error}</div>}

          <button className="btn big" type="submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>

          <div className="secure"><ShieldCheck size={14} /> Passwords are hashed. PayPal Sandbox = test money only.</div>
        </form>
      </div>
    </div>
  );
}