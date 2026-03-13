import React, { useState, useRef, useEffect } from 'react';
import {
    FileText, Send, Loader2, CheckCircle, XCircle, HelpCircle,
    AlertCircle, Sparkles, ChevronDown, Upload, MessageSquare,
    Settings, RotateCcw, Copy, Check, Info, Zap, Shield,
    Paperclip, UserPlus, LogIn, X, Search, Award, Fingerprint
} from 'lucide-react';
import { DEMO_SCHEMES, getMockResponse } from './demoData';
import AdvisorSection from './AdvisorSection';
import DisclaimerBanner from './DisclaimerBanner';

// Aadhaar numbers pre-loaded for demo mode fallback
const MOCK_AADHAAR_DATA = {
    '111122223333': { age: 25, income: 50000, state: 'Maharashtra', district: 'Pune', education_level: 'graduate', gender: 'male', name: 'Rahul Sharma' },
    '444455556666': { age: 45, income: 120000, state: 'Uttar Pradesh', district: 'Lucknow', education_level: 'primary', gender: 'female', name: 'Sunita Devi' },
    '777788889999': { age: 19, income: 25000, state: 'Bihar', district: 'Patna', education_level: 'higher_secondary', gender: 'male', name: 'Arjun Singh' },
    '000011112222': { age: 62, income: 30000, state: 'Rajasthan', district: 'Jaipur', education_level: 'illiterate', gender: 'female', name: 'Kamala Bai' },
    '333344445555': { age: 30, income: 450000, state: 'Karnataka', district: 'Bangalore', education_level: 'postgraduate', gender: 'female', name: 'Priya Nair' },
    '666677778888': { age: 22, income: 0, state: 'Delhi', district: 'New Delhi', education_level: 'graduate', gender: 'male', name: 'Vikram Mehta' },
    '999900001111': { age: 50, income: 80000, state: 'Gujarat', district: 'Ahmedabad', education_level: 'secondary', gender: 'male', name: 'Ramesh Patel' },
    '222233334444': { age: 35, income: 150000, state: 'Madhya Pradesh', district: 'Bhopal', education_level: 'graduate', gender: 'female', name: 'Anjali Mishra' },
    '555566667777': { age: 28, income: 60000, state: 'West Bengal', district: 'Kolkata', education_level: 'higher_secondary', gender: 'male', name: 'Suresh Mondal' },
    '888899990000': { age: 55, income: 40000, state: 'Odisha', district: 'Bhubaneswar', education_level: 'primary', gender: 'female', name: 'Lalita Behera' },
};

// ─── Config ──────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/chat$/, '')
    : '';
