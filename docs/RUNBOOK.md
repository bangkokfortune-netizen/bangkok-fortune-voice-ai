# Bangkok Fortune Voice AI - Production Runbook

> **Status**: Scaffold Complete - Production code to be added in next phase  
> **Last Updated**: October 19, 2025

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Local Development](#local-development)
4. [Railway Deployment](#railway-deployment)
5. [Twilio Configuration](#twilio-configuration)
6. [Square Setup](#square-setup)
7. [Monitoring & Logs](#monitoring--logs)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/bangkokfortune-netizen/bangkok-fortune-voice-ai.git
cd bangkok-fortune-voice-ai
pnpm install

# 2. Copy and configure environment
cp .env.sample .env
# Edit .env with your credentials

# 3. Start development
pnpm dev
```

---

## 📦 Prerequisites

- **Node.js**: v20.0.0 or higher
- **pnpm**: v8.0.0 or higher
- **Accounts Required**:
  - OpenAI API key (GPT-5 + Realtime API access)
  - ElevenLabs API key
  - Square developer account (sandbox + production)
  - Twilio account with phone number
  - Railway account (for deployment)

---

## 💻 Local Development

### Install Dependencies

```bash
pnpm install
```

### Environment Setup

```bash
cp .env.sample .env
```

Edit `.env` with your actual credentials (see `.env.sample` for all required variables).

### Run Development Server

```bash
# Start all packages in watch mode
pnpm dev

# Or run specific package
pnpm --filter @bangkok-fortune/voice-gateway dev
```

### Test Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","timestamp":"...","services":{...}}
```

---

## 🚂 Railway Deployment

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `bangkok-fortune-voice-ai`

### 2. Configure Environment Variables

In Railway dashboard, add all variables from `.env.sample`:

```bash
OPENAI_API_KEY=sk-proj-...
ELEVENLABS_API_KEY=...
SQUARE_ACCESS_TOKEN=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
OWNER_ALERT_PHONE=...
TIMEZONE=America/New_York
# ... etc
```

### 3. Deploy

```bash
# Automatic deployment on git push to main
git push origin main

# Or use Railway CLI
railway up
```

### 4. Note Your Service URL

After deployment, Railway will provide a URL like:
```
https://bangkok-fortune-voice-ai-production.up.railway.app
```

You'll need this for Twilio configuration.

---

## ☎️ Twilio Configuration

### 1. Get Your Twilio Phone Number

1. Log in to [Twilio Console](https://console.twilio.com/)
2. Navigate to Phone Numbers → Manage → Active Numbers
3. Buy a new number (NYC 929 area code recommended) or use existing

### 2. Configure Voice Webhook

1. Click on your phone number
2. Scroll to "Voice Configuration"
3. Set **"A CALL COMES IN"** to:
   - **Webhook**: `https://YOUR-RAILWAY-URL.railway.app/voice/incoming`
   - **HTTP Method**: `POST`

### 3. Configure Media Streams

The `/voice/incoming` endpoint will automatically set up TwiML that redirects to WebSocket:

```xml
<Response>
  <Connect>
    <Stream url="wss://YOUR-RAILWAY-URL.railway.app/ws/twilio" />
  </Connect>
</Response>
```

### 4. Test the Integration

Call your Twilio number. You should hear:
- **English**: "Hello! Thank you for calling Bangkok Fortune. How may I help you today?"
- **Thai** (if detected): "สวัสดีค่ะ..."

---

## 📊 Square Setup

### 1. Create Square Application

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Click "+ New Application"
3. Name it "Bangkok Fortune Voice AI"

### 2. Get Credentials

1. Navigate to **OAuth** tab
2. Copy:
   - **Sandbox Access Token** (for testing)
   - **Production Access Token** (for live)
   - **Location ID** (from Square Dashboard → Locations)

### 3. Required Permissions

Ensure your app has these OAuth scopes:
- `APPOINTMENTS_READ`
- `APPOINTMENTS_WRITE`
- `APPOINTMENTS_BUSINESS_SETTINGS_READ`
- `CUSTOMERS_READ`
- `CUSTOMERS_WRITE`

### 4. Configure Services in Square

1. Log in to [Square Dashboard](https://squareup.com/dashboard)
2. Go to **Appointments** → **Services**
3. Add services matching `config/business.yaml`:
   - Thai Massage (60/90 min)
   - Deep Tissue (60/90 min)
   - Swedish (60/90 min)
   - Waxing (30/60 min)

---

## 🔍 Monitoring & Logs

### View Logs on Railway

```bash
# Using Railway CLI
railway logs

# Or view in Railway dashboard
```

### Health Check

```bash
curl https://YOUR-RAILWAY-URL.railway.app/health
```

### Daily Report

The system sends an SMS daily at 22:30 ET to `OWNER_ALERT_PHONE` with:
- Total calls
- Bookings made
- Estimated revenue
- No-shows
- System health

---

## 🐛 Troubleshooting

### Issue: Twilio Call Connects but No Audio

**Solution**: Check WebSocket endpoint is accessible:
```bash
wscat -c wss://YOUR-RAILWAY-URL.railway.app/ws/twilio
# Should connect without errors
```

### Issue: Square Booking Fails

**Solution**: 
1. Verify `SQUARE_ENVIRONMENT` is set correctly (`sandbox` vs `production`)
2. Check location ID matches your Square account
3. Ensure services exist in Square dashboard

### Issue: Speech Not Detected

**Solution**:
1. Verify OpenAI Realtime API key has correct permissions
2. Check audio codec in Twilio settings (should be PCM μ-law)
3. Review logs for STT errors

### Issue: Wrong Language Detected

**Solution**: The system auto-detects language from first utterance. Update prompts in `packages/brain/src/prompts/` if needed.

---

## 📞 Support

For technical issues:
1. Check logs first: `railway logs`
2. Review [API.md](./API.md) for endpoint documentation
3. See [OWNER_GUIDE.md](./OWNER_GUIDE.md) for business configuration

---

## 🔐 Security Reminders

- ✅ All secrets in environment variables (never commit)
- ✅ PII redaction enabled in logs (see `LOG_PII_REDACTION=true`)
- ✅ HTTPS only (enforced by Railway)
- ✅ Rate limiting configured (see cost guardrails in `.env`)

---

**Next Steps**: See [OWNER_GUIDE.md](./OWNER_GUIDE.md) for business operations and [API.md](./API.md) for developer reference.
