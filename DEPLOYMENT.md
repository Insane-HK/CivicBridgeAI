# 🚀 CivicBridge AI - Deployment Guide

Complete guide to deploy CivicBridge AI to AWS.

## 📋 Prerequisites

### Required Tools
- [x] AWS CLI installed and configured (`aws configure`)
- [x] AWS SAM CLI installed ([Install Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
- [x] Node.js 18+ and npm
- [x] Git

### AWS Account Requirements
- [x] Active AWS account
- [x] IAM user with permissions for:
  - Lambda, API Gateway, DynamoDB, S3, CloudFormation
  - Bedrock model access
  - SSM Parameter Store
  - SNS (for SMS notifications)

## 🔧 Pre-Deployment Setup

### 1. Bedrock Models (Auto-Enabled!)

**Good news!** AWS Bedrock models are now **automatically enabled** when first invoked.

- ✅ **Amazon Nova Lite** (`us.amazon.nova-lite-v1:0`) - Auto-enabled on first use
- ✅ **Amazon Nova Pro** (`us.amazon.nova-pro-v1:0`) - Auto-enabled on first use

**No manual activation needed!** Models will be activated automatically when your Lambda functions invoke them for the first time.

**Note:** For Anthropic models (Claude), first-time users may need to submit use case details. Amazon Nova models (used in this project) are instantly available without any approval process.

If you want to verify available models (optional):
```bash
aws bedrock list-foundation-models --region us-east-1 --query 'modelSummaries[?contains(modelId, `nova`)]'
```

### 2. Configure AWS Credentials

```bash
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `ap-south-1` (Mumbai)
- Default output format: `json`

Verify:
```bash
aws sts get-caller-identity
```

## 🚀 Deployment Methods

### Method 1: Automated Deployment (Recommended)

#### Windows (PowerShell):
```powershell
.\deploy.ps1
```

#### Linux/Mac (Bash):
```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. ✅ Check AWS credentials
2. ✅ Generate and store JWT secret in SSM
3. ✅ Verify Bedrock model access
4. ✅ Build SAM application
5. ✅ Deploy to AWS
6. ✅ Update frontend `.env` with API URL

### Method 2: Manual Deployment

#### Step 1: Create JWT Secret
```bash
# Generate random secret
JWT_SECRET=$(openssl rand -base64 32)

# Store in SSM Parameter Store
aws ssm put-parameter \
    --name "/civicbridge/jwt-secret" \
    --value "$JWT_SECRET" \
    --type "SecureString" \
    --region ap-south-1
```

#### Step 2: Build SAM Application
```bash
sam build
```

#### Step 3: Deploy to AWS
```bash
sam deploy --guided
```

Answer the prompts:
- Stack Name: `civicbridge-ai-mvp` (or your choice)
- AWS Region: `ap-south-1`
- Confirm changes: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Disable rollback: `N`
- Save arguments to config: `Y`

#### Step 4: Get API Gateway URL
```bash
aws cloudformation describe-stacks \
    --stack-name civicbridge-ai-mvp \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiBaseUrl`].OutputValue' \
    --output text \
    --region ap-south-1
```

#### Step 5: Update Frontend Configuration
Edit `frontend/.env`:
```env
VITE_API_URL=https://YOUR-API-ID.execute-api.ap-south-1.amazonaws.com/Prod
```

## 🧪 Post-Deployment Testing

### 1. Test Health Endpoint
```bash
curl https://YOUR-API-URL/health
```

Expected response:
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

### 3. Register a Test User
```bash
curl -X POST https://YOUR-API-URL/users \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "9876543210",
    "aadhaar_id": "111122223333"
  }'
```

Save the returned `token` and `user_id` for authenticated requests.

### 4. Test Chat Endpoint
```bash
curl -X POST https://YOUR-API-URL/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "PM Kisan scheme ke liye kya eligibility hai?"
  }'
```

## 🎨 Frontend Deployment

### Local Development
```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

### Production Build
```bash
cd frontend
npm run build
```

Deploy `frontend/dist/` to:
- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **AWS S3 + CloudFront**: Use AWS Amplify or manual S3 bucket

## 📱 SMS Configuration (Optional)

SNS is in **sandbox mode** by default. To send SMS:

### Option 1: Verify Test Numbers (Sandbox)
1. Go to AWS SNS Console (ap-south-1)
2. Navigate to "Text messaging (SMS)" → "Sandbox destination phone numbers"
3. Add phone numbers (format: +919876543210)
4. Verify via OTP

### Option 2: Exit Sandbox (Production)
1. Go to SNS Console → "Text messaging (SMS)"
2. Click "Exit SMS sandbox"
3. Fill out the form (use case, monthly volume)
4. Wait for AWS approval (1-2 business days)

## 🔍 Monitoring & Debugging

### CloudWatch Logs
```bash
# View Lambda logs
sam logs -n ChatHandlerFunction --stack-name civicbridge-ai-mvp --tail

# View all functions
sam logs --stack-name civicbridge-ai-mvp --tail
```

### DynamoDB Tables
- `CivicBridge-Users-dev` - User profiles
- `CivicBridge-Schemes-dev` - Processed schemes
- `CivicBridge-Conversations-dev` - Chat history

### S3 Buckets
- `civicbridge-schemes-{account}-dev` - Scheme PDFs
- `civicbridge-chat-uploads-{account}-dev` - Chat uploads (24h lifecycle)

## 🔄 Update Deployment

After code changes:
```bash
sam build
sam deploy
```

No need to re-run guided deployment.

## 🗑️ Cleanup (Delete Stack)

```bash
# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name civicbridge-ai-mvp --region ap-south-1

# Delete S3 buckets (must be empty first)
aws s3 rb s3://civicbridge-schemes-{account}-dev --force
aws s3 rb s3://civicbridge-chat-uploads-{account}-dev --force

# Delete SSM parameter
aws ssm delete-parameter --name "/civicbridge/jwt-secret" --region ap-south-1
```

## ❓ Troubleshooting

### Issue: "Bedrock model not found"
**Solution:** Models auto-enable on first invocation. If you see this error:
1. The model will be activated automatically on the first call
2. Retry the operation - it should work on the second attempt
3. For Anthropic models, you may need to submit use case details first

### Issue: "JWT secret not found"
**Solution:** Run deployment script or manually create SSM parameter

### Issue: "SMS not sending"
**Solution:** Verify phone numbers in SNS sandbox or exit sandbox mode

### Issue: "CORS errors in frontend"
**Solution:** Check API Gateway CORS configuration in `template.yaml`

### Issue: "Lambda timeout"
**Solution:** Increase timeout in `template.yaml` (default: 30s)

## 📚 Additional Resources

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [Amazon Bedrock User Guide](https://docs.aws.amazon.com/bedrock/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway CORS](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)

## 🆘 Support

For issues or questions:
1. Check CloudWatch Logs
2. Review this deployment guide
3. Check AWS service quotas
4. Verify IAM permissions

---

**Last Updated:** March 2026  
**Version:** 1.0.0-mvp
