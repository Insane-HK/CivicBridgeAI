# ⚡ CivicBridge AI - Quick Start

Get CivicBridge AI running in 5 minutes!

## 🎯 Choose Your Path

### Path 1: Demo Mode (No AWS Required) ⚡
**Perfect for:** Testing the UI, understanding features

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 - Works with mock data!

---

### Path 2: Full AWS Deployment 🚀
**Perfect for:** Production use, real AI responses

#### Prerequisites Checklist
- [ ] AWS account with credentials configured
- [ ] AWS SAM CLI installed
- [ ] ✅ Bedrock models (auto-enabled on first use!)

#### One-Command Deploy (Windows)
```powershell
.\deploy.ps1
```

#### One-Command Deploy (Linux/Mac)
```bash
chmod +x deploy.sh && ./deploy.sh
```

That's it! The script handles everything.

---

## 🧪 Test Your Deployment

### 1. Health Check
```bash
curl https://YOUR-API-URL/health
```

### 2. Try Aadhaar Lookup
Use demo Aadhaar: `111122223333`

### 3. Register & Chat
1. Go to Register tab
2. Enter phone: `9876543210`
3. Enter Aadhaar: `111122223333`
4. Start chatting!

---

## 📖 Need More Details?

- **Full deployment guide:** See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Architecture overview:** See [README.md](./README.md)
- **API documentation:** Check Lambda handler files

---

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Bedrock model not found" | Enable models in Bedrock console (us-east-1) |
| "AWS credentials not found" | Run `aws configure` |
| Frontend shows errors | Check `frontend/.env` has correct API URL |
| SMS not working | Verify phone in SNS sandbox |

---

**Ready to deploy?** Run `.\deploy.ps1` (Windows) or `./deploy.sh` (Linux/Mac)
