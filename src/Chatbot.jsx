import { useState, useRef, useEffect } from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { Send, Bot, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { api, money, busy } from "./api";
import {
  speechSupported, listen, speak, stopSpeaking, voiceError,
  getVoiceLang, setVoiceLang, hasTamil,
} from "./voice";

const QUICK = [
  "Where am I overspending?",
  "Summarize my finances",
  "Help me save for my goal",
];

export default function Chatbot({ goals, onPaid }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I'm your finance assistant. Type or tap the mic and speak. Ask me about your spending, budgets or savings goals.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [secs, setSecs] = useState(0);
  const [lang, setLang] = useState(getVoiceLang());
  const [listening, setListening] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [voiceNote, setVoiceNote] = useState(speechSupported() ? "" : "Voice works in Chrome or Edge.");

  const endRef = useRef(null);
  const recRef = useRef(null);
  const messagesRef = useRef(messages);
  const loadingRef = useRef(false);
  const readRef = useRef(false);
  messagesRef.current = messages;
  readRef.current = readAloud;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Seconds counter while the AI is thinking
  useEffect(() => {
    if (!loading) {
      setSecs(0);
      return undefined;
    }
    const i = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [loading]);

  useEffect(
    () => () => {
      recRef.current?.abort?.();
      stopSpeaking();
    },
    []
  );

  const send = async (textArg, viaVoice = false) => {
    const text = (textArg ?? input).trim();
    if (!text || loadingRef.current) return;
    const history = messagesRef.current.slice(1).map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    loadingRef.current = true;
    try {
      const { ok, data } = await api("/api/chat", { method: "POST", body: { message: text, history } });
      if (!ok) throw new Error(data.error || "AI error");
      setMessages((m) => [...m, { role: "assistant", text: data.reply, suggestion: data.suggestion }]);
      if (viaVoice || readRef.current) speak(data.reply, hasTamil(data.reply) ? "ta-IN" : "en-IN");
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "Sorry, something went wrong: " + e.message }]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Speak your question: it is sent automatically when you stop talking
  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    if (!speechSupported()) {
      setVoiceNote("Voice works in Chrome or Edge.");
      return;
    }
    stopSpeaking();
    setVoiceNote("");
    setInput("");
    let heard = "";
    let failed = false;
    try {
      recRef.current = listen({
        lang,
        onResult: (t) => {
          heard = t;
          setInput(t);
        },
        onError: (code) => {
          failed = true;
          setVoiceNote(voiceError(code));
        },
        onEnd: () => {
          setListening(false);
          if (heard.trim()) send(heard, true);
          else if (!failed) setVoiceNote("I didn't hear anything. Click the mic and try again.");
        },
      });
      setListening(true);
    } catch {
      setVoiceNote("Could not start the microphone.");
    }
  };

  const markPaid = (index, payment) =>
    setMessages((m) =>
      m.map((msg, i) =>
        i === index
          ? { ...msg, paid: true, text: msg.text + `\n\n✅ Paid ${money(payment.amount)} via PayPal to "${payment.goalName}".` }
          : msg
      )
    );

  return (
    <div className="card chat">
      <h3><Bot size={16} style={{ verticalAlign: "middle" }} /> AI Finance Chatbot</h3>

      <div className="chat-box">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="bubble">{m.text}</div>

            {m.suggestion && !m.paid && goals.some((g) => g.id === m.suggestion.goalId) && (
              <div className="suggest">
                <div>
                  <strong>
                    Suggested: add {money(m.suggestion.amount)} to "{m.suggestion.goalName}"
                  </strong>
                </div>
                <div className="empty">{m.suggestion.reason}</div>
                <div style={{ marginTop: 10 }}>
                  <PayPalButtons
                    style={{ layout: "horizontal", height: 38, tagline: false }}
                    forceReRender={[m.suggestion.amount, m.suggestion.goalId]}
                    onClick={(data, actions) => {
                      busy.start();
                      return actions.resolve();
                    }}
                    createOrder={async () => {
                      const { ok, data } = await api("/api/paypal/create-order", {
                        method: "POST",
                        body: { amount: m.suggestion.amount, goalName: m.suggestion.goalName },
                      });
                      if (!ok || !data.id) throw new Error(data.error || "Could not create order");
                      return data.id;
                    }}
                    onApprove={async (approval) => {
                      try {
                        const { ok, data } = await api("/api/paypal/capture-order", {
                          method: "POST",
                          body: {
                            orderID: approval.orderID,
                            goalId: m.suggestion.goalId,
                            goalName: m.suggestion.goalName,
                          },
                        });
                        if (!ok || data.status !== "COMPLETED") return;
                        onPaid(m.suggestion.goalId, data.payment);
                        markPaid(i, data.payment);
                      } finally {
                        busy.stop();
                      }
                    }}
                    onCancel={() => busy.stop()}
                    onError={() => busy.stop()}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="msg assistant">
            <div className="bubble">Thinking... {secs}s</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-tools">
        <select
          className="mini"
          value={lang}
          onChange={(e) => {
            setLang(e.target.value);
            setVoiceLang(e.target.value);
          }}
        >
          <option value="en-IN">🎤 English (India)</option>
          <option value="ta-IN">🎤 தமிழ் (Tamil)</option>
        </select>
        <button
          type="button"
          className={`chip ${readAloud ? "on" : ""}`}
          onClick={() => {
            setReadAloud(!readAloud);
            stopSpeaking();
          }}
        >
          {readAloud ? <Volume2 size={14} /> : <VolumeX size={14} />} Read replies aloud
        </button>
      </div>

      <div className="quick">
        {QUICK.map((q) => (
          <button key={q} className="chip" onClick={() => send(q)}>{q}</button>
        ))}
      </div>

      <div className="chat-input">
        <input
          placeholder={listening ? "Listening... speak now" : "Type, or tap the mic and speak..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          type="button"
          className={`btn ghost mic ${listening ? "listening" : ""}`}
          onClick={toggleMic}
          title="Speak your question"
        >
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button className="btn" onClick={() => send()}><Send size={16} /></button>
      </div>
      <div className="voice-note">{listening ? "🎙️ Listening... speak now, then pause." : voiceNote}</div>
    </div>
  );
}