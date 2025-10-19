# Bangkok Fortune Voice AI 🎙️ 

<div align="center">

**Production-grade bilingual Thai/English AI voice receptionist for NYC spa**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.0.0+-339933.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178c6.svg)](https://www.typescriptlang.org/)
[![Railway](https://img.shields.io/badge/Deploy-Railway-black.svg)](https://railway.app)

</div>

## 🌟 Overview

A sophisticated AI voice receptionist that handles inbound calls for **Bangkok Fortune Thai Massage & Waxing Spa** in NYC. The system provides natural bilingual conversations (Thai/English), books appointments through Square, sends SMS confirmations, and generates daily reports.

### ✨ Key Features

- **🎯 Bilingual**: Auto-detects Thai/English, switches seamlessly
- **📞 Voice AI**: OpenAI Realtime API + ElevenLabs TTS for natural conversations
- **📅 Appointments**: Full Square Appointments integration with availability search
- **💬 Notifications**: SMS confirmations via Twilio with detailed instructions
- **📊 Reporting**: Daily revenue and booking reports to owner
- **🏗️ Production-Ready**: Cost guardrails, error handling, PII redaction

---

## 🏛️ Architecture

This is a **pnpm monorepo** with the following packages:

```
bangkok-fortune-voice-ai/
├── packages/
│   ├── voice-gateway/     # Twilio Media Streams WebSocket + STT/TTS
│   ├── brain/             # GPT-5 NLP engine with tools & policies
│   └── integrations/      # Square, Twilio, LINE OA clients
├── config/
│   └── business.yaml      # Owner-trainable business configuration
├── docs/
│   ├── RUNBOOK.md        # Production deployment guide
│   ├── API.md            # API documentation (to be added)
│   └── OWNER_GUIDE.md    # Business operations guide (to be added)
├── infra/
│   └── railway/          # Railway deployment configuration
└── .env.sample           # Environment variables template
```

### 🔄 Voice Call Flow

1. **Inbound Call** → Twilio phone number
2. **WebSocket Stream** → Media Stream to `/ws/twilio`
3. **Speech-to-Text** → OpenAI Realtime API
4. **NLP Processing** → GPT-5 with tool calls (Square, FAQ)
5. **Text-to-Speech** → ElevenLabs streaming back to caller
6. **Actions** → Book appointments, send SMS confirmations

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20.0.0+ 
- **pnpm** v8.0.0+
- API keys for: OpenAI, ElevenLabs, Square, Twilio

### Installation

```bash
# Clone the repository
git clone https://github.com/bangkokfortune-netizen/bangkok-fortune-voice-ai.git
cd bangkok-fortune-voice-ai

# Install dependencies
pnpm install

# Copy and configure environment
cp .env.sample .env
# Edit .env with your API keys

# Start development servers
pnpm dev
```

### Environment Variables

See [`.env.sample`](.env.sample) for all required environment variables. Key ones include:

```bash
OPENAI_API_KEY=sk-proj-...
ELEVENLABS_API_KEY=...
SQUARE_ACCESS_TOKEN=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+19291234567
OWNER_ALERT_PHONE=+19171234567
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [RUNBOOK.md](docs/RUNBOOK.md) | Complete deployment guide with Railway + Twilio setup |
| [business.yaml](config/business.yaml) | Owner-trainable business configuration |
| [.env.sample](.env.sample) | All environment variables with descriptions |

---

## 🏗️ Development

### Project Structure

- **`packages/voice-gateway/`**: Handles Twilio Media Streams, WebSocket connections, and audio processing
- **`packages/brain/`**: Core AI logic with GPT-5, tool definitions, and conversation policies
- **`packages/integrations/`**: External service clients (Square, Twilio SMS, LINE)
- **`config/business.yaml`**: Business rules, services, pricing, hours, FAQ

### Available Scripts

```bash
# Development (all packages in watch mode)
pnpm dev

# Build all packages
pnpm build

# Start production servers
pnpm start

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Package-Specific Commands

```bash
# Run specific package
pnpm --filter @bangkok-fortune/voice-gateway dev
pnpm --filter @bangkok-fortune/brain build
pnpm --filter @bangkok-fortune/integrations test
```

---

## 🚀 Deployment

### Railway (Recommended)

1. **Connect Repository**: Link this GitHub repo to Railway
2. **Set Environment Variables**: Copy all variables from `.env.sample`
3. **Deploy**: Railway auto-deploys on push to main
4. **Configure Twilio**: Point voice webhook to your Railway URL

See [RUNBOOK.md](docs/RUNBOOK.md) for detailed deployment instructions.

### Health Check

```bash
curl https://your-app.railway.app/health
# Returns: {"status":"healthy","services":{...}}
```

---

## 🔧 Configuration

### Business Settings

All business logic is configurable in [`config/business.yaml`](config/business.yaml):

- **Services & Pricing**: Thai Massage, Deep Tissue, Swedish, Waxing
- **Hours & Policies**: Cancellation rules, payment methods
- **Language**: Thai/English tone, greetings, FAQ
- **Contact Information**: Address, phone, lobby instructions

### Key Features

```yaml
services:
  - name: "Thai Massage"
    durations: [60, 90]
    prices: { 60: 80, 90: 120 }
    staff_gender_preference: true

language:
  thai_tone: "สุภาพ เป็นกันเอง กระชับ"
  english_tone: "Warm, concise, professional"
  
address:
  full: "307 7th Ave, 16th Floor, New York, NY 10001"
  lobby_instruction: "Tell doorman you're here for Bangkok Fortune Massage"
```

**No code changes required** - the AI reads this file at runtime.

---

## 🧪 Testing

### Manual Testing

1. **Call your Twilio number**
2. **Speak in Thai or English**
3. **Request appointment booking**
4. **Verify SMS confirmation**
5. **Check Square appointment created**

### API Testing

```bash
# Health check
curl http://localhost:3000/health

# Test Square availability search (with admin token)
curl -X POST http://localhost:3000/tools/square.searchAvailability \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"service":"Deep Tissue","duration":60,"datetimeWindow":"2025-10-20T10:00:00-04:00/2025-10-20T20:00:00-04:00"}'
```

---

## 📊 Monitoring

### Daily Reports

System automatically sends SMS to `OWNER_ALERT_PHONE` at 22:30 ET with:
- Total calls received
- Appointments booked
- Estimated revenue
- No-shows and missed calls
- System health status

### Logs & Debugging

```bash
# View Railway logs
railway logs --follow

# Local development logs
pnpm dev  # Structured JSON logs with pino
```

---

## 🔒 Security & Privacy

- ✅ **PII Redaction**: Phone numbers and personal info masked in logs
- ✅ **HTTPS Only**: All communications encrypted
- ✅ **Rate Limiting**: Cost guardrails prevent API abuse
- ✅ **Environment Variables**: No secrets in code
- ✅ **Input Validation**: All user inputs validated with Zod

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### For Technical Issues
1. Check [RUNBOOK.md](docs/RUNBOOK.md) troubleshooting section
2. Review Railway logs: `railway logs`
3. Test individual endpoints with health checks

### For Business Configuration
1. Edit [`config/business.yaml`](config/business.yaml) for services/pricing
2. Update environment variables for contact info
3. See owner guide (coming soon) for operational procedures

---

<div align="center">

**Built with ❤️ for Bangkok Fortune Thai Massage & Waxing Spa**

[Report Bug](https://github.com/bangkokfortune-netizen/bangkok-fortune-voice-ai/issues) • [Request Feature](https://github.com/bangkokfortune-netizen/bangkok-fortune-voice-ai/issues)

</div>