const CHAT_ANALYZE_URL = API_BASE ? `${API_BASE}/chat` : '';
const PROFILE_SCHEMES_URL = API_BASE ? `${API_BASE}/chat/profile-schemes` : '';
const IS_DEMO_MODE = !API_BASE;

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatTime(date) {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function computeOverallStatus(checklist) {
    if (!checklist || checklist.length === 0) return 'unknown';
    const yesCount = checklist.filter(c => c.met?.toLowerCase() === 'yes').length;
    const noCount = checklist.filter(c => c.met?.toLowerCase() === 'no').length;
    if (noCount > 0) return noCount < checklist.length / 2 ? 'partial' : 'not-eligible';
    if (yesCount === checklist.filter(c => c.met?.toLowerCase() !== 'unknown').length && yesCount > 0) return 'eligible';
    return 'partial';
}

// ─── SchemeCard Sub-component ────────────────────────────────────────────────

const CATEGORY_COLORS = {
    'Startup & Innovation': { bg: '#eff6ff', border: '#93c5fd', tag: '#1d4ed8', text: '#1e3a5f' },
    'MSME & Business':      { bg: '#fffbeb', border: '#fcd34d', tag: '#d97706', text: '#78350f' },
    'Agriculture':          { bg: '#f0fdf4', border: '#86efac', tag: '#16a34a', text: '#14532d' },
    'Education & Scholarship': { bg: '#f5f3ff', border: '#c4b5fd', tag: '#7c3aed', text: '#4c1d95' },
    'Healthcare':           { bg: '#fff1f2', border: '#fda4af', tag: '#e11d48', text: '#881337' },
    'Women Empowerment':    { bg: '#fdf2f8', border: '#f0abfc', tag: '#c026d3', text: '#701a75' },
    'Housing':              { bg: '#f8fafc', border: '#cbd5e1', tag: '#475569', text: '#1e293b' },
    'Employment':           { bg: '#f0fdf4', border: '#6ee7b7', tag: '#059669', text: '#064e3b' },
    'default':              { bg: '#f8fafc', border: '#e2e8f0', tag: '#64748b', text: '#1e293b' },
};

function SchemeCard({ scheme, index }) {
    const colors = CATEGORY_COLORS[scheme.category] || CATEGORY_COLORS['default'];
    return (
        <div className="animate-fade-in-up" style={{
            background: colors.bg, border: `1.5px solid ${colors.border}`,
            borderRadius: '14px', padding: '1.1rem 1.25rem',
            animationDelay: `${index * 0.08}s`, position: 'relative', overflow: 'hidden',
        }}>
            {/* Rank badge */}
            <div style={{
                position: 'absolute', top: '0', right: '0',
                background: colors.tag, color: 'white',
                fontSize: '0.7rem', fontWeight: 800,
                padding: '3px 10px', borderBottomLeftRadius: '10px',
            }}>#{index + 1}</div>

            {/* Category tag */}
            <span style={{
                display: 'inline-block', fontSize: '0.7rem', fontWeight: 700,
                background: colors.tag, color: 'white',
                padding: '2px 10px', borderRadius: '20px', marginBottom: '6px',
            }}>{scheme.category || 'General'}</span>

            {/* Name + Benefit */}
            <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: colors.text }}>
                {scheme.name}
            </h4>
            {scheme.benefit && (
                <div style={{
                    display: 'inline-block', fontSize: '0.78rem', fontWeight: 700,
                    background: 'white', color: colors.tag,
                    border: `1px solid ${colors.border}`, borderRadius: '8px',
                    padding: '2px 10px', marginBottom: '8px',
                }}>💰 {scheme.benefit}</div>
            )}

            {/* Description */}
            <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: colors.text, lineHeight: 1.6 }}>
                {scheme.description}
            </p>

            {/* Eligibility reason */}
            {scheme.eligibility_reason && (
                <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '6px',
                    background: 'rgba(255,255,255,0.6)', borderRadius: '8px',
                    padding: '6px 10px', marginBottom: '8px', fontSize: '0.82rem', color: colors.text,
                }}>
                    <CheckCircle size={14} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                    <span>{scheme.eligibility_reason}</span>
                </div>
            )}

            {/* Documents */}
            {scheme.documents?.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: colors.tag }}>📄 Documents Required:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {scheme.documents.map((doc, i) => (
                            <span key={i} style={{
                                fontSize: '0.72rem', fontWeight: 600,
                                background: 'white', color: colors.text,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '6px', padding: '2px 8px',
                            }}>{doc}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Apply button */}
            {scheme.apply_url && (
                <a href={scheme.apply_url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: colors.tag, color: 'white',
                    fontSize: '0.8rem', fontWeight: 700,
                    padding: '6px 14px', borderRadius: '8px',
                    textDecoration: 'none', transition: 'opacity 0.2s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                    <Zap size={13} /> Apply Now →
                </a>
            )}
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusIcon({ status, size = 20 }) {
    const s = status?.toLowerCase();
    if (s === 'yes') return <CheckCircle size={size} style={{ color: '#059669' }} />;
    if (s === 'no') return <XCircle size={size} style={{ color: '#e11d48' }} />;
    return <HelpCircle size={size} style={{ color: '#d97706' }} />;
}

// ─── ConfirmAction Strip ─────────────────────────────────────────────────────
function ConfirmActionStrip({ action, onYes, onNo, resolved }) {
    if (!action || action.type !== 'sms_subscribe') return null;
    return (
        <div
            className="animate-fade-in-up"
            style={{
                marginTop: '0.75rem',
                background: resolved ? '#f0fdf4' : '#fdf4ff',
                border: `1px solid ${resolved ? '#bbf7d0' : '#e9d5ff'}`,
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                maxWidth: '480px',
            }}
        >
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', fontWeight: 600, color: resolved ? '#16a34a' : '#6d28d9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {resolved ? '🎉 SMS notifications enable ho gayi!' : '📢 ' + action.message}
            </p>
            {!resolved && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={onYes}
                        style={{
                            background: '#7c3aed', color: 'white', border: 'none', borderRadius: '10px',
                            padding: '8px 18px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                            fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
                        }}
                    >
                        {action.yes_label || '✅ Haan, Enable Karo'}
                    </button>
                    <button
                        onClick={onNo}
                        style={{
                            background: 'white', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '10px',
                            padding: '8px 18px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        {action.no_label || '❌ Nahi, Thanks'}
                    </button>
                </div>
            )}
        </div>
    );
}

function ChecklistPanel({ checklist }) {
    const overall = computeOverallStatus(checklist);
    const bannerMap = {
        'eligible': { cls: 'banner-eligible', emoji: '🎉', text: 'Eligible Hain Aap! Congratulations!' },
        'not-eligible': { cls: 'banner-not-eligible', emoji: '❌', text: 'Is Scheme ke Liye Eligible Nahi Hain' },
        'partial': { cls: 'banner-partial', emoji: '⚠️', text: 'Partially Eligible — Kuch Criteria Missing' },
        'unknown': { cls: 'banner-unknown', emoji: '🔍', text: 'Eligibility Determine Nahi Ho Saka' },
    };
    const banner = bannerMap[overall] || bannerMap.unknown;

    return (
        <div className="mt-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {/* Overall Status Banner */}
            <div
                className={`${banner.cls} border rounded-xl p-3 mb-3 flex items-center gap-2 font-semibold text-sm`}
            >
                <span style={{ fontSize: '1.2rem' }}>{banner.emoji}</span>
                <span>{banner.text}</span>
            </div>

            {/* Individual Criteria */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {checklist.map((item, i) => {
                    const s = item.met?.toLowerCase();
                    const cls = s === 'yes' ? 'status-yes' : s === 'no' ? 'status-no' : 'status-unknown';
                    return (
                        <div
                            key={i}
                            className={`${cls} border rounded-xl flex items-center gap-3 p-3 animate-fade-in`}
                            style={{ animationDelay: `${0.05 * i}s` }}
                        >
                            <StatusIcon status={item.met} size={18} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 500, flex: 1 }}>{item.criterion}</span>
                            <span
                                style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    opacity: 0.75,
                                }}
                            >
                                {item.met}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ChatBubble({ msg, onConfirmYes, onConfirmNo }) {
    const isUser = msg.role === 'user';
    return (
        <div
            className={isUser ? 'animate-slide-right' : 'animate-slide-left'}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                gap: '0.25rem',
                marginBottom: '1rem',
            }}
        >
            {/* Sender label */}
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', paddingLeft: isUser ? 0 : '0.5rem', paddingRight: isUser ? '0.5rem' : 0 }}>
                {isUser ? 'Aap' : '🤖 CivicBridge AI'}
            </span>

            {/* Bubble */}
            <div
                style={{
                    maxWidth: '85%',
                    background: isUser
                        ? '#1e293b'
                        : 'white',
                    color: isUser ? 'white' : '#1e293b',
                    borderRadius: isUser ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                    padding: '0.875rem 1.125rem',
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                    boxShadow: isUser
                        ? '0 4px 12px rgba(30,41,59,0.15)'
                        : '0 2px 8px rgba(0,0,0,0.04)',
                    border: isUser ? 'none' : '1px solid #e2e8f0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                }}
            >
                {msg.content}
            </div>

            {/* Checklist */}
            {msg.checklist && msg.checklist.length > 0 && (
                <div style={{ width: '100%', maxWidth: '520px' }}>
                    <ChecklistPanel checklist={msg.checklist} />
                </div>
            )}

            {/* Confirmation action (SMS opt-in) */}
            {msg.confirm_action && (
                <div style={{ width: '100%', maxWidth: '520px' }}>
                    <ConfirmActionStrip
                        action={msg.confirm_action}
                        onYes={onConfirmYes}
                        onNo={onConfirmNo}
                        resolved={msg.confirmResolved}
                    />
                </div>
            )}

            {/* Timestamp */}
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', paddingRight: isUser ? '0.25rem' : 0, paddingLeft: isUser ? 0 : '0.5rem' }}>
                {formatTime(msg.time)}
            </span>
        </div>
    );
}

function TypingIndicator() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
            <div
                style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '1rem 1rem 1rem 0.25rem',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
            >
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '4px', fontStyle: 'italic' }}>
                    Analyze kar raha hoon
                </span>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
            </div>
        </div>
    );
}

function DemoBadge() {
    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '999px',
                padding: '4px 10px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#92400e',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
            }}
        >
            <Zap size={12} />
            Demo Mode
        </div>
    );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
    const [activeTab, setActiveTab] = useState('aadhaar');  // 'aadhaar' | 'chat' | 'register' | 'admin'
    // Aadhaar State
    const [aadhaarInput, setAadhaarInput] = useState('');
    const [aadhaarData, setAadhaarData] = useState(null);
    const [aadhaarError, setAadhaarError] = useState('');
    const [aadhaarSearchLoading, setAadhaarSearchLoading] = useState(false);
    const [aadhaarSchemes, setAadhaarSchemes] = useState('');

    const [schemeMode, setSchemeMode] = useState('demo');  // 'demo' | 'paste'
    const [selectedDemo, setSelectedDemo] = useState(DEMO_SCHEMES[0].id);
    const [pastedScheme, setPastedScheme] = useState('');
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const chatEndRef = useRef(null);
    const questionRef = useRef(null);
    const fileInputRef = useRef(null);
    // Personal Details Form State
    const [showPersonalForm, setShowPersonalForm] = useState(false);
    const [personalForm, setPersonalForm] = useState({
        name: '', age: '', gender: '', income: '', state: '', district: '',
        education: '', degree: '', fieldOfStudy: '',
        occupation: '', businessType: '', msmeRegistered: '', annualTurnover: '',
        phone: '', email: '',
        interests: [],
    });
    const [personalFormLoading, setPersonalFormLoading] = useState(false);
    const [personalFormResult, setPersonalFormResult] = useState('');
    const [personalFormError, setPersonalFormError] = useState('');
    const [personalSchemes, setPersonalSchemes] = useState([]);
    const [personalSessionId, setPersonalSessionId] = useState('');
    // Auth state
    const [authToken, setAuthToken] = useState(() => localStorage.getItem('cb_token') || '');
    const [userId, setUserId] = useState(() => localStorage.getItem('cb_user_id') || '');
    // Registration form — Aadhaar-first: only phone + aadhaar_id needed
    const [regForm, setRegForm] = useState({ phone_number: '', aadhaar_id: '' });
    const [regLoading, setRegLoading] = useState(false);
    const [regMsg, setRegMsg] = useState({ type: '', text: '' });
    // PDF upload
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);

    // Auto-scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Pre-fill question with sample when demo scheme changes
    useEffect(() => {
        if (schemeMode === 'demo') {
            const scheme = DEMO_SCHEMES.find(s => s.id === selectedDemo);
            if (scheme && messages.length === 0) {
                setQuestion(scheme.sampleQ);
            }
        }
    }, [selectedDemo, schemeMode]);

    function getSchemeContext() {
        if (schemeMode === 'demo') {
            const scheme = DEMO_SCHEMES.find(s => s.id === selectedDemo);
            return scheme ? scheme.text : '';
        }
        return pastedScheme;
    }

    // ─── Aadhaar Flow ─────────────────────────────────────────────────────────
    async function handleAadhaarSearch(e) {
        e.preventDefault();
        setAadhaarError('');
        setAadhaarData(null);
        setAadhaarSchemes('');

        const cleanAadhaar = aadhaarInput.replace(/\s/g, '');
        if (cleanAadhaar.length !== 12 || !/^\d+$/.test(cleanAadhaar)) {
            setAadhaarError('Please enter a valid 12-digit Aadhaar number');
            return;
        }

        setAadhaarSearchLoading(true);
        try {
            if (IS_DEMO_MODE) {
                // Demo mode: use inline table
                await new Promise(r => setTimeout(r, 600));
                const data = MOCK_AADHAAR_DATA[cleanAadhaar];
                if (!data) {
                    setAadhaarError('Aadhaar details nahi mile. Try: 111122223333 or 444455556666');
                    return;
                }
                setAadhaarData({ ...data, education: data.education_level });
            } else {
                // Live mode: call POST /aadhaar/lookup
                const res = await fetch(`${API_BASE}/aadhaar/lookup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ aadhaar_id: cleanAadhaar }),
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
                setAadhaarData(json);
            }
        } catch (err) {
            setAadhaarError('Aadhaar lookup failed: ' + err.message);
        } finally {
            setAadhaarSearchLoading(false);
        }
    }

    async function handleFindSchemes() {
        if (!aadhaarData) return;
        setAadhaarSearchLoading(true);
        try {
            const edu = aadhaarData.education_level || aadhaarData.education;
            const prompt = `I am a ${aadhaarData.age} year old ${aadhaarData.gender} residing in ${aadhaarData.district}, ${aadhaarData.state}. My education is ${edu} and my annual income is ₹${aadhaarData.income}. What are the top 3 best government welfare schemes I am eligible for? Explain briefly why in Hinglish.`;

            // Auto-register with Aadhaar data if not already registered
            if (!userId && !IS_DEMO_MODE && regForm.phone_number) {
                try {
                    const regRes = await fetch(`${API_BASE}/users`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone_number: regForm.phone_number, aadhaar_id: aadhaarInput.replace(/\s/g, '') }),
                    });
                    const regData = await regRes.json();
                    if (regRes.ok) {
                        localStorage.setItem('cb_token', regData.token);
                        localStorage.setItem('cb_user_id', regData.user_id);
                        setAuthToken(regData.token);
                        setUserId(regData.user_id);
                    }
                } catch (_) { /* silently skip if registration fails */ }
            }

            if (IS_DEMO_MODE) {
                await new Promise(r => setTimeout(r, 1500));
                setAadhaarSchemes(`📈 Demo Schemes for ${aadhaarData.name || 'You'}:\n\n1. **PM Kisan Samman Nidhi** — Farmers support scheme.\n2. **Ayushman Bharat PM-JAY** — Health insurance up to ₹5 lakh.\n3. **State Welfare Scheme** — For ${aadhaarData.state} residents.\n\n(Connect live API for real AI recommendations)`);
            } else {
                const headers = { 'Content-Type': 'application/json' };
                if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
                const res = await fetch(CHAT_ANALYZE_URL, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ message: prompt }),
                });
                if (!res.ok) throw new Error(`API Error: ${res.status}`);
                const raw = await res.json();
                setAadhaarSchemes(raw.response || raw.answer || 'No suggestions found.');
            }
        } catch (err) {
            console.error(err);
            if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                setAadhaarError('🔒 Login Required! Register tab mein apna number register karein.');
            } else {
                setAadhaarError('Error fetching schemes: ' + err.message);
            }
        } finally {
            setAadhaarSearchLoading(false);
        }
    }

    // ─── Register user (Aadhaar-first) ───────────────────────────────────────
    async function handleRegister(e) {
        e.preventDefault();
        setRegLoading(true);
        setRegMsg({ type: '', text: '' });
        try {
            if (IS_DEMO_MODE) {
                await new Promise(r => setTimeout(r, 800));
                const fakeId = 'demo-' + Math.random().toString(36).slice(2, 10);
                const fakeToken = 'demo.token.' + fakeId;
                localStorage.setItem('cb_token', fakeToken);
                localStorage.setItem('cb_user_id', fakeId);
                setAuthToken(fakeToken);
                setUserId(fakeId);
                setRegMsg({ type: 'ok', text: '🎉 Demo registration successful! SMS notifications ON (demo).' });
                return;
            }
            const body = { phone_number: regForm.phone_number };
            if (regForm.aadhaar_id && regForm.aadhaar_id.length === 12) {
                body.aadhaar_id = regForm.aadhaar_id;
            } else {
                // Fallback: use dummy profile if no Aadhaar
                Object.assign(body, { age: 25, income: 0, state: 'NA', district: 'NA', education_level: 'primary' });
            }
            const res = await fetch(`${API_BASE}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
            localStorage.setItem('cb_token', data.token);
            localStorage.setItem('cb_user_id', data.user_id);
            setAuthToken(data.token);
            setUserId(data.user_id);
            const smsNote = data.sms_opted_in ? ' SMS notifications ON 🔔' : '';
            setRegMsg({ type: 'ok', text: `🎉 Registration ho gaya! ${data.name ? `Welcome ${data.name}!` : ''} User ID: ${data.user_id}.${smsNote}` });
        } catch (e) {
            setRegMsg({ type: 'err', text: `Registration failed: ${e.message}` });
        } finally {
            setRegLoading(false);
        }
    }

    // ─── Upload PDF to chat ───────────────────────────────────────────────────
    async function handlePdfUpload(file) {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('PDF too large — max 5MB'); return; }
        setUploadedFile(file.name);
        if (IS_DEMO_MODE) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `📎 "${file.name}" upload ho gaya! (Demo mode mein actual PDF process nahi hota — apna sawal poochein)`,
                checklist: [], time: new Date(),
            }]);
            return;
        }
        setUploadLoading(true);
        try {
            const reader = new FileReader();
            const pdfBase64 = await new Promise((res, rej) => {
                reader.onload = () => res(reader.result.split(',')[1]);
                reader.onerror = rej;
                reader.readAsDataURL(file);
            });
            const response = await fetch(`${API_BASE}/chat/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ pdf_base64: pdfBase64 }),
            });
            const data = await response.json();
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.message || `PDF "${file.name}" upload ho gaya! Ab scheme ke baare mein poochein.`,
                checklist: [], time: new Date(),
            }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: `PDF upload failed: ${err.message}`, checklist: [], time: new Date() }]);
        } finally {
            setUploadLoading(false);
        }
    }

    async function handleSend(e) {
        e?.preventDefault();
        const trimmedQ = question.trim();
        if (!trimmedQ) return;

        const schemeCtx = getSchemeContext();
        if (!schemeCtx && schemeMode === 'paste' && !uploadedFile) {
            alert('Pehle scheme document paste karein, PDF upload karein, ya Demo mode select karein.');
            return;
        }

        // Add user message
        const userMsg = { role: 'user', content: trimmedQ, time: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setQuestion('');
        setLoading(true);

        // Build conversation history for context
        const historyForApi = messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
        }));

        try {
            let data;

            if (IS_DEMO_MODE) {
                // Demo mode: use pre-built response with small delay
                await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));
                const mock = getMockResponse(selectedDemo, trimmedQ);
                data = mock || {
                    answer: 'Yeh ek demo response hai! Asli API connect karne ke liye VITE_API_URL set karein apne .env file mein.\n\nIs scheme ke baare mein aur sawal pooch sakte hain.',
                    checklist: [],
                    confirm_action: null,
                };
            } else {
                // Real API call — use /chat endpoint
                const endpoint = uploadedFile ? `${API_BASE}/chat` : CHAT_ANALYZE_URL;
                const headers = { 'Content-Type': 'application/json' };
                if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        document_text: schemeCtx,
                        user_question: trimmedQ,
                        message: trimmedQ,
                        conversation_history: historyForApi,
                    }),
                });
                if (!res.ok) throw new Error(`API Error: ${res.status}`);
                const raw = await res.json();
                data = { answer: raw.response || raw.answer, checklist: raw.eligibility_checklist || raw.checklist || [], confirm_action: raw.confirm_action || null };
            }

            const aiMsg = {
                role: 'assistant',
                content: data.answer || 'Koi response nahi mila.',
                checklist: data.checklist || [],
                confirm_action: data.confirm_action || null,
                confirmResolved: false,
                time: new Date(),
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            console.error(err);
            let errorMessage = `⚠️ Kuch galat ho gaya:\n${err.message}\n\nPlease dobara try karein.`;

            if (err.message.includes("401") || err.message.includes("Unauthorized")) {
                errorMessage = `🔒 **Login Required!**\n\nIs live API backend se connect karne ke liye aapko Register karna hoga.\n\nKripya upar **Register** tab par click karein aur apna details bhar kar register karein. Fir wapas aakar sawal poochein! (Token automatically save ho jayega).`;
            }

            const errMsg = {
                        content: errorMessage,
                checklist: [],
                time: new Date(),
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setLoading(false);
            setTimeout(() => questionRef.current?.focus(), 100);
        }
    }

    // ─── SMS Opt-in Handlers ──────────────────────────────────────────────────
    async function handleConfirmYes(msgIndex) {
        if (!userId || IS_DEMO_MODE) {
            setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, confirmResolved: true } : m));
            return;
        }
        try {
            await fetch(`${API_BASE}/users/${userId}/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ sms_opted_in: true }),
            });
        } catch (e) { console.error('Subscribe failed:', e); }
        setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, confirmResolved: true } : m));
    }

    function handleConfirmNo(msgIndex) {
        setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, confirm_action: null } : m));
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function handleReset() {
        setMessages([]);
        setQuestion('');
    }

    function handleCopyScheme() {
        navigator.clipboard.writeText(getSchemeContext());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const currentScheme = schemeMode === 'demo'
        ? DEMO_SCHEMES.find(s => s.id === selectedDemo)
        : null;

    // ─── Personal Details Form Submit ─────────────────────────────────────────
    async function handlePersonalFormSubmit(e) {
        e.preventDefault();
        setPersonalFormError('');
        setPersonalFormResult('');
        setPersonalSchemes([]);
        setPersonalSessionId('');
        setPersonalFormLoading(true);

        const f = personalForm;

        try {
            if (IS_DEMO_MODE) {
                await new Promise(r => setTimeout(r, 1800));
                const isBizOwner = f.occupation === 'business_owner' || f.occupation === 'startup_founder';
                const isGraduate = ['graduate', 'postgraduate', 'phd'].includes(f.education);
                const isFarmer = f.occupation === 'farmer';
                const isStudent = f.occupation === 'student';

                let demoSchemes = [];
                if (isBizOwner) {
                    demoSchemes = [
                        { name: 'PM MUDRA Yojana', category: 'MSME & Business', description: 'Collateral-free business loans upto ₹10 lakh. Shishu (₹50k), Kishore (₹50k-5L), aur Tarun (₹5L-10L) teen categories hain.', eligibility_reason: `${f.name || 'Aap'} ek ${f.businessType || 'business'} chalate hain — MUDRA Tarun category ke liye eligible hain.`, documents: ['Aadhaar Card', 'PAN Card', 'Business Plan', '6-month Bank Statement'], apply_url: 'https://mudra.org.in', benefit: 'Loan up to ₹10 lakh' },
                        { name: 'MSME Udyam Registration', category: 'MSME & Business', description: 'Free online MSME registration jo government benefits, subsidies, aur priority lending ke liye zaroori hai.', eligibility_reason: `${f.msmeRegistered === 'yes' ? 'Already registered! Aap full MSME benefits le sakte hain.' : 'Register karke ₹15L tak credit-linked subsidies unlock karein.'}`, documents: ['Aadhaar', 'PAN', 'Business Address Proof'], apply_url: 'https://udyamregistration.gov.in', benefit: 'Free + Subsidies' },
                        { name: 'CGTMSE Credit Guarantee', category: 'MSME & Business', description: 'MSMEs ko ₹5 crore tak ka collateral-free loan guarantee milta hai banks se. No property needed as security.', eligibility_reason: 'Business owners ke liye collateral ki zaroorat nahi — government guarantee ke basis par loan.', documents: ['Udyam Certificate', 'Project Report', 'ITR (2 years)', 'CA Balance Sheet'], apply_url: 'https://cgtmse.in', benefit: 'Loan up to ₹5 crore' },
                        { name: 'Stand-Up India', category: 'MSME & Business', description: '₹10 lakh se ₹1 crore tak bank loan SC/ST aur mahila entrepreneurs ke liye greenfield enterprise setup.', eligibility_reason: 'First-time business setup ke liye ideal — especially SC/ST aur women entrepreneurs ke liye.', documents: ['Aadhaar', 'Business Registration', 'Caste/Gender Certificate'], apply_url: 'https://www.standupmitra.in', benefit: '₹10L to ₹1Cr loan' },
                        { name: 'PM Vishwakarma Yojana', category: 'MSME & Business', description: 'Artisans aur craftspeople ke liye ₹3 lakh tak loan aur free skill training + market access.', eligibility_reason: `${f.businessType === 'handicrafts' ? 'Handicraft business ke liye perfect match!' : 'Traditional trades ke liye excellent scheme.'}`, documents: ['Aadhaar', 'Craft Certificate', 'Bank Account'], apply_url: 'https://pmvishwakarma.gov.in', benefit: '₹3 lakh + Training' },
                    ];
                } else if (isGraduate && f.interests.includes('Startup & Innovation')) {
                    demoSchemes = [
                        { name: 'Startup India Seed Fund', category: 'Startup & Innovation', description: 'DPIIT-recognised startups ko ₹20L–₹50L tak seed funding for proof-of-concept aur early commercialization.', eligibility_reason: `${f.degree || 'Graduate'} ${f.fieldOfStudy ? 'in ' + f.fieldOfStudy : ''} hone ke saath Startup India ke liye eligible hain.`, documents: ['DPIIT Registration', `${f.degree || 'Degree'} Certificate`, 'Business Plan', 'PAN'], apply_url: 'https://www.startupindia.gov.in', benefit: 'Up to ₹50 lakh' },
                        { name: 'Atal Innovation Mission (AIM)', category: 'Startup & Innovation', description: 'Atal Incubation Centres mein free incubation support + ₹10 lakh grant for innovators across India.', eligibility_reason: `${f.state || 'Aapke state'} mein AIM-supported incubator available hai — apply kar sakte hain.`, documents: ['Innovation Proposal', 'Aadhaar', 'PAN', 'Founders CV'], apply_url: 'https://aim.gov.in', benefit: '₹10 lakh + Mentorship' },
                        { name: 'PM MUDRA Yojana (Tarun)', category: 'Startup & Innovation', description: 'Graduate entrepreneurs ke liye ₹5–10 lakh collateral-free business startup loan.', eligibility_reason: `${f.degree || 'Degree'} holder hone ke naate Tarun category ke liye directly eligible — no collateral needed.`, documents: [`${f.degree || 'Degree'} Certificate`, 'Business Plan', 'Aadhaar', 'Bank Statement'], apply_url: 'https://mudra.org.in', benefit: '₹5L–10L startup loan' },
                        { name: `${f.state || 'State'} Startup Policy`, category: 'Startup & Innovation', description: `${f.state || 'Aapke state'} mein registered startups ko rent subsidy, electricity rebate, aur procurement preference milti hai.`, eligibility_reason: `${f.state || 'State'} domicile startup founders ke liye direct state-level grants available.`, documents: ['State Startup Registration', 'DPIIT Certificate', 'Company Incorporation'], apply_url: 'https://startupindia.gov.in/state-startup-ranking', benefit: 'State grants + Tax breaks' },
                        { name: 'NASSCOM 10,000 Startups', category: 'Technology & Digital', description: 'Tech startups ke liye world-class mentorship, investor connect, aur product launch support.', eligibility_reason: `${f.fieldOfStudy ? f.fieldOfStudy + ' background' : 'Technical education'} ke saath perfect platform hai.`, documents: ['Company Registration', 'Product Demo', 'Founders Profile'], apply_url: 'https://10000startups.com', benefit: 'Mentorship + Investors' },
                    ];
                } else if (isFarmer) {
                    demoSchemes = [
                        { name: 'PM Kisan Samman Nidhi', category: 'Agriculture', description: '₹6,000/year directly bank account mein — teen instalments mein. 12+ crore farmers already enrolled.', eligibility_reason: `Farmer hone ke naate ${f.name || 'aap'} directly ₹6,000/year ke liye eligible hain.`, documents: ['Aadhaar Card', 'Land Records (Khasra/Khatauni)', 'Bank Passbook'], apply_url: 'https://pmkisan.gov.in', benefit: '₹6,000/year cash' },
                        { name: 'PM Fasal Bima Yojana', category: 'Agriculture', description: 'Kharab mausam ya natural calamity se fasal nuksaan hone par sirf 2% premium mein full crop insurance.', eligibility_reason: `${f.state || 'Aapke state'} mein Rabi/Kharif dono crops ke liye available — low premium, high coverage.`, documents: ['Aadhaar', 'Land Papers', 'Sowing Certificate', 'Bank Account'], apply_url: 'https://pmfby.gov.in', benefit: 'Insurance at 2% premium' },
                        { name: 'Kisan Credit Card (KCC)', category: 'Agriculture', description: 'Short-term crop loan upto ₹3 lakh at 4% interest rate — debit card ki tarah use kar sakte hain.', eligibility_reason: 'Land record holding farmers ke liye — same day approval most banks mein.', documents: ['Aadhaar', 'Land Records', 'Passport Photo'], apply_url: 'https://pmkisan.gov.in/kcc.aspx', benefit: '₹3 lakh at 4% interest' },
                        { name: 'PM Krishi Sinchai Yojana', category: 'Agriculture', description: 'Drip aur sprinkler irrigation ke liye 55–75% subsidy. Har khet ko paani mission ke tahat.', eligibility_reason: 'Land-owning farmers ko irrigation equipment par direct subsidy milti hai government ki taraf se.', documents: ['Land Papers', 'Aadhaar', 'Bank Account', 'Quotation from Vendor'], apply_url: 'https://pmksy.gov.in', benefit: '75% irrigation subsidy' },
                        { name: 'Soil Health Card Scheme', category: 'Agriculture', description: 'Free soil testing aur personalised fertilizer recommendation — crop yield 10–15% badh sakti hai.', eligibility_reason: 'Har farmer is scheme ke liye eligible hai — bilkul free government service.', documents: ['Aadhaar', 'Land Details (survey number)'], apply_url: 'https://soilhealth.dac.gov.in', benefit: 'Free soil testing' },
                    ];
                } else if (isStudent) {
                    demoSchemes = [
                        { name: 'National Scholarship Portal', category: 'Education & Scholarship', description: 'Central aur State government ki 100+ scholarships ek jagah — merit aur means-based dono available.', eligibility_reason: `Student hone ke naate ${f.name || 'aap'} NSP par multiple scholarships ke liye apply kar sakte hain.`, documents: ['Aadhaar', 'Marksheet (last class)', 'Income Certificate', 'Bank Account'], apply_url: 'https://scholarships.gov.in', benefit: '₹500–8,000/month' },
                        { name: 'PM Vidyalaxmi', category: 'Education & Scholarship', description: 'Higher education ke liye ₹10 lakh tak education loan — government interest subsidy ke saath.', eligibility_reason: `${f.state || 'Aapke state'} ke students ke liye approved college mein admission hone par eligible.`, documents: ['Admission Letter', 'Aadhaar', 'Income Proof', 'Academic Records'], apply_url: 'https://www.vidyalakshmi.co.in', benefit: '₹10L loan + Subsidy' },
                        { name: 'Central Sector Scholarship', category: 'Education & Scholarship', description: '₹20,000/year undergrads ke liye — merit-based, regular college students ke liye available.', eligibility_reason: '12th ke baad college mein regular student hone par eligible — sirf merit matter karta hai.', documents: ['12th Marksheet', 'Aadhaar', 'Bank Account', 'College Enrollment'], apply_url: 'https://scholarships.gov.in', benefit: '₹20,000/year' },
                        { name: 'AICTE Pragati / Saksham', category: 'Education & Scholarship', description: 'Technical education students ke liye ₹50,000/year — laptop ya books khareedne ke liye.', eligibility_reason: `${f.gender === 'female' ? 'Mahila technical students ko Pragati scheme mein priority milti hai.' : 'Technical students ke liye Saksham scheme bhi available hai.'}`, documents: ['Admission Letter', 'Aadhaar', 'Income Certificate'], apply_url: 'https://aicte-pragati-saksham-gov-in.in', benefit: '₹50,000/year' },
                        { name: `${f.state || 'State'} Merit Scholarship`, category: 'Education & Scholarship', description: `${f.state || 'Aapke state'} government ki merit scholarship — domicile students ko priority milti hai.`, eligibility_reason: `${f.state || 'State'} domicile hone ke naate directly apply kar sakte hain.`, documents: ['Domicile Certificate', 'Marksheet', 'Aadhaar', 'Bank Account'], apply_url: 'https://scholarships.gov.in', benefit: 'Varies by state' },
                    ];
                } else {
                    demoSchemes = [
                        { name: 'Ayushman Bharat PM-JAY', category: 'Healthcare', description: '₹5 lakh tak free health insurance — 25,000+ hospitals mein cashless treatment.', eligibility_reason: `${f.income ? `₹${parseInt(f.income).toLocaleString('en-IN')} income ke saath SECC list mein check karein.` : 'Low income families ke liye — nearest hospital mein eligibility verify karein.'}`, documents: ['Aadhaar', 'Ration Card', 'Income Certificate'], apply_url: 'https://pmjay.gov.in', benefit: '₹5 lakh health cover' },
                        { name: 'PM Awas Yojana', category: 'Housing', description: 'EWS/LIG families ke liye affordable housing — ₹2.67 lakh tak interest subsidy on home loan.', eligibility_reason: `${f.state || 'Aapke state'} mein PMAY beneficiaries list mein apply kar sakte hain.`, documents: ['Aadhaar', 'Income Certificate', 'Land Documents'], apply_url: 'https://pmaymis.gov.in', benefit: '₹2.67 lakh subsidy' },
                        { name: 'Skill India Mission', category: 'Employment', description: 'Free vocational training with government certificate — placement assistance bhi milti hai.', eligibility_reason: `${f.occupation === 'unemployed' ? 'Unemployed citizens ke liye priority enrollment.' : 'Skills upgrade karne ka best government platform.'}`, documents: ['Aadhaar', 'Education Certificate'], apply_url: 'https://www.skillindia.gov.in', benefit: 'Free training + Certificate' },
                        { name: 'Jan Dhan Yojana', category: 'Finance & Banking', description: 'Zero-balance bank account + ₹2 lakh accident insurance + RuPay debit card.', eligibility_reason: 'Koi bhi Indian citizen jo banked nahi hai ya basic account chahta ho.', documents: ['Aadhaar', 'Passport Photo'], apply_url: 'https://www.pmjdy.gov.in', benefit: '₹2 lakh insurance free' },
                        { name: 'PM Ujjwala Yojana', category: 'Social Welfare', description: 'BPL families ke liye free LPG gas connection aur pehli refill bhi bilkul free milti hai.', eligibility_reason: 'BPL/SECC listed households aur SC/ST families ke liye direct benefit transfer.', documents: ['Aadhaar', 'BPL Certificate / Ration Card', 'Bank Account'], apply_url: 'https://www.pmuy.gov.in', benefit: 'Free LPG connection' },
                    ];
                }
                setPersonalSchemes(demoSchemes);
                setPersonalSessionId('demo-' + Date.now());
            } else {
                // ── Live API call to POST /chat/profile-schemes ──
                const res = await fetch(PROFILE_SCHEMES_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: f.name, age: f.age, gender: f.gender,
                        income: f.income, state: f.state, district: f.district,
                        education: f.education, degree: f.degree, fieldOfStudy: f.fieldOfStudy,
                        occupation: f.occupation, businessType: f.businessType,
                        msmeRegistered: f.msmeRegistered, annualTurnover: f.annualTurnover,
                        phone: f.phone, email: f.email, interests: f.interests,
                    }),
                });
                if (!res.ok) throw new Error(`API Error: ${res.status}`);
                const data = await res.json();
                setPersonalSchemes(data.schemes || []);
                setPersonalSessionId(data.session_id || '');
                if (!data.schemes?.length) throw new Error('No schemes returned from AI.');
            }
        } catch (err) {
            console.error(err);
            setPersonalFormError('Error fetching personalized schemes: ' + err.message);
        } finally {
            setPersonalFormLoading(false);
        }
    }

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

            {/* ── Header ── */}
            <header className="glass-header" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            background: '#1e293b',
                            borderRadius: '10px',
                            padding: '8px',
                            display: 'flex',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}>
                            <Shield size={20} color="white" />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                                CivicBridge <span style={{ color: '#7c3aed' }}>AI</span>
                            </h1>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                                AI Scheme Eligibility Assistant
                            </p>
                        </div>
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {IS_DEMO_MODE && <DemoBadge />}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            background: '#ecfdf5', border: '1px solid #6ee7b7',
                            borderRadius: '999px', padding: '3px 10px',
                            fontSize: '0.7rem', fontWeight: 700, color: '#065f46',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                            <Sparkles size={11} />
                            AI Powered
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Main layout ── */}
            <main style={{ flex: 1, maxWidth: '850px', margin: '0 auto', padding: '1.5rem 1rem 2rem', width: '100%' }}>

                {/* Disclaimer Banner */}
                <DisclaimerBanner />

                {/* Tabs */}
                <div
                    className="glass-card"
                    style={{ padding: '6px', marginBottom: '1.5rem', display: 'flex', gap: '6px', flexWrap: 'wrap' }}
                >
                    {[
                        { id: 'aadhaar', icon: <Fingerprint size={16} />, label: 'Find Schemes (Aadhaar)' },
                        { id: 'advisor', icon: <MessageSquare size={16} />, label: '🤖 Advisor' },
                        { id: 'register', icon: <UserPlus size={16} />, label: 'Register' + (userId ? ' ✓' : '') }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            id={`tab-${tab.id}`}
                            onClick={() => setActiveTab(tab.id)}
                            className={activeTab === tab.id ? 'tab-active' : 'tab-inactive'}
                            style={{
                                flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: '8px', padding: '10px 16px', borderRadius: '14px',
                                border: 'none', cursor: 'pointer', fontWeight: 600,
                                fontSize: '0.875rem', transition: 'all 0.2s ease',
                                fontFamily: 'inherit',
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── AADHAAR FIND SCHEMES TAB ── */}
                {activeTab === 'aadhaar' && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="glass-card" style={{ padding: '1.75rem' }}>
                            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: '#f3e8ff', padding: '8px', borderRadius: '10px', color: '#7c3aed' }}>
                                    <Fingerprint size={20} />
                                </div>
                                Aadhaar Details Se Schemes Dhundhe
                            </h2>
                            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px', marginBottom: '1rem', display: 'flex', gap: '8px', alignItems: 'start' }}>
                                <Info size={16} style={{ color: '#ea580c', flexShrink: 0, marginTop: '2px' }} />
                                <div style={{ fontSize: '0.8rem', color: '#9a3412' }}>
                                    <strong>Demo Mode:</strong> Aadhaar data is mock/simulated for testing. Real Aadhaar integration requires government approval. Try: 111122223333, 444455556666, 777788889999
                                </div>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.25rem' }}>
                                Apna Aadhaar number dalen. Hum automatically aapki details nikal kar aapke liye best government schemes dhundenge.
                            </p>

                            <form onSubmit={handleAadhaarSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <input
                                    type="text"
                                    maxLength={12}
                                    placeholder="Enter 12-digit Aadhaar Number"
                                    className="input-field"
                                    value={aadhaarInput}
                                    onChange={e => setAadhaarInput(e.target.value.replace(/\D/g, ''))}
                                    style={{ flex: 1, minWidth: '250px', background: '#f8fafc' }}
                                />
                                <button
                                    type="submit"
                                    style={{
                                        background: '#1e293b', color: 'white', border: 'none', borderRadius: '12px',
                                        padding: '0 24px', height: '52px', fontWeight: 700, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit'
                                    }}
                                >
                                    <Search size={18} /> Fetch Details
                                </button>
                            </form>

                            {aadhaarError && <p style={{ color: '#e11d48', marginTop: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{aadhaarError}</p>}
                        </div>

                        {/* Fetched Data & Scheme Results */}
                        {aadhaarData && (
                            <div className="glass-card animate-fade-in-up" style={{ padding: '1.75rem' }}>
                                <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle size={20} style={{ color: '#10b981' }} /> Aadhaar Details Verified
                                </h3>
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                                    <div><p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Age</p><p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>{aadhaarData.age} Years</p></div>
                                    <div><p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Income</p><p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>₹{aadhaarData.income}</p></div>
                                    <div><p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Gender</p><p style={{ margin: 0, fontWeight: 700, color: '#1e293b', textTransform: 'capitalize' }}>{aadhaarData.gender}</p></div>
                                    <div><p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Location</p><p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>{aadhaarData.district}, {aadhaarData.state}</p></div>
                                    <div><p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Education</p><p style={{ margin: 0, fontWeight: 700, color: '#1e293b', textTransform: 'capitalize' }}>{aadhaarData.education_level ? aadhaarData.education_level.replace('_', ' ') : 'N/A'}</p></div>
                                </div>

                                <button
                                    onClick={handleFindSchemes}
                                    disabled={aadhaarSearchLoading}
                                    style={{
                                        background: '#7c3aed', color: 'white', border: 'none', borderRadius: '12px',
                                        padding: '14px 24px', width: '100%', fontWeight: 700, fontSize: '1rem',
                                        cursor: aadhaarSearchLoading ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                        boxShadow: aadhaarSearchLoading ? 'none' : '0 4px 12px rgba(124,58,237,0.3)',
                                        fontFamily: 'inherit', transition: 'all 0.2s', opacity: aadhaarSearchLoading ? 0.7 : 1
                                    }}
                                >
                                    {aadhaarSearchLoading ? <Loader2 size={20} className="animate-spin" /> : <Award size={20} />}
                                    {aadhaarSearchLoading ? 'Finding Best Schemes...' : 'Find Eligible Government Schemes'}
                                </button>

                                {aadhaarSchemes && (
                                    <div className="animate-fade-in-up" style={{ marginTop: '1.5rem', background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: '14px', padding: '1.25rem' }}>
                                        <h4 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 800, color: '#4c1d95', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Sparkles size={18} /> Top Recommendations for You
                                        </h4>
                                        <div style={{ fontSize: '0.95rem', color: '#4c1d95', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                            {aadhaarSchemes}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── PERSONALIZED FORM SECTION ── */}
                        <div className="glass-card animate-fade-in-up" style={{ padding: '0', overflow: 'hidden', border: '1px solid #d8b4fe' }}>
                            <button
                                id="toggle-personal-form"
                                onClick={() => setShowPersonalForm(prev => !prev)}
                                style={{
                                    width: '100%', background: showPersonalForm ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'linear-gradient(135deg, #1e293b, #334155)',
                                    color: 'white', border: 'none', padding: '1rem 1.5rem',
                                    fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    fontFamily: 'inherit', transition: 'all 0.3s ease',
                                }}
                            >
                                <FileText size={20} />
                                {showPersonalForm ? '✕  Close Form' : '📝  Get Personalized Schemes & Updates'}
                                <ChevronDown size={18} style={{ transform: showPersonalForm ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s ease' }} />
                            </button>

                            {showPersonalForm && (
                                <div className="animate-fade-in" style={{ padding: '1.75rem' }}>
                                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={20} style={{ color: '#7c3aed' }} />
                                        Build Your Profile — Get Targeted Scheme Updates
                                    </h3>
                                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
                                        Tell us about yourself — BTech graduate? MSME owner? Farmer? We'll find schemes that match YOUR exact background and send you regular updates.
                                    </p>

                                    <form onSubmit={handlePersonalFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {/* Row 1: Name + Age */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Full Name *</label>
                                                <input id="pf-name" type="text" required className="input-field" placeholder="e.g. Rahul Sharma" value={personalForm.name} onChange={e => setPersonalForm(f => ({ ...f, name: e.target.value }))} style={{ backgroundColor: '#f8fafc' }} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Age *</label>
                                                <input id="pf-age" type="number" required min="1" max="120" className="input-field" placeholder="25" value={personalForm.age} onChange={e => setPersonalForm(f => ({ ...f, age: e.target.value }))} style={{ backgroundColor: '#f8fafc' }} />
                                            </div>
                                        </div>

                                        {/* Row 2: Gender + Income */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Gender *</label>
                                                <select id="pf-gender" required className="input-field" value={personalForm.gender} onChange={e => setPersonalForm(f => ({ ...f, gender: e.target.value }))} style={{ backgroundColor: '#f8fafc', cursor: 'pointer' }}>
                                                    <option value="">Select</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Annual Income (₹) *</label>
                                                <input id="pf-income" type="number" required min="0" className="input-field" placeholder="50000" value={personalForm.income} onChange={e => setPersonalForm(f => ({ ...f, income: e.target.value }))} style={{ backgroundColor: '#f8fafc' }} />
                                            </div>
                                        </div>

                                        {/* Row 3: State + District */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>State *</label>
                                                <select id="pf-state" required className="input-field" value={personalForm.state} onChange={e => setPersonalForm(f => ({ ...f, state: e.target.value }))} style={{ backgroundColor: '#f8fafc', cursor: 'pointer' }}>
                                                    <option value="">Select State</option>
                                                    {['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'].map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>District</label>
                                                <input id="pf-district" type="text" className="input-field" placeholder="e.g. Pune" value={personalForm.district} onChange={e => setPersonalForm(f => ({ ...f, district: e.target.value }))} style={{ backgroundColor: '#f8fafc' }} />
                                            </div>
                                        </div>

                                        {/* ── EDUCATION SECTION ── */}
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>🎓 Education Details</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Education Level *</label>
                                                    <select id="pf-education" required className="input-field" value={personalForm.education} onChange={e => setPersonalForm(f => ({ ...f, education: e.target.value, degree: '', fieldOfStudy: '' }))} style={{ backgroundColor: 'white', cursor: 'pointer' }}>
                                                        <option value="">Select</option>
                                                        <option value="illiterate">Illiterate</option>
                                                        <option value="primary">Primary (1-5)</option>
                                                        <option value="secondary">Secondary (6-10)</option>
                                                        <option value="higher_secondary">Higher Secondary (11-12)</option>
                                                        <option value="diploma">Diploma / ITI</option>
                                                        <option value="graduate">Graduate</option>
                                                        <option value="postgraduate">Postgraduate</option>
                                                        <option value="phd">PhD / Doctorate</option>
                                                    </select>
                                                </div>
                                                {['graduate', 'postgraduate', 'phd'].includes(personalForm.education) && (
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Degree Type</label>
                                                        <select id="pf-degree" className="input-field" value={personalForm.degree} onChange={e => setPersonalForm(f => ({ ...f, degree: e.target.value }))} style={{ backgroundColor: 'white', cursor: 'pointer' }}>
                                                            <option value="">Select Degree</option>
                                                            <option value="BTech/BE">BTech / BE (Engineering)</option>
                                                            <option value="BCA/BCS">BCA / BCS</option>
                                                            <option value="BSc">BSc</option>
                                                            <option value="BCom">BCom</option>
                                                            <option value="BA">BA</option>
                                                            <option value="BBA/BBM">BBA / BBM</option>
                                                            <option value="MBBS">MBBS</option>
                                                            <option value="LLB">LLB / Law</option>
                                                            <option value="MTech/ME">MTech / ME</option>
                                                            <option value="MBA">MBA</option>
                                                            <option value="MSc">MSc</option>
                                                            <option value="MA">MA</option>
                                                            <option value="PhD">PhD</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                            {['graduate', 'postgraduate', 'phd'].includes(personalForm.education) && (
                                                <div style={{ marginTop: '0.75rem' }}>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Field of Study / Specialization</label>
                                                    <input id="pf-fieldOfStudy" type="text" className="input-field" placeholder="e.g. Computer Science, Mechanical, Commerce..." value={personalForm.fieldOfStudy} onChange={e => setPersonalForm(f => ({ ...f, fieldOfStudy: e.target.value }))} style={{ backgroundColor: 'white' }} />
                                                </div>
                                            )}
                                        </div>

                                        {/* ── OCCUPATION SECTION ── */}
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>💼 Occupation Details</p>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Occupation *</label>
                                                <select id="pf-occupation" required className="input-field" value={personalForm.occupation} onChange={e => setPersonalForm(f => ({ ...f, occupation: e.target.value, businessType: '', msmeRegistered: '', annualTurnover: '' }))} style={{ backgroundColor: 'white', cursor: 'pointer' }}>
                                                    <option value="">Select</option>
                                                    <option value="student">Student</option>
                                                    <option value="farmer">Farmer</option>
                                                    <option value="daily_wage_worker">Daily Wage Worker</option>
                                                    <option value="business_owner">🏢 Business / MSME Owner</option>
                                                    <option value="self_employed">Self Employed / Freelancer</option>
                                                    <option value="private_sector">Private Sector Employee</option>
                                                    <option value="government_employee">Government Employee</option>
                                                    <option value="startup_founder">🚀 Startup Founder</option>
                                                    <option value="retired">Retired</option>
                                                    <option value="homemaker">Homemaker</option>
                                                    <option value="unemployed">Unemployed</option>
                                                </select>
                                            </div>

                                            {/* Conditional: Business / MSME Details */}
                                            {(personalForm.occupation === 'business_owner' || personalForm.occupation === 'startup_founder') && (
                                                <div className="animate-fade-in" style={{ marginTop: '0.75rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '1rem' }}>
                                                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>
                                                        {personalForm.occupation === 'business_owner' ? '🏢 Business Details' : '🚀 Startup Details'}
                                                    </p>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>Business Type</label>
                                                            <select id="pf-businessType" className="input-field" value={personalForm.businessType} onChange={e => setPersonalForm(f => ({ ...f, businessType: e.target.value }))} style={{ backgroundColor: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                                <option value="">Select</option>
                                                                <option value="manufacturing">Manufacturing</option>
                                                                <option value="services">Services / IT</option>
                                                                <option value="trading">Trading / Retail</option>
                                                                <option value="food_processing">Food Processing</option>
                                                                <option value="handicrafts">Handicrafts / Artisan</option>
                                                                <option value="agribusiness">Agribusiness</option>
                                                                <option value="tech_startup">Tech Startup</option>
                                                                <option value="other">Other</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>MSME / Udyam Registered?</label>
                                                            <select id="pf-msme" className="input-field" value={personalForm.msmeRegistered} onChange={e => setPersonalForm(f => ({ ...f, msmeRegistered: e.target.value }))} style={{ backgroundColor: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                                <option value="">Select</option>
                                                                <option value="yes">✅ Yes, Registered</option>
                                                                <option value="no">❌ Not Yet</option>
                                                                <option value="in_progress">⏳ In Progress</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div style={{ marginTop: '0.75rem' }}>
                                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>Annual Turnover (₹)</label>
                                                        <input id="pf-turnover" type="number" className="input-field" placeholder="e.g. 500000" value={personalForm.annualTurnover} onChange={e => setPersonalForm(f => ({ ...f, annualTurnover: e.target.value }))} style={{ backgroundColor: 'white', fontSize: '0.85rem' }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* ── INTEREST CATEGORIES ── */}
                                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem' }}>
                                            <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>🔔 What type of scheme updates do you want?</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
                                                {[
                                                    { id: 'Startup & Innovation', emoji: '🚀' },
                                                    { id: 'MSME & Business', emoji: '🏢' },
                                                    { id: 'Agriculture', emoji: '🌾' },
                                                    { id: 'Education & Scholarship', emoji: '🎓' },
                                                    { id: 'Healthcare', emoji: '🏥' },
                                                    { id: 'Women Empowerment', emoji: '👩' },
                                                    { id: 'Housing', emoji: '🏠' },
                                                    { id: 'Employment & Jobs', emoji: '💼' },
                                                    { id: 'Skill Development', emoji: '🛠️' },
                                                    { id: 'Social Welfare', emoji: '🤝' },
                                                    { id: 'Technology & Digital', emoji: '💻' },
                                                    { id: 'Finance & Banking', emoji: '🏦' },
                                                ].map(cat => {
                                                    const isChecked = personalForm.interests.includes(cat.id);
                                                    return (
                                                        <label key={cat.id} style={{
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                            background: isChecked ? '#dcfce7' : 'white',
                                                            border: `1.5px solid ${isChecked ? '#22c55e' : '#d1d5db'}`,
                                                            borderRadius: '10px', padding: '8px 10px', cursor: 'pointer',
                                                            transition: 'all 0.2s', fontSize: '0.82rem', fontWeight: 600,
                                                            color: isChecked ? '#166534' : '#475569',
                                                        }}>
                                                            <input
                                                                type="checkbox" checked={isChecked}
                                                                onChange={() => setPersonalForm(f => ({
                                                                    ...f,
                                                                    interests: isChecked
                                                                        ? f.interests.filter(i => i !== cat.id)
                                                                        : [...f.interests, cat.id],
                                                                }))}
                                                                style={{ accentColor: '#22c55e' }}
                                                            />
                                                            <span>{cat.emoji} {cat.id}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Row: Phone + Email */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>📱 Phone (for SMS updates)</label>
                                                <input id="pf-phone" type="tel" maxLength={10} className="input-field" placeholder="9876543210" value={personalForm.phone} onChange={e => setPersonalForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} style={{ backgroundColor: '#f8fafc' }} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>📧 Email (for updates)</label>
                                                <input id="pf-email" type="email" className="input-field" placeholder="you@example.com" value={personalForm.email} onChange={e => setPersonalForm(f => ({ ...f, email: e.target.value }))} style={{ backgroundColor: '#f8fafc' }} />
                                            </div>
                                        </div>

                                        <p style={{ margin: '0', fontSize: '0.75rem', color: '#94a3b8' }}>
                                            🔒 Aapki personal information secure hai. Hum sirf relevant scheme updates bhejenge.
                                        </p>

                                        {personalFormError && (
                                            <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', fontSize: '0.85rem', fontWeight: 600 }}>
                                                {personalFormError}
                                            </div>
                                        )}

                                        <button
                                            id="personal-form-submit" type="submit" disabled={personalFormLoading}
                                            style={{
                                                background: personalFormLoading ? '#e2e8f0' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                                                color: personalFormLoading ? '#94a3b8' : 'white',
                                                border: 'none', borderRadius: '14px', padding: '1rem',
                                                fontWeight: 700, fontSize: '1rem', cursor: personalFormLoading ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                                boxShadow: personalFormLoading ? 'none' : '0 6px 20px rgba(124,58,237,0.35)',
                                                fontFamily: 'inherit', transition: 'all 0.3s', marginTop: '0.25rem',
                                            }}
                                        >
                                            {personalFormLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                            {personalFormLoading ? 'AI Analyzing Your Profile...' : '✨ Find My Schemes & Subscribe for Updates'}
                                        </button>
                                    </form>

                                    {/* Results */}
                                    {personalSchemes.length > 0 && (
                                        <div className="animate-fade-in-up" style={{ marginTop: '1.5rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                                            <h4 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Award size={20} color="#7c3aed" /> Top Recommended Schemes for You
                                            </h4>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                                {personalSchemes.map((scheme, i) => (
                                                    <SchemeCard key={i} scheme={scheme} index={i} />
                                                ))}
                                            </div>

                                            {personalForm.interests.length > 0 && (
                                                <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Sparkles size={16} /> You'll receive AI-matched updates for: {personalForm.interests.join(', ')}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
                                                {personalForm.phone && (
                                                    <div style={{ padding: '0.75rem 1rem', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#065f46' }}>
                                                        📱 SMS alerts → {personalForm.phone}
                                                    </div>
                                                )}
                                                {personalForm.email && (
                                                    <div style={{ padding: '0.75rem 1rem', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, color: '#1e40af' }}>
                                                        📧 Email alerts → {personalForm.email}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setActiveTab('advisor');
                                                    // Allow the advisor tab to mount, then pre-fill and focus
                                                    setTimeout(() => {
                                                        const ta = document.querySelector('textarea[placeholder*="message"]');
                                                        if (ta) {
                                                            const schemeNames = personalSchemes.map(s => s.name).join(', ');
                                                            // We set the native value and dispatch an input event so React state updates
                                                            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
                                                            nativeInputValueSetter.call(ta, `I just got recommended these schemes: ${schemeNames}. Can you help me understand how to apply for them based on my profile?`);
                                                            const event = new Event('input', { bubbles: true});
                                                            ta.dispatchEvent(event);
                                                            ta.focus();
                                                        }
                                                    }, 100);
                                                }}
                                                style={{
                                                    width: '100%', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white',
                                                    border: 'none', borderRadius: '12px', padding: '1rem',
                                                    fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                                    boxShadow: '0 4px 12px rgba(124,58,237,0.25)', transition: 'transform 0.2s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                <MessageSquare size={18} /> Chat about these schemes →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── ADVISOR TAB ── */}
                {activeTab === 'advisor' && <AdvisorSection apiUrl={CHAT_ANALYZE_URL} authToken={authToken} />}

                {/* ── CHAT TAB ── */}
                {/* ── REGISTER TAB ── */}
                {activeTab === 'register' && (
                    <div className="glass-card animate-fade-in" style={{ padding: '1.75rem' }}>
                        <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: '#f3e8ff', padding: '8px', borderRadius: '10px', color: '#7c3aed' }}>
                                <UserPlus size={20} />
                            </div>
                            Citizen Registration
                        </h2>

                        {userId && (
                            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#16a34a' }}>✅ You are registered & logged in!</p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#16a34a' }}>User ID: {userId}</p>
                                <button onClick={() => { localStorage.clear(); setAuthToken(''); setUserId(''); }} style={{ marginTop: '12px', background: 'white', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600, color: '#16a34a', cursor: 'pointer', fontFamily: 'inherit' }}>Sign Out</button>
                            </div>
                        )}

                        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '400px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Mobile Number *</label>
                                    <input
                                        id="reg-phone_number"
                                        type="tel"
                                        className="input-field"
                                        placeholder="9876543210"
                                        value={regForm.phone_number}
                                        onChange={e => setRegForm(f => ({ ...f, phone_number: e.target.value.replace(/\D/g, '') }))}
                                        style={{ backgroundColor: '#f8fafc' }}
                                        maxLength={10}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Aadhaar Number (Optional)</label>
                                    <input
                                        id="reg-aadhaar_id"
                                        type="text"
                                        className="input-field"
                                        placeholder="12-digit Aadhaar (demographic data auto-fetch)"
                                        value={regForm.aadhaar_id}
                                        onChange={e => setRegForm(f => ({ ...f, aadhaar_id: e.target.value.replace(/\D/g, '') }))}
                                        style={{ backgroundColor: '#f8fafc' }}
                                        maxLength={12}
                                    />
                                    <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                        Aadhaar number se aapki age, income, state, education automatically fill ho jayegi. SMS notifications automatically ON ho jayengi. 🔔
                                    </p>
                                </div>
                            </div>

                            {regMsg.text && (
                                <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid', background: regMsg.type === 'ok' ? '#f0fdf4' : '#fff1f2', borderColor: regMsg.type === 'ok' ? '#bbf7d0' : '#fecdd3', color: regMsg.type === 'ok' ? '#16a34a' : '#e11d48', fontSize: '0.9rem', fontWeight: 600 }}>
                                    {regMsg.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                id="register-btn"
                                disabled={regLoading || regForm.phone_number.length < 10}
                                style={{
                                    background: regLoading ? '#e2e8f0' : '#0f172a',
                                    color: regLoading ? '#94a3b8' : 'white',
                                    border: 'none', borderRadius: '14px', padding: '1rem',
                                    fontWeight: 700, fontSize: '1rem', cursor: regLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    boxShadow: regLoading ? 'none' : '0 4px 12px rgba(15,23,42,0.2)', fontFamily: 'inherit',
                                    transition: 'all 0.2s', marginTop: '0.5rem'
                                }}
                                onMouseEnter={e => { if (!regLoading) e.target.style.background = '#1e293b'; }}
                                onMouseLeave={e => { if (!regLoading) e.target.style.background = '#0f172a'; }}
                            >
                                {regLoading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={20} />}
                                {regLoading ? 'Registering...' : 'Register as Citizen'}
                            </button>
                        </form>
                    </div>
                )}

                {/* ── ADMIN TAB ── */}
                {activeTab === 'admin' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">

                        {/* API Config */}
                        <div className="glass-card" style={{ padding: '1.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '10px', color: '#475569' }}>
                                        <Settings size={20} />
                                    </div>
                                    API Configuration
                                </h2>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: IS_DEMO_MODE ? '#78350f' : '#065f46' }}>
                                    {IS_DEMO_MODE ? '⚠️ Demo Mode Active — No Live API' : '✅ Live API Connected'}
                                </span>
                            </div>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6 }}>
                                    {IS_DEMO_MODE
                                        ? 'VITE_API_URL environment variable set nahi hai. App demo data use kar raha hai. Asli API connect karne ke liye niche steps follow karein.'
                                        : `API URL: ${API_BASE}`
                                    }
                                </p>
                            </div>

                            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                                🔧 Setup Instructions
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {[
                                    { step: '1', title: 'Lambda Deploy Karein', desc: 'AWS Console mein lambda_function.py upload karein. Runtime: Python 3.11. Bedrock model access enable karein.' },
                                    { step: '2', title: 'API Gateway Configure Karein', desc: 'POST method create karein, Lambda integrate karein, CORS enable karein, stage deploy karein.' },
                                    { step: '3', title: '.env File Banayein', desc: 'CivicBridgeAI/frontend/ folder mein .env file banayein:\nVITE_API_URL=https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod/analyze' },
                                    { step: '4', title: 'Dev Server Restart Karein', desc: 'npm run dev se server restart karein taaki env variable load ho.' },
                                ].map(item => (
                                    <div key={item.step} style={{
                                        display: 'flex', gap: '1rem',
                                        background: 'white', border: '1px solid #e2e8f0',
                                        borderRadius: '12px', padding: '0.875rem',
                                    }}>
                                        <div style={{
                                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                            color: 'white', borderRadius: '8px',
                                            width: '28px', height: '28px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, fontWeight: 800, fontSize: '0.8rem',
                                        }}>
                                            {item.step}
                                        </div>
                                        <div>
                                            <p style={{ margin: '0 0 0.25rem', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{item.title}</p>
                                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.6, fontFamily: item.step === '3' ? 'monospace' : 'inherit', whiteSpace: item.step === '3' ? 'pre-line' : 'normal' }}>{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Backend Info */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Info size={18} style={{ color: '#4f46e5' }} />
                                Backend Architecture
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                {[
                                    { icon: '⚡', label: 'Runtime', value: 'AWS Lambda (Python 3.11)' },
                                    { icon: '🤖', label: 'AI Model', value: 'Amazon Nova (Bedrock)' },
                                    { icon: '🌏', label: 'Region', value: 'ap-south-1 (Mumbai)' },
                                    { icon: '🔒', label: 'Auth', value: 'IAM + CORS' },
                                    { icon: '📦', label: 'Response', value: 'JSON (answer + checklist)' },
                                    { icon: '💰', label: 'Cost', value: 'AWS Free Tier Compatible' },
                                ].map(item => (
                                    <div key={item.label} style={{
                                        background: '#f8fafc', border: '1px solid #e2e8f0',
                                        borderRadius: '12px', padding: '0.875rem',
                                        display: 'flex', flexDirection: 'column', gap: '4px',
                                    }}>
                                        <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>{item.label}</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Demo Schemes List */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={18} style={{ color: '#4f46e5' }} />
                                Built-in Demo Schemes
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {DEMO_SCHEMES.map(s => (
                                    <div key={s.id} style={{
                                        background: '#f8fafc', border: '1px solid #e2e8f0',
                                        borderRadius: '10px', padding: '0.75rem 1rem',
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                    }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{s.name}</span>
                                    </div>
                                ))}
                            </div>
                            <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                                Demo mode mein in schemes ke liye pre-built AI responses hain for offline showcase.
                            </p>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer style={{ textAlign: 'center', padding: '1.25rem 1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                CivicBridge AI — Powered by Amazon Bedrock &nbsp;·&nbsp; Built for India 🇮🇳
            </footer>
        </div>
    );
}
