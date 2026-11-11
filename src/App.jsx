import { useState, useCallback, useEffect } from "react";
import "./App.css";
import Login from "./Login";
import Dashboard from "./Dashboard";
import { api, getToken, setToken } from "./api";

export default function App() {
  const [user, setUser] = useState(() =>
    getToken()
      ? { email: sessionStorage.getItem("afa_email") || "", name: sessionStorage.getItem("afa_name") || "" }
      : null
  );

  // Lock / logout: the token is also killed on the server, so it can never be reused
  const logout = useCallback(() => {
    if (getToken()) api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setToken("");
    sessionStorage.removeItem("afa_email");
    sessionStorage.removeItem("afa_name");
    setUser(null);
  }, []);

  // Any "please log in" answer from the backend sends the user back to the login screen
  useEffect(() => {
    window.addEventListener("afa-unauthorized", logout);
    return () => window.removeEventListener("afa-unauthorized", logout);
  }, [logout]);

  if (!user) return <Login onLogin={setUser} />;
  return <Dashboard user={user} onLogout={logout} />;
}