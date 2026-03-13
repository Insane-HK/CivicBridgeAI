import { useState, useRef, useEffect } from "react";

// ── Sector config ──────────────────────────────────────────────────────────
const SECTORS = [
  {
    id: "business",
    icon: "🏢",
    label: "Business & Startups",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.35)",
    starters: [
      "Startup India ke liye kaise register karein?",
      "MSME loan schemes 2024 kya hain?",
      "GST registration process kya hai?",
    ],
    systemPrompt: `You are an expert Indian government scheme advisor specializing in Business & Startup policies.
Answer in simple Hinglish (mix of Hindi and English). Be specific, cite scheme names, eligibility, and steps.
Always mention latest 2024-2025 updates. Format responses clearly with bullet points where helpful.
If asked about eligibility, ask clarifying questions about business type, turnover, employee count.`,
  },
  {
    id: "land",
    icon: "🏞️",
    label: "Land & Acquisition",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.35)",
    starters: [
      "Land acquisition mein mujhe kitna muavza milega?",
      "LARR Act 2013 ke rights kya hain?",
      "Zameen ke dastavej kaise verify karein?",
    ],
    systemPrompt: `You are an expert on Indian Land Acquisition laws, LARR Act 2013, and property rights.
Answer in simple Hinglish. Explain legal rights in plain language, mention compensation rules, 
rehabilitation policies, and how to file objections. Cite relevant sections when helpful.`,
  },
  {
    id: "agriculture",
    icon: "🌾",
    label: "Agriculture Schemes",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.35)",
    starters: [
      "PM Kisan Samman Nidhi ke liye apply kaise karein?",
      "Kisan Credit Card kya hota hai?",
      "Fasal bima yojana mein claim kaise karein?",
    ],
    systemPrompt: `You are an expert on Indian agricultural schemes — PM-KISAN, Fasal Bima, KCC, e-NAM, etc.
Answer in simple Hinglish. Help farmers understand eligibility, application steps, and how to get maximum benefit.
Mention state-specific variations where relevant. Always include helpline numbers if applicable.`,
  },
  {
    id: "education",
    icon: "🎓",
    label: "Education & Skills",
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.12)",
    border: "rgba(14,165,233,0.35)",
    starters: [
      "Scholarship ke liye NSP portal kaise use karein?",
      "PM Vishwakarma Yojana kya hai?",
      "ITI admission process kya hai?",
    ],
    systemPrompt: `You are an expert on Indian education and skill development schemes — NSP scholarships, 
PM Vishwakarma, Skill India, PMKVY, mid-day meal, RTE, etc. Answer in Hinglish.
Help students and parents understand scholarships, vocational training, and skill certification programs.`,
  },
  {
    id: "health",
    icon: "🏥",
    label: "Health & Insurance",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
    border: "rgba(236,72,153,0.35)",
    starters: [
      "Ayushman Bharat mein naam kaise check karein?",
      "Jan Aushadhi kendras kahan milte hain?",
      "Janani Suraksha Yojana ke benefits kya hain?",
    ],
    systemPrompt: `You are an expert on Indian health schemes — Ayushman Bharat, PMJAY, Jan Aushadhi, 
JSY, JSSK, and state health insurance schemes. Answer in Hinglish.
Help users check eligibility, find hospitals, and navigate the health system.`,
  },
  {
    id: "housing",
    icon: "🏠",
    label: "Housing & Urban",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.35)",
    starters: [
      "PMAY gramin ke liye apply kaise karein?",
      "EWS/LIG housing loan subsidy kya hai?",
      "Smart City mission mein kya facilities milti hain?",
    ],
    systemPrompt: `You are an expert on Indian housing schemes — PMAY Urban & Rural, PMGSY, Smart Cities, 
CLSS subsidy, rental housing policies. Answer in Hinglish.
Help users apply for housing schemes, understand subsidy calculations, and track applications.`,
  },
  {
    id: "women",
    icon: "👩",
    label: "Women & Social",
    color: "#f43f5e",
    bg: "rgba(244,63,94,0.12)",
    border: "rgba(244,63,94,0.35)",
    starters: [
      "Beti Bachao Beti Padhao ke fayde kya hain?",
      "Mahila Udyam Nidhi yojana kya hai?",
      "Sukanya Samriddhi Yojana mein invest kaise karein?",
    ],
    systemPrompt: `You are an expert on Indian women empowerment and social welfare schemes — 
BBBP, Mahila Udyam Nidhi, Sukanya Samriddhi, PM Matru Vandana, One Stop Centre, etc. 
Answer in Hinglish. Help women access entitlements, financial schemes, and safety resources.`,
  },
  {
    id: "senior",
    icon: "👴",
    label: "Senior Citizens",
    color: "#64748b",
    bg: "rgba(100,116,139,0.12)",
    border: "rgba(100,116,139,0.35)",
    starters: [
      "Pradhan Mantri Vaya Vandana Yojana kya hai?",
      "Senior citizen railway concession kaise milti hai?",
      "Pension schemes ke liye apply kaise karein?",
    ],
    systemPrompt: `You are an expert on Indian senior citizen welfare — PMVVY, Indira Gandhi Old Age Pension, 
IGNOAPS, Senior Citizen Savings Scheme, Atal Pension Yojana, railway/airline concessions.
Answer in Hinglish. Help elderly citizens maximize their government benefits.`,
  },
];

// ── Utility ────────────────────────────────────────────────────────────────
// The API call is now handled directly inside the component to access props for apiUrl and token.
// ── Sub-components ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "10px 4px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#94a3b8",
            animation: "bounce 1.2s infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

function ChatBubble({ msg, sector }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 14,
        gap: 8,
        alignItems: "flex-end",
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: sector.bg,
            border: `1.5px solid ${sector.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          {sector.icon}
        </div>
      )}
      <div
        style={{
          maxWidth: "85%",
          padding: "12px 16px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser
            ? "#1e293b"
            : "white",
          border: isUser ? "none" : `1px solid ${sector.border}`,
          boxShadow: isUser ? "none" : "0 2px 5px rgba(0,0,0,0.02)",
          color: isUser ? "white" : "#1e293b",
          fontSize: "0.95rem",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
        }}
      >
        {msg.content}
        <div style={{ fontSize: "0.65rem", color: isUser ? "#cbd5e1" : "#64748b", marginTop: 4, textAlign: isUser ? "right" : "left" }}>
          {isUser ? "Aap" : "CivicBridge AI"}
        </div>
      </div>
    </div>
  );
}

function SectorCard({ sector, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? sector.bg : "white",
        border: `1.5px solid ${active ? sector.border : "rgba(0,0,0,0.05)"}`,
        borderRadius: 14,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        minWidth: 90,
        flex: "0 0 auto",
        transform: active ? "translateY(-2px)" : "none",
        boxShadow: active ? `0 4px 20px ${sector.color}22` : "0 2px 5px rgba(0,0,0,0.02)",
      }}
    >
      <span style={{ fontSize: 22 }}>{sector.icon}</span>
      <span
        style={{
          fontSize: 11,
          color: active ? sector.color : "#64748b",
          fontWeight: active ? 600 : 400,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {sector.label}
      </span>
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdvisorSection({ apiUrl, authToken }) {
  const [activeSector, setActiveSector] = useState(SECTORS[0]);
  const [chats, setChats] = useState({}); // keyed by sector id
  const [sessionIds, setSessionIds] = useState({}); // keyed by sector id
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  const messages = chats[activeSector.id] || [];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const newMsg = { role: "user", content: userText };
    const updatedMsgs = [...messages, newMsg];
    setChats((prev) => ({ ...prev, [activeSector.id]: updatedMsgs }));
    setLoading(true);

    try {
      let currentSessionId = sessionIds[activeSector.id];
      if (!currentSessionId) {
        currentSessionId = "advisor-" + activeSector.id + "-" + Date.now();
        setSessionIds((prev) => ({ ...prev, [activeSector.id]: currentSessionId }));
      }

      let messageToSend = userText;
      if (messages.length === 0) {
        messageToSend = `[Context: ${activeSector.systemPrompt}]\n\nUser: ${userText}`;
      }

      if (!apiUrl) {
         // Fallback for demo mode
         const getMockResponse = await import('./demoData.js').then(m => m.getMockResponse);
         setTimeout(() => {
            const aiResp = getMockResponse ? getMockResponse(userText) : "This is a demo response from the advisor.";
            setChats((prev) => ({
              ...prev,
              [activeSector.id]: [...updatedMsgs, { role: "assistant", content: aiResp.answer || aiResp }],
            }));
            setLoading(false);
         }, 1000);
         return;
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          session_id: currentSessionId,
          message: messageToSend,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      let reply = data.response;
      if (data.eligibility_checklist && data.eligibility_checklist.length > 0) {
         reply += "\n\nEligibility Factors:\n" + data.eligibility_checklist.map(c => `- ${c.criterion}: ${c.met}`).join("\n");
      }

      setChats((prev) => ({
        ...prev,
        [activeSector.id]: [...updatedMsgs, { role: "assistant", content: reply }],
      }));
    } catch (e) {
      setChats((prev) => ({
        ...prev,
        [activeSector.id]: [
          ...updatedMsgs,
          { role: "assistant", content: `⚠️ Network error: ${e.message}` },
        ],
      }));
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const switchSector = (s) => {
    setActiveSector(s);
    setInput("");
  };

  const clearChat = () => {
    setChats((prev) => ({ ...prev, [activeSector.id]: [] }));
  };

  return (
    <div className="glass-card"
      style={{
        padding: "0",
        display: "flex",
        flexDirection: "column",
        height: "700px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        textarea:focus { outline: none; }
        textarea { resize: none; }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: "18px 20px 14px",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
          background: "rgba(248, 250, 252, 0.8)",
          backdropFilter: "blur(12px)",
          zIndex: 10,
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: "#0f172a" }}>
              🤖 CivicBridge <span style={{ color: activeSector.color }}>Advisor</span>
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: '0.8rem', color: "#64748b" }}>
              Sector-specific AI • Live search enabled • Hinglish support
            </p>
          </div>
          <div
            style={{
               background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: 20,
              padding: "4px 10px",
              fontSize: 11,
              color: "#4ade80",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
            AI + Web Search
          </div>
        </div>

        {/* Sector Scroll */}
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "none",
          }}
        >
          {SECTORS.map((s) => (
            <SectorCard key={s.id} sector={s} active={activeSector.id === s.id} onClick={() => switchSector(s)} />
          ))}
        </div>
      </div>

      {/* Active sector badge */}
      <div style={{ padding: "10px 16px 0", background: '#ffffff' }}>
        <div
          style={{
            background: activeSector.bg,
            border: `1px solid ${activeSector.border}`,
            borderRadius: 10,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{activeSector.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: activeSector.color }}>
                {activeSector.label} Advisor
              </div>
              <div style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>
                Complex questions answer kar sakta hai • Latest schemes ki jankari
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              style={{
                background: "white",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 8,
                padding: "6px 12px",
                color: "#475569",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              🔄 Reset Sector
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div
        className="custom-scrollbar"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem",
          background: "#ffffff",
        }}
      >
        {messages.length === 0 ? (
          /* Starter prompts */
          <div style={{ animation: "fadeIn 0.4s ease", maxWidth: "600px", margin: "0 auto" }}>
            <p style={{ fontSize: '0.9rem', color: "#475569", marginBottom: 16, textAlign: "center", fontWeight: 500 }}>
              Koi bhi sawal poochein — main latest government data se jawab dunga
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeSector.starters.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  style={{
                    background: "white",
                    border: `1px solid ${activeSector.border}`,
                    borderRadius: 12,
                    padding: "12px 16px",
                    color: "#475569",
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = activeSector.bg;
                    e.currentTarget.style.color = activeSector.color;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.color = "#475569";
                  }}
                >
                  💬 {s}
                </button>
              ))}
            </div>

            {/* Info cards */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              {[
                { icon: "🔍", label: "Live Web Search", desc: "Latest 2025 schemes" },
                { icon: "🧠", label: "Deep Knowledge", desc: "Acts, rules, eligibility" },
                { icon: "🗣️", label: "Hinglish Support", desc: "Simple language mein" },
              ].map((c, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "12px 10px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{c.icon}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#334155" }}>{c.label}</div>
                  <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 2 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} sector={activeSector} />
            ))}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: activeSector.bg,
                    border: `1.5px solid ${activeSector.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                  }}
                >
                  {activeSector.icon}
                </div>
                <div
                  style={{
                    background: "#f8fafc",
                    border: `1px solid ${activeSector.border}`,
                    borderRadius: "18px 18px 18px 4px",
                    padding: "4px 14px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
                  }}
                >
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid rgba(0,0,0,0.05)",
          background: "#f8fafc",
          borderBottomLeftRadius: "16px",
          borderBottomRightRadius: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            background: "white",
            border: `1.5px solid ${input ? activeSector.border : "rgba(0,0,0,0.1)"}`,
            borderRadius: 20,
            padding: "8px 12px",
            transition: "border-color 0.2s",
            boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`${activeSector.icon} ${activeSector.label} ke baare mein poochein... (Enter = Send)`}
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#1e293b",
              fontSize: '0.95rem',
              lineHeight: 1.5,
              padding: "4px 8px",
              fontFamily: "inherit",
              maxHeight: 100,
              overflowY: "auto",
            }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              background: input.trim() && !loading
                ? activeSector.color
                : "#e2e8f0",
              color: input.trim() && !loading ? "white" : "#94a3b8",
              border: "none",
              borderRadius: 14,
              padding: "0 20px",
              height: 40,
              fontWeight: 600,
              cursor: input.trim() && !loading ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: '0.9rem',
              flexShrink: 0,
              transition: "all 0.2s",
            }}
          >
            {loading ? "⏳" : "Send ➤"}
          </button>
        </div>
        <p style={{ fontSize: 11, color: "#64748b", margin: "8px 0 0", textAlign: "center", fontWeight: 500 }}>
          AI + live web search powered • Yeh legal/financial advice nahi hai
        </p>
      </div>
    </div>
  );
}
