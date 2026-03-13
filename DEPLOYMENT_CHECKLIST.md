# 🎯 CivicBridge AI - Deployment Checklist

## ✅ Critical Issues Fixed

### 1. ✅ Health Check Model ID Fixed
- **Issue:** Used wrong Bedrock model ID (`amazon.nova-lite-v1:0`)
- **Fix:** Updated to correct ID (`us.amazon.nova-lite-v1:0`)
- **File:** `lambdas/health/handler.py`
- **Status:** ✅ FIXED & COMMITTED

### 2. ✅ Frontend Environment Configuration
- **Issue:** No `.env` file for API URL configuration
- **Fix:** Created `.env.example` and `.env` templates
- **Files:** `frontend/.env.example`, `frontend/.env`
- **Status:** ✅ FIXED & COMMITTED

### 3. ✅ Deployment Automation
- **Issue:** Manual deployment was complex and error-prone
- **Fix:** Created automated deployment scripts
- **Files:** `deploy.ps1` (Windows), `deploy.sh` (Linux/Mac)
- **Status:** ✅ FIXED & COMMITTED

### 4. ✅ Documentation
- **Issue:** No deployment guide
- **Fix:** Created comprehensive guides
- **Files:** `DEPLOYMENT.md`, `QUICKSTART.md`
- **Status:** ✅ FIXED & COMMITTED

### 5. ✅ Security (.gitignore)
- **Issue:** Sensitive files could be committed
- **Fix:** Added proper `.gitignore`
- **Status:** ✅ FIXED & COMMITTED

---

## 🚀 Ready to Deploy!

### Prerequisites (Do These First!)

#### 1. Bedrock Models (Auto-Enabled! ✅)
**Good news!** AWS Bedrock models are now automatically enabled when first invoked.

- ✅ **Amazon Nova Lite** - Auto-enabled on first Lambda invocation
- ✅ **Amazon Nova Pro** - Auto-enabled on first Lambda invocation

**No manual activation needed!** Just deploy and the models will activate automatically.

**Note:** For Anthropic models, first-time users may need to submit use case details. Amazon Nova models (used in this project) are instantly available.

#### 2. Verify AWS Credentials
```powershell
aws sts get-caller-identity
```

Should show:
```json
{
    "UserId": "AIDA...",
    "Account": "820242942657",
    "Arn": "arn:aws:iam::820242942657:user/HkLEARN"
}
```

✅ **Your credentials are already configured!**

---

## 🎬 Deployment Steps

### Option 1: One-Command Deploy (Recommended)

#### Windows:
```powershell
.\deploy.ps1
```

#### Linux/Mac:
```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. ✅ Check AWS credentials
2. ✅ Create JWT secret in SSM
3. ✅ Confirm Bedrock auto-enablement
4. ✅ Build SAM application
5. ✅ Deploy to AWS
6. ✅ Update frontend `.env`

### Option 2: Manual Deploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed manual steps.

---

## 📋 Post-Deployment Testing

### 1. Test Health Endpoint
```bash
curl https://YOUR-API-URL/health
```

Expected:
```json
{
  "status": "healthy",
  "components": {
    "dynamodb": {"status": "healthy"},
    "s3": {"status": "healthy"},
    "bedrock": {"status": "healthy"}
  }
}
```

### 2. Test Aadhaar Lookup
```bash
curl -X POST https://YOUR-API-URL/aadhaar/lookup \
  -H "Content-Type: application/json" \
  -d '{"aadhaar_id": "111122223333"}'
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

### 4. Register & Test
1. Click "Register" tab
2. Phone: `9876543210`
3. Aadhaar: `111122223333`
4. Click "Register"
5. Go to "Find Schemes" tab
6. Try Aadhaar lookup

---

## 🌐 GitHub & Vercel

### GitHub Status
✅ **All changes pushed to:** https://github.com/Insane-HK/CivicBridgeAI

### Vercel Frontend
🔗 **Live URL:** https://stream-stake20-eqh8.vercel.app/

**To update Vercel with API URL:**
1. Deploy backend first (get API URL)
2. Go to Vercel project settings
3. Add environment variable:
   ```
   VITE_API_URL=https://YOUR-API-URL
   ```
4. Redeploy frontend

---

## ⚠️ Important Notes

### SMS Notifications
- SNS is in **sandbox mode** by default
- To send SMS, verify phone numbers in AWS SNS console
- Or request to exit sandbox (takes 1-2 days)

### Bedrock Models
- **Auto-enabled** on first invocation (no manual setup needed!)
- Amazon Nova models are instantly available
- Models activate automatically when Lambda functions call them
- For Anthropic models, first-time users may need to submit use case details

### JWT Secret
- Automatically created by deployment script
- Stored in SSM Parameter Store: `/civicbridge/jwt-secret`
- Don't share or commit this value

### Costs
- DynamoDB: Pay-per-request (minimal for testing)
- Lambda: Free tier covers testing
- Bedrock: ~$0.0008 per 1K tokens (Nova Lite)
- S3: Minimal storage costs
- **Estimated cost for testing: < $5/month**

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Bedrock model not found" | Models auto-enable on first use - try invoking again |
| "JWT secret not found" | Run deployment script or create manually |
| "AWS credentials not found" | Run `aws configure` |
| Frontend shows errors | Check `frontend/.env` has correct API URL |
| SMS not working | Verify phone in SNS sandbox |
| Health check fails | Check CloudWatch Logs for Lambda errors |

---

## 📞 What You Need to Tell Me

After running the deployment script, please share:

1. ✅ Did the deployment complete successfully?
2. ✅ What is your API Gateway URL? (from script output)
3. ✅ Did the health check pass?
4. ❌ Any errors encountered?

Then I can help you:
- Update Vercel with the API URL
- Test the full flow
- Configure SMS notifications
- Optimize performance

---

## 🎉 Next Steps After Deployment

1. **Test all endpoints** (health, aadhaar, chat, register)
2. **Update Vercel** with API URL
3. **Configure SNS** for SMS (optional)
4. **Monitor CloudWatch Logs** for any issues
5. **Test with real Aadhaar numbers** (if available)
6. **Share with users** and gather feedback

---

**Ready to deploy?** Run `.\deploy.ps1` now! 🚀
