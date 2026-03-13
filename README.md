# CivicBridge AI

> **AI-powered eligibility checker for Indian government schemes** — ask in Hinglish, get instant answers with a visual checklist.

## ✨ Features (MVP)

- 🤖 **AI Chat Interface** — Ask about any scheme in Hindi/English/Hinglish  
- 📋 **Eligibility Checklist** — Color-coded ✅/❌/❓ for each criterion  
- ⚡ **Demo Mode** — Works offline with 3 built-in sample schemes (PM-KISAN, Vidya Lakshmi, PMAY)  
- 💬 **Multi-turn Conversation** — Maintains context across follow-up questions  
- 📱 **Mobile Responsive** — Works on screens from 320px wide  
- 🎨 **Glassmorphism UI** — Modern, premium design with animations  

## 🚀 Quick Start (Demo Mode — No AWS Needed)

```bash
cd CivicBridgeAI/frontend
npm install
npm run dev
```
Open `http://localhost:5173` — the app runs in demo mode with pre-built responses.

## ⚙️ Connect Live AWS API

1. **Deploy Lambda** — Upload `lambda_function.py` to AWS Lambda (Python 3.11)
2. **Enable Bedrock** — Request access to `anthropic.claude-3-haiku-20240307-v1:0` in `us-east-1`
3. **Create API Gateway** — POST endpoint → Lambda, enable CORS
4. **Set Environment Variable**:
   ```
   # CivicBridgeAI/frontend/.env
   VITE_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/analyze
   ```
5. Restart dev server: `npm run dev`

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| AI Backend | AWS Lambda (Python 3.11) |
| AI Model | Claude 3 Haiku via Amazon Bedrock |
| Hosting | AWS API Gateway |

## 📁 Project Structure

```
CivicBridgeAI/
├── lambda_function.py    # AWS Lambda handler (Claude 3 Haiku)
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Main React component (full UI)
│   │   ├── demoData.js   # 3 built-in sample schemes + mock responses
│   │   └── index.css     # Design system (glassmorphism, animations)
│   └── index.html        # Entry point with Google Fonts
└── README.md
```

## 📋 Demo Schemes Included

1. **PM-KISAN** — Farmer income support (₹6,000/year)
2. **Vidya Lakshmi** — Education loan scheme  
3. **PMAY-U** — Housing subsidy for urban citizens

---
Made with ❤️ for Indian citizens | AWS Hackathon MVP
