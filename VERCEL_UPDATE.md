# 🚀 Update Vercel with API URL

## Quick Steps (2 minutes)

### 1. Open Vercel Settings
Click this link: https://vercel.com/insane-hks-projects/stream-stake20-eqh8/settings/environment-variables

### 2. Add Environment Variable

Click **"Add New"** button

Fill in:
```
Name:  VITE_API_URL
Value: https://47d67dhi7g.execute-api.ap-south-1.amazonaws.com/Prod
```

Select: ✅ Production ✅ Preview ✅ Development

Click **"Save"**

### 3. Redeploy

Go to: https://vercel.com/insane-hks-projects/stream-stake20-eqh8

Find your latest deployment → Click **3 dots (⋮)** → Click **"Redeploy"**

### 4. Test

After redeployment (1-2 minutes):
- Visit: https://stream-stake20-eqh8.vercel.app/
- Go to "Find Schemes (Aadhaar)" tab
- Enter: `111122223333`
- Click "Fetch Details"
- Should see: Rahul Sharma's data!

---

## ✅ Done!

Your frontend will now connect to the live backend API!

**API URL:** https://47d67dhi7g.execute-api.ap-south-1.amazonaws.com/Prod
