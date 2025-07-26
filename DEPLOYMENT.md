# AskMeFr Deployment Guide

## 🚀 Quick Deploy to Vercel

### 1. GitHub Setup
```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: AskMeFr AI Research Assistant"

# Add GitHub remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/askmefr.git

# Push to GitHub
git push -u origin main
```

### 2. Vercel Deployment

#### Option A: Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: askmefr
# - Directory: ./
# - Override settings? No
```

#### Option B: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables (see below)
5. Deploy

### 3. Environment Variables
Add these in Vercel Dashboard → Project → Settings → Environment Variables:

```
GEMINI_API_KEY=your_gemini_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
NODE_ENV=production
FRONTEND_URL=https://your-app-name.vercel.app
```

### 4. Update Frontend API URL
After deployment, update `script.js` line ~17:
```javascript
// Change from:
this.apiUrl = 'http://localhost:3001/api';

// To:
this.apiUrl = 'https://your-app-name.vercel.app/api';
```

### 5. Redeploy
```bash
# After updating API URL
git add .
git commit -m "Update API URL for production"
git push

# Vercel will auto-deploy
```

## 🔧 API Keys Setup

### Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key
3. Copy and add to Vercel environment variables

### Tavily API Key
1. Visit [Tavily.com](https://tavily.com)
2. Sign up and get API key from dashboard
3. Copy and add to Vercel environment variables

## 🎯 Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] API URL updated in frontend
- [ ] Test all 6 research modes
- [ ] Test spotlight search (Ctrl+/)
- [ ] Test contextual conversations
- [ ] Verify mobile responsiveness
- [ ] Check citation links functionality

## 🌐 Custom Domain (Optional)

1. In Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update `FRONTEND_URL` environment variable

## 📊 Monitoring

- **Vercel Analytics**: Automatic traffic monitoring
- **Function Logs**: View in Vercel Dashboard → Functions
- **Error Tracking**: Check Vercel Dashboard → Functions → Errors

## 🔄 Updates

```bash
# Make changes locally
git add .
git commit -m "Your update message"
git push

# Vercel auto-deploys from main branch
```

---

Your AskMeFr will be live at: `https://your-app-name.vercel.app` 🚀