import { useState, useEffect, useMemo, useRef } from "react";
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import {
  PieChart, Pie, Cell, ComposedChart, Bar, Line, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Wallet, TrendingUp, TrendingDown, Coins, Trash2, Plus, Lock, Eye, EyeOff, Mic, MicOff } from "lucide-react";
import Chatbot from "./Chatbot";
import { BannerArt } from "./Art";
import { api, money, busy } from "./api";
import { speechSupported, listen, voiceError, getVoiceLang, parseVoiceTransaction } from "./voice";

const CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;
const EXPENSE_CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Other"];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Gift", "Investment", "Other"];
const COLORS = ["#6d28d9", "#f5b82e", "#a78bfa", "#d946ef", "#d99a0b", "#4c1d95", "#c4b5fd"];
const EXPENSE_EMOJI = { Food: "🍔", Transport: "🚌", Shopping: "🛍️", Bills: "🧾", Entertainment: "🎬", Health: "💊", Other: "📦" };
const INCOME_EMOJI = { Salary: "💼", Freelance: "💻", Gift: "🎁", Investment: "📈", Other: "✨" };
const PERIODS = [
  { id: "month", label: "This month" },
  { id: "30", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

// ----- Security timers (change these numbers if you want) -----
const IDLE_BLUR_MS = 30 * 1000;   // nobody touched the page for 30 s -> amounts blur
const IDLE_WARN_MS = 105 * 1000;  // 1 min 45 s -> "locking soon" message
const IDLE_LOCK_MS = 120 * 1000;  // 2 min -> auto lock (logout)
const HIDDEN_LOCK_MS = 60 * 1000; // tab in the background for 1 min -> auto lock

const INK = "#231f33";
const MUTED = "#6e6a80";
const LINE = "#e3dcf4";
const TOOLTIP_STYLE = { background: "#ffffff", border: `1px solid ${LINE}`, borderRadius: 10, color: INK };

const emptyBudgets = () => Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0]));
const colorOf = (name) => COLORS[Math.max(0, EXPENSE_CATEGORIES.indexOf(name)) % COLORS.length];
const emojiOf = (cat, type) => (type === "income" ? INCOME_EMOJI[cat] || "💰" : EXPENSE_EMOJI[cat] || "🧾");

const localDate = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function inPeriod(date, period) {
  if (period === "all") return true;
  if (period === "month") return String(date).slice(0, 7) === localDate().slice(0, 7);
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return date >= localDate(d);
}

// Numbers glide to their new value
function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const to = target;
    if (from === to) return undefined;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (to - from) * eased);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prev.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function Stat({ icon, tone, value, label }) {
  const v = useCountUp(value);
  return (
    <div className="card stat hover">
      <div className={`icon ${tone}`}>{icon}</div>
      <div>
        <div className="val sens">{money(v)}</div>
        <div className="lbl">{label}</div>
      </div>
    </div>
  );
}

function Empty({ emoji, title, hint }) {
  return (
    <div className="empty-state">
      <div className="empty-emoji">{emoji}</div>
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}

function Ring({ pct }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="68" height="68" viewBox="0 0 64 64" className="ring">
      <circle cx="32" cy="32" r={r} className="ring-bg" />
      <circle
        cx="32" cy="32" r={r} className="ring-fg"
        strokeDasharray={c}
        strokeDashoffset={c - (c * pct) / 100}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="36" textAnchor="middle" className="ring-text">{Math.round(pct)}%</text>
    </svg>
  );
}

// The PayPal button is ALWAYS visible. It asks for an amount if the box is empty.
function PayPalFund({ goal, onPaid }) {
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const amountRef = useRef(0);

  const value = parseFloat(amount);
  const valid = value > 0 && value <= 10000;
  amountRef.current = valid ? Math.round(value * 100) / 100 : 0;

  return (
    <div className="pp">
      <input
        type="number"
        placeholder="Amount to fund with PayPal (USD)"
        value={amount}
        onChange={(e) => { setAmount(e.target.value); setMsg(""); }}
      />
      <div className="pp-chips">
        {[5, 10, 25, 50].map((n) => (
          <button key={n} type="button" className="chip" onClick={() => { setAmount(String(n)); setMsg(""); }}>
            ${n}
          </button>
        ))}
      </div>

      {isPending && <div className="empty">Loading PayPal...</div>}
      {isRejected && (
        <div className="banner">
          PayPal could not load. Check VITE_PAYPAL_CLIENT_ID in .env, then restart npm run dev.
        </div>
      )}

      {!isRejected && (
        <PayPalButtons
          style={{ layout: "horizontal", height: 38, tagline: false }}
          onClick={(data, actions) => {
            if (!amountRef.current) {
              setMsg("Type an amount first (1 to 10000) or tap $5, $10, $25, $50.");
              return actions.reject();
            }
            busy.start();
            setMsg("");
            return actions.resolve();
          }}
          createOrder={async () => {
            const { ok, data } = await api("/api/paypal/create-order", {
              method: "POST",
              body: { amount: amountRef.current, goalName: goal.name },
            });
            if (!ok || !data.id) throw new Error(data.error || "Could not create order");
            return data.id;
          }}
          onApprove={async (approval) => {
            try {
              const { ok, data } = await api("/api/paypal/capture-order", {
                method: "POST",
                body: { orderID: approval.orderID, goalId: goal.id, goalName: goal.name },
              });
              if (!ok || data.status !== "COMPLETED") {
                setMsg("Payment was not completed.");
                return;
              }
              onPaid(goal.id, data.payment);
              setAmount("");
              setMsg(`Added ${money(data.payment.amount)} via PayPal ✅`);
            } finally {
              busy.stop();
            }
          }}
          onCancel={() => { busy.stop(); setMsg("Payment cancelled."); }}
          onError={(err) => { busy.stop(); setMsg("PayPal error: " + (err?.message || "please try again")); }}
        />
      )}
      {msg && <div className="empty">{msg}</div>}
    </div>
  );
}

export default function Dashboard({ user, onLogout }) {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState(emptyBudgets());
  const [goals, setGoals] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const [period, setPeriod] = useState("month");
  const [txTab, setTxTab] = useState("all");
  const [selectedCat, setSelectedCat] = useState(null);
  const [hidden, setHidden] = useState(true); // amounts are hidden until you click Show
  const [warn, setWarn] = useState(false);

  const [form, setForm] = useState({
    type: "expense", title: "", amount: "", category: "Food", date: localDate(),
  });
  const [goalForm, setGoalForm] = useState({ name: "", target: "" });
  const [goalInputs, setGoalInputs] = useState({});

  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const recRef = useRef(null);

  // Load this user's data
  useEffect(() => {
    api("/api/state")
      .then(({ ok, data }) => {
        if (!ok) {
          if (data.error) setError(data.error);
          return;
        }
        setTransactions(data.transactions || []);
        setBudgets({ ...emptyBudgets(), ...(data.budgets || {}) });
        setGoals(data.goals || []);
        setPayments(data.payments || []);
        setLoaded(true);
      })
      .catch(() => setError("Backend is not running. Open a second terminal and run: node server/index.js"));
  }, []);

  // Save this user's data
  useEffect(() => {
    if (!loaded) return undefined;
    const t = setTimeout(() => {
      api("/api/state", { method: "PUT", body: { transactions, budgets, goals } }).catch(() =>
        setError("Could not save. Is the backend running?")
      );
    }, 400);
    return () => clearTimeout(t);
  }, [transactions, budgets, goals, loaded]);

  // SECURITY 1: idle timers (blur, warning, lock). They wait while a PayPal payment is open.
  useEffect(() => {
    let tBlur;
    let tWarn;
    let tLock;
    const clearAll = () => {
      clearTimeout(tBlur);
      clearTimeout(tWarn);
      clearTimeout(tLock);
    };
    const arm = () => {
      clearAll();
      setWarn(false);
      tBlur = setTimeout(() => (busy.active() ? arm() : setHidden(true)), IDLE_BLUR_MS);
      tWarn = setTimeout(() => (busy.active() ? arm() : setWarn(true)), IDLE_WARN_MS);
      tLock = setTimeout(() => (busy.active() ? arm() : onLogout()), IDLE_LOCK_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      clearAll();
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [onLogout]);

  // SECURITY 2: leaving the tab blurs everything, and locks after 1 minute
  useEffect(() => {
    let t;
    const onVisibility = () => {
      if (document.hidden) {
        setHidden(true);
        t = setTimeout(() => {
          if (!busy.active()) onLogout();
        }, HIDDEN_LOCK_MS);
      } else {
        clearTimeout(t);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [onLogout]);

  // SECURITY 3: Esc hides everything instantly
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setHidden(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => () => recRef.current?.abort?.(), []);

  const periodTx = useMemo(
    () => transactions.filter((t) => inPeriod(t.date, period)),
    [transactions, period]
  );

  const totals = useMemo(() => {
    const income = periodTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = periodTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const saved = goals.reduce((s, g) => s + g.saved, 0);
    return { income, expense, balance: income - expense, saved };
  }, [periodTx, goals]);

  const spentByCategory = useMemo(() => {
    const map = {};
    periodTx
      .filter((t) => t.type === "expense")
      .forEach((t) => (map[t.category] = (map[t.category] || 0) + t.amount));
    return map;
  }, [periodTx]);

  // Monthly budgets and the greeting always use the current month
  const monthSpent = useMemo(() => {
    const map = {};
    transactions
      .filter((t) => t.type === "expense" && inPeriod(t.date, "month"))
      .forEach((t) => (map[t.category] = (map[t.category] || 0) + t.amount));
    return map;
  }, [transactions]);

  const monthIncome = useMemo(
    () => transactions.filter((t) => t.type === "income" && inPeriod(t.date, "month")).reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const monthExpense = Object.values(monthSpent).reduce((s, v) => s + v, 0);

  const hasBudgets = EXPENSE_CATEGORIES.some((c) => (budgets[c] || 0) > 0);
  const overBudget = EXPENSE_CATEGORIES.filter((c) => (budgets[c] || 0) > 0 && (monthSpent[c] || 0) > budgets[c]);

  const pieData = Object.entries(spentByCategory).map(([name, value]) => ({ name, value }));

  const flowData = useMemo(() => {
    const map = {};
    periodTx.forEach((t) => {
      map[t.date] = map[t.date] || { date: t.date, income: 0, expense: 0 };
      map[t.date][t.type] += t.amount;
    });
    let run = 0;
    return Object.values(map)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        run += d.income - d.expense;
        return { ...d, balance: Math.round(run * 100) / 100 };
      });
  }, [periodTx]);

  const shownList = periodTx
    .filter((t) => txTab === "all" || t.type === txTab)
    .filter((t) => !selectedCat || t.category === selectedCat);

  const toggleCategory = (name) => {
    if (!name) return;
    if (selectedCat === name) {
      setSelectedCat(null);
    } else {
      setSelectedCat(name);
      setTxTab("expense");
    }
  };

  const changeType = (type) =>
    setForm({ ...form, type, category: type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] });

  const addTransaction = () => {
    const amount = Math.round(parseFloat(form.amount) * 100) / 100;
    if (!form.title.trim() || !amount || amount <= 0 || amount > 1e9) {
      return alert("Enter a title and a valid amount");
    }
    setTransactions([
      { id: Date.now(), type: form.type, title: form.title.trim().slice(0, 60), amount, category: form.category, date: form.date },
      ...transactions,
    ]);
    setForm({ ...form, title: "", amount: "" });
    setVoiceNote("");
  };

  // Speak a transaction: it only fills the form, you check it and press Add
  const speakTransaction = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    if (!speechSupported()) {
      setVoiceNote("Voice works in Chrome or Edge.");
      return;
    }
    setVoiceNote("");
    let heard = "";
    let failed = false;
    try {
      recRef.current = listen({
        lang: getVoiceLang(),
        onResult: (text) => {
          heard = text;
          setVoiceNote(`Listening: ${text}`);
        },
        onError: (code) => {
          failed = true;
          setVoiceNote(voiceError(code));
        },
        onEnd: () => {
          setListening(false);
          if (!heard.trim()) {
            if (!failed) setVoiceNote("I didn't hear anything. Tap the mic and try again.");
            return;
          }
          const parsed = parseVoiceTransaction(heard);
          if (!parsed) {
            setVoiceNote(`Heard "${heard}" but found no amount. Say for example: spent 250 on food.`);
            return;
          }
          setForm((f) => ({
            ...f,
            type: parsed.type,
            category: parsed.category,
            title: parsed.title,
            amount: String(parsed.amount),
            date: parsed.date,
          }));
          setVoiceNote(`Heard "${heard}". Check the form above and press Add.`);
        },
      });
      setListening(true);
    } catch {
      setVoiceNote("Could not start the microphone.");
    }
  };

  const deleteTransaction = (id) => setTransactions(transactions.filter((t) => t.id !== id));

  const addGoal = () => {
    const target = parseFloat(goalForm.target);
    if (!goalForm.name.trim() || !target || target <= 0) return alert("Enter a goal name and target");
    setGoals([...goals, { id: Date.now(), name: goalForm.name.trim().slice(0, 40), target, saved: 0 }]);
    setGoalForm({ name: "", target: "" });
  };

  const addToGoal = (id) => {
    const amt = parseFloat(goalInputs[id]);
    if (!amt || amt <= 0) return;
    setGoals(goals.map((g) => (g.id === id ? { ...g, saved: g.saved + amt } : g)));
    setGoalInputs({ ...goalInputs, [id]: "" });
  };

  const deleteGoal = (id) => setGoals(goals.filter((g) => g.id !== id));

  const onPaid = (goalId, payment) => {
    setGoals((gs) => gs.map((g) => (g.id === goalId ? { ...g, saved: g.saved + payment.amount } : g)));
    setPayments((p) => [payment, ...p]);
  };

  const periodLabel = PERIODS.find((p) => p.id === period).label;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const rawName = (user.name || (user.email || "").split("@")[0] || "there").trim();
  const firstName = rawName.split(/[\s._-]+/)[0] || "there";
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  if (!loaded) {
    return (
      <div className="app">
        <div className="header"><h1>💰 AI Finance Assistant</h1></div>
        <div className="card">{error || "Loading..."}</div>
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={{ clientId: CLIENT_ID || "test", currency: "USD", intent: "capture" }}>
      <div className={`app ${hidden ? "blur-on" : ""}`}>
        <div className="header">
          <h1>💰 AI Finance Assistant</h1>
          <div className="header-right">
            <span className="muted">{user.email}</span>
            <button className="btn small ghost" onClick={() => setHidden(!hidden)} title="Hide or show amounts (Esc hides)">
              {hidden ? <EyeOff size={15} /> : <Eye size={15} />} {hidden ? "Show" : "Hide"}
            </button>
            <button className="btn small ghost" onClick={onLogout} title="Lock and log out">
              <Lock size={15} /> Lock
            </button>
          </div>
        </div>

        {error && <div className="banner">{error}</div>}
        {!CLIENT_ID && (
          <div className="banner">VITE_PAYPAL_CLIENT_ID is missing in .env. Add it, then restart npm run dev.</div>
        )}
        {hidden && (
          <div className="notice privacy">
            🔒 Privacy mode: amounts are hidden. Click <b>Show</b> to reveal them. They hide again when you are away.
            Press <b>Esc</b> to hide instantly.
          </div>
        )}

        {/* Greeting banner */}
        <div className="hero">
          <div className="hero-photo" />
          <div className="hero-text">
            <h2>{greeting}, {displayName} 👋</h2>
            <p>
              This month you earned <b className="sens">{money(monthIncome)}</b> and spent{" "}
              <b className="sens">{money(monthExpense)}</b>.
            </p>
            <div className="hero-pills">
              <span className="hpill">🎯 Savings <span className="sens">{money(totals.saved)}</span></span>
              {overBudget.length > 0 ? (
                <span className="hpill warn">⚠️ Over budget: {overBudget.join(", ")}</span>
              ) : hasBudgets ? (
                <span className="hpill">✅ All budgets on track</span>
              ) : (
                <span className="hpill">💡 Set monthly budgets below</span>
              )}
            </div>
          </div>
          <BannerArt className="hero-art-sm" />
        </div>

        {/* Period switch */}
        <div className="toolbar">
          <div className="seg">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                className={`seg-btn ${period === p.id ? "on" : ""}`}
                onClick={() => { setPeriod(p.id); setSelectedCat(null); }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {selectedCat && (
            <button className="pill" onClick={() => setSelectedCat(null)}>
              Filter: {selectedCat} ✕
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="cards">
          <Stat icon={<Wallet size={22} />} tone="violet" value={totals.balance} label={`Balance (${periodLabel})`} />
          <Stat icon={<TrendingUp size={22} />} tone="gold" value={totals.income} label="Income" />
          <Stat icon={<TrendingDown size={22} />} tone="rose" value={totals.expense} label="Expenses" />
          <Stat icon={<Coins size={22} />} tone="lilac" value={totals.saved} label="Total Savings" />
        </div>

        {/* Charts */}
        <div className="grid2">
          <div className="card">
            <h3>Spending by Category <small className="muted">(click a slice)</small></h3>
            {pieData.length === 0 ? (
              <Empty emoji="🥧" title="No expenses in this period" hint="Add an expense below to see the chart." />
            ) : (
              <>
                <div className="donut">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={3}
                        stroke="none"
                        onClick={(d) => toggleCategory(d?.name ?? d?.payload?.name)}
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={colorOf(entry.name)}
                            fillOpacity={selectedCat && selectedCat !== entry.name ? 0.25 : 1}
                            style={{ cursor: "pointer", outline: "none" }}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => money(v)} contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center">
                    <div className="sens big">{money(totals.expense)}</div>
                    <small className="muted">spent</small>
                  </div>
                </div>
                <div className="legend">
                  {pieData.map((p) => (
                    <button
                      key={p.name}
                      className={`legend-item ${selectedCat === p.name ? "on" : ""}`}
                      onClick={() => toggleCategory(p.name)}
                    >
                      <i style={{ background: colorOf(p.name) }} />
                      {p.name} <span className="sens">{money(p.value)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <h3>Cash Flow <small className="muted">(income, expenses and running balance)</small></h3>
            {flowData.length === 0 ? (
              <Empty emoji="📊" title="No data in this period" hint="Add income or expenses to see your cash flow." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={flowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={LINE} />
                  <XAxis dataKey="date" stroke={MUTED} tickFormatter={(d) => d.slice(5)} />
                  <YAxis stroke={MUTED} />
                  <Tooltip formatter={(v) => money(v)} contentStyle={TOOLTIP_STYLE} labelStyle={{ color: INK }} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="balance" name="Running balance" stroke="#d99a0b" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Transactions */}
        <div className="grid2">
          <div className="card">
            <h3>Add Transaction</h3>
            <div className="form">
              <select value={form.type} onChange={(e) => changeType(e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {(form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{emojiOf(c, form.type)} {c}</option>
                ))}
              </select>
              <input
                className="full"
                placeholder={form.type === "income" ? "Title (e.g. Monthly salary)" : "Title (e.g. Groceries)"}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <input
                type="number"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <button className="btn full" onClick={addTransaction}>
                <Plus size={16} /> Add {form.type === "income" ? "Income" : "Expense"}
              </button>
              <button type="button" className={`btn ghost full ${listening ? "listening" : ""}`} onClick={speakTransaction}>
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
                {listening ? "Listening... tap to stop" : "Add by voice: “spent 250 on food”"}
              </button>
              {voiceNote && <div className="voice-note full sens">{voiceNote}</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Transactions</h3>
              <div className="seg">
                {[["all", "All"], ["income", "Income"], ["expense", "Expense"]].map(([id, label]) => (
                  <button
                    key={id}
                    className={`seg-btn ${txTab === id ? "on" : ""}`}
                    onClick={() => setTxTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="list">
              {shownList.length === 0 && (
                <Empty emoji="🧾" title="Nothing here yet" hint="Your transactions will appear here." />
              )}
              {shownList.map((t) => (
                <div className="tx" key={t.id}>
                  <div className="tx-left">
                    <div className={`cat-icon ${t.type}-bg`}>{emojiOf(t.category, t.type)}</div>
                    <div className="l">
                      <span className="sens">{t.title}</span>
                      <small>{t.category} • {t.date}</small>
                    </div>
                  </div>
                  <div className="r">
                    <span className={`${t.type} sens`}>{t.type === "income" ? "+" : "-"}{money(t.amount)}</span>
                    <button className="del" onClick={() => deleteTransaction(t.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Budgets + Goals */}
        <div className="grid2">
          <div className="card">
            <h3>Monthly Budgets <small className="muted">(this month)</small></h3>
            {EXPENSE_CATEGORIES.map((c) => {
              const spent = monthSpent[c] || 0;
              const limit = budgets[c] || 0;
              const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
              const cls = limit > 0 && spent > limit ? "over" : pct > 80 ? "warn" : "";
              return (
                <div className="budget-row" key={c}>
                  <div className="top">
                    <span className="clickable" onClick={() => toggleCategory(c)}>
                      {EXPENSE_EMOJI[c]} {c} <small className="muted sens">({money(spent)} spent)</small>
                    </span>
                    <input
                      type="number"
                      className="sens"
                      placeholder="Limit"
                      value={budgets[c] || ""}
                      onChange={(e) => setBudgets({ ...budgets, [c]: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="bar"><div className={cls} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <h3>Savings Goals</h3>
            <div className="form" style={{ marginBottom: 18 }}>
              <input
                placeholder="Goal (e.g. Laptop)"
                value={goalForm.name}
                onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="Target amount"
                value={goalForm.target}
                onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })}
              />
              <button className="btn full" onClick={addGoal}><Plus size={16} /> Add Goal</button>
            </div>
            {goals.length === 0 && (
              <Empty emoji="🎯" title="No goals yet" hint="Create one above, for example Laptop with target 1000." />
            )}
            {goals.map((g) => {
              const pct = g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0;
              return (
                <div className="goal" key={g.id}>
                  <div className="goal-head">
                    <Ring pct={pct} />
                    <div className="goal-info">
                      <strong>{g.name}</strong>
                      <span className="sens">{money(g.saved)} / {money(g.target)}</span>
                    </div>
                    <button className="del" onClick={() => deleteGoal(g.id)}><Trash2 size={16} /></button>
                  </div>
                  <div className="actions">
                    <input
                      type="number"
                      placeholder="Add manually (no PayPal)"
                      value={goalInputs[g.id] || ""}
                      onChange={(e) => setGoalInputs({ ...goalInputs, [g.id]: e.target.value })}
                    />
                    <button className="btn small" onClick={() => addToGoal(g.id)}>Add</button>
                  </div>
                  <PayPalFund goal={g} onPaid={onPaid} />
                </div>
              );
            })}
          </div>
        </div>

        {/* PayPal payments */}
        <div className="card">
          <h3>PayPal Payments (Sandbox)</h3>
          <div className="list">
            {payments.length === 0 && (
              <Empty emoji="💸" title="No PayPal payments yet" hint="Fund a goal with PayPal to see it here." />
            )}
            {payments.map((p) => (
              <div className="tx" key={p.id}>
                <div className="tx-left">
                  <div className="cat-icon pay-bg">💸</div>
                  <div className="l">
                    {p.goalName || "Savings goal"}
                    <small>{p.payer} • {new Date(p.date).toLocaleString()} • {p.id}</small>
                  </div>
                </div>
                <div className="r"><span className="income sens">+{money(p.amount)}</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Chatbot */}
        <Chatbot goals={goals} onPaid={onPaid} />

        {warn && (
          <div className="lock-toast">
            🔒 Locking in a few seconds because you are inactive. Move the mouse to stay logged in.
          </div>
        )}
      </div>
    </PayPalScriptProvider>
  );
}