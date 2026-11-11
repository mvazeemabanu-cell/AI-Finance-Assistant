// Voice helpers: speech to text and text to speech. Works in Chrome and Edge (needs internet + microphone permission).

const LANG_KEY = "afa_voice_lang";
export const getVoiceLang = () => localStorage.getItem(LANG_KEY) || "en-IN";
export const setVoiceLang = (l) => localStorage.setItem(LANG_KEY, l);

export const speechSupported = () =>
  typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export const hasTamil = (text) => /[\u0B80-\u0BFF]/.test(text || "");

export function listen({ lang, onResult, onError, onEnd }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    let text = "";
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
    onResult?.(text.trim());
  };
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => onEnd?.();
  rec.start();
  return rec;
}

export function voiceError(code) {
  if (code === "not-allowed" || code === "service-not-allowed")
    return "Microphone is blocked. Click the lock icon in the address bar, allow Microphone, then refresh.";
  if (code === "no-speech") return "I didn't hear anything. Click the mic and try again.";
  if (code === "audio-capture") return "No microphone found. Check your mic or Windows sound settings.";
  if (code === "network") return "Voice needs internet (Chrome sends the audio to Google). Check your connection.";
  if (code === "aborted") return "";
  return `Voice error: ${code}`;
}

export function speak(text, lang = "en-IN") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const clean = String(text || "").replace(/\(Offline mode\)\s*/g, "").replace(/\$/g, " dollars ").replace(/\s+/g, " ");
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = lang;
  u.rate = 1;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

// ---------- "spent 250 on food" -> a transaction ----------
const EXPENSE_WORDS = {
  Food: ["food", "groceries", "grocery", "lunch", "dinner", "breakfast", "restaurant", "hotel", "snacks", "tea", "coffee", "biryani", "swiggy", "zomato", "சாப்பாடு", "உணவு"],
  Transport: ["transport", "bus", "auto", "taxi", "cab", "uber", "ola", "petrol", "fuel", "train", "metro", "பஸ்", "பெட்ரோல்"],
  Shopping: ["shopping", "clothes", "shirt", "dress", "shoes", "amazon", "flipkart", "mall"],
  Bills: ["bill", "bills", "rent", "electricity", "recharge", "wifi", "internet", "water", "emi"],
  Entertainment: ["movie", "movies", "cinema", "game", "games", "netflix", "party", "fun", "entertainment"],
  Health: ["health", "medicine", "medical", "doctor", "hospital", "pharmacy", "tablet"],
};
const INCOME_WORDS = {
  Salary: ["salary", "stipend", "payroll", "சம்பளம்"],
  Freelance: ["freelance", "project", "client"],
  Gift: ["gift", "gifted"],
  Investment: ["investment", "dividend", "interest", "stock", "stocks", "returns"],
};

const has = (text, word) =>
  /^[a-z ]+$/.test(word) ? new RegExp(`\\b${word}\\b`).test(text) : text.includes(word);

const localDate = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function parseVoiceTransaction(raw) {
  const text = String(raw || "").toLowerCase().replace(/,/g, "");
  const m = text.match(/(\d+(?:\.\d+)?)(?:\s*(k|thousand)(?![a-z]))?/);
  if (!m) return null;
  const amount = Math.round(parseFloat(m[1]) * (m[2] ? 1000 : 1) * 100) / 100;
  if (!amount || amount <= 0) return null;

  const isIncome =
    /\b(earned|received|credited|income|salary|stipend|deposited|deposit|freelance|dividend|got paid)\b/.test(text) ||
    text.includes("சம்பளம்") ||
    text.includes("வருமானம்");
  const type = isIncome ? "income" : "expense";

  const table = isIncome ? INCOME_WORDS : EXPENSE_WORDS;
  let category = "Other";
  for (const [cat, words] of Object.entries(table)) {
    if (words.some((w) => has(text, w))) {
      category = cat;
      break;
    }
  }

  const d = new Date();
  if (/\byesterday\b/.test(text) || text.includes("நேற்று")) d.setDate(d.getDate() - 1);

  const title = (raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1)).slice(0, 60);
  return { type, amount, category, title, date: localDate(d) };
}