export const API = "http://localhost:5000";

const TOKEN_KEY = "afa_token";

// sessionStorage: the login is forgotten when the tab is closed
export const getToken = () => sessionStorage.getItem(TOKEN_KEY) || "";
export const setToken = (t) => (t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY));

export const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

// While a PayPal window is open, the auto-lock waits (for at most 5 minutes)
export const busy = {
  until: 0,
  start() { this.until = Date.now() + 5 * 60 * 1000; },
  stop() { this.until = 0; },
  active() { return Date.now() < this.until; },
};

export async function api(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    // response was not JSON
  }
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    window.dispatchEvent(new Event("afa-unauthorized"));
  }
  return { ok: res.ok, status: res.status, data };
}