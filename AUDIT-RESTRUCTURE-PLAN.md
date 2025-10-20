# Bangkok Fortune Voice AI - Full Audit & Restructure Plan

**Date:** October 19, 2025, 11:08 PM EDT
**Status:** Audit Complete - Restructure Ready
**Backup Branch:** backup-audit-restructure ✓

---

## 1. AUDIT FINDINGS

### Current Repository Structure (BEFORE)

```
bangkok-fortune-voice-ai/
├── .github/workflows/          # CI/CD workflows
├── config/                     # Configuration files
├── docs/                       # Documentation
├── infra/railway/              # Railway deployment configs
├── packages/                   # ⚠️ MONOREPO STRUCTURE (Root Cause)
│   ├── brain/                  # Empty placeholder
│   │   └── package.json
│   ├── integrations/           # Empty placeholder
│   │   └── package.json
│   └── voice-gateway/          # 🎯 Main application code
│       ├── src/
│       │   ├── utils/
│       │   ├── ws/
│       │   ├── config.ts
│       │   └── index.ts
│       └── package.json
├── .env.sample
├── .gitignore
├── .npmrc
├── LICENSE
├── README.md
├── package.json                # ⚠️ Root workspace config (problematic)
└── test-quick.js
```

### Root Cause Analysis

**PROBLEM:** Railway deployment failing due to monorepo workspace structure

❌ **Issues Identified:**
1. Root `package.json` configured as workspace with `"workspaces": ["packages/*"]`
2. Railway trying to deploy the root (which has no server code)
3. Actual server code buried in `packages/voice-gateway/`
4. `packages/brain/` and `packages/integrations/` are empty placeholders
5. No clear entry point at root level
6. Missing environment validation
7. Missing health check endpoint
8. No proper logging structure

---

## 2. RECOMMENDED STRUCTURE (AFTER)

### Single-Package Railway Structure

```
bangkok-fortune-voice-ai/
├── .github/workflows/
├── config/
├── docs/
├── infra/
├── src/                        # ✅ NEW - Moved from packages/voice-gateway/src
│   ├── routes/                 # ✅ NEW
│   │   └── health.js           # Health check endpoint
│   ├── utils/
│   │   ├── logger.js           # ✅ NEW - Proper logging
│   │   └── [existing utils]
│   ├── ws/
│   ├── config.ts
│   ├── index.js                # ✅ RENAMED from index.ts
│   └── validate-env.js         # ✅ NEW - Environment validation
├── .env                        # ✅ Required (use .env.sample as template)
├── .env.sample
├── .gitignore
├── .npmrc
├── LICENSE
├── README.md
├── package.json                # ✅ REPLACED - Single package (not workspace)
├── railway.toml                # ✅ NEW - Railway configuration
└── test-quick.js
```

---

## 3. RESTRUCTURE TASKS

### ✅ Task 1: Backup Repository
- [x] Created branch: `backup-audit-restructure`
- [x] Branch URL: https://github.com/bangkokfortune-netizen/bangkok-fortune-voice-ai/tree/backup-audit-restructure

### 🔄 Task 2: Replace Root package.json

**Current (Workspace):**
```json
{
  "name": "@bangkok-fortune/root",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "pnpm --filter voice-gateway dev"
  }
}
```

**New (Single Package):**
```json
{
  "name": "bangkok-fortune-voice-ai",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "validate": "node src/validate-env.js",
    "health": "curl http://localhost:8080/health"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "@deepgram/sdk": "^3.12.0",
    "@google/generative-ai": "^0.21.0",
    "elevenlabs": "^0.18.2",
    "express": "^4.21.1",
    "openai": "^4.73.1",
    "ws": "^8.18.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.10.1",
    "@types/ws": "^8.5.13",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

### 🔄 Task 3: Create src/ Directory Structure

**Actions:**
1. Create `src/` at root
2. Move contents from `packages/voice-gateway/src/*` to root `src/`
3. Ensure all imports are updated

### 🔄 Task 4: Create Required New Files

#### A. `railway.toml`
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "pnpm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[healthcheck]
path = "/health"
interval = 30
timeout = 10
```

#### B. `src/validate-env.js`
```javascript
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('8080'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ANTHROPIC_API_KEY: z.string().min(1, 'Anthropic API key is required'),
  DEEPGRAM_API_KEY: z.string().min(1, 'Deepgram API key is required'),
  ELEVENLABS_API_KEY: z.string().min(1, 'ElevenLabs API key is required'),
});

export function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return env;
  } catch (error) {
    console.error('❌ Environment validation failed:', error.errors);
    process.exit(1);
  }
}
```

#### C. `src/utils/logger.js`
```javascript
export const logger = {
  info: (...args) => console.log('[INFO]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[ERROR]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[WARN]', new Date().toISOString(), ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DEBUG]', new Date().toISOString(), ...args);
    }
  },
};
```

#### D. `src/routes/health.js`
```javascript
import express from 'express';

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

export default router;
```

### 🔄 Task 5: Install Dependencies Fresh

**Commands to run locally:**
```bash
cd bangkok-fortune-voice-ai
rm -rf node_modules packages/*/node_modules
rm -rf pnpm-lock.yaml
pnpm install
```

### 🔄 Task 6: Ensure .env is Present

**Action:**
```bash
cp .env.sample .env
# Then edit .env with actual API keys
```

**Required variables:**
- `PORT=8080`
- `NODE_ENV=development`
- `ANTHROPIC_API_KEY=sk-ant-...`
- `DEEPGRAM_API_KEY=...`
- `ELEVENLABS_API_KEY=...`

### 🔄 Task 7: Validate Environment Variables

**Command:**
```bash
pnpm validate
```

**Expected output:**
```
✅ Environment variables validated successfully
```

### 🔄 Task 8: Launch Server in Dev Mode

**Command:**
```bash
pnpm dev
```

**Expected output:**
```
[INFO] 2025-10-19T23:08:00.000Z Server starting...
[INFO] 2025-10-19T23:08:00.100Z Environment: development
[INFO] 2025-10-19T23:08:00.200Z Voice Gateway listening on port 8080
[INFO] 2025-10-19T23:08:00.300Z WebSocket server ready
```

### 🔄 Task 9: Test /health Endpoint

**Command:**
```bash
curl http://localhost:8080/health
# OR
pnpm health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-19T23:08:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "version": "1.0.0"
}
```

### 🔄 Task 10: Prepare for Railway Deployment

**Pre-deployment checklist:**
- [ ] `railway.toml` configured
- [ ] Environment variables set in Railway dashboard
- [ ] Health check endpoint working
- [ ] Build command: `pnpm install && pnpm build`
- [ ] Start command: `pnpm start`
- [ ] Port: `$PORT` (Railway provides this)

**Railway environment variables to set:**
```
NODE_ENV=production
ANTHROPIC_API_KEY=<your-key>
DEEPGRAM_API_KEY=<your-key>
ELEVENLABS_API_KEY=<your-key>
```

---

## 4. DEPLOYMENT STRATEGY

### Phase 1: Local Testing (Current)
1. Complete file restructure
2. Test locally with `pnpm dev`
3. Verify health endpoint
4. Test voice gateway functionality

### Phase 2: Railway Staging
1. Push restructured code to `main` branch
2. Create Railway staging environment
3. Deploy and test
4. Monitor logs for errors

### Phase 3: Production Deployment
1. Verify staging is stable
2. Update Railway production service
3. Deploy to production
4. Monitor health checks
5. Test end-to-end voice booking flow

---

## 5. ROLLBACK PLAN

If deployment fails:

```bash
git checkout backup-audit-restructure
git push -f origin main
```

Or in Railway:
1. Go to Deployments
2. Find last working deployment
3. Click "Redeploy"

---

## 6. EXPECTED OUTCOMES

### Before Restructure:
- ❌ Railway deployment fails (can't find entry point)
- ❌ Monorepo complexity
- ❌ No environment validation
- ❌ No health checks
- ❌ Poor logging

### After Restructure:
- ✅ Clean single-package structure
- ✅ Railway deploys successfully
- ✅ Clear entry point: `src/index.js`
- ✅ Environment validation on startup
- ✅ Health check endpoint for monitoring
- ✅ Proper structured logging
- ✅ Easy to maintain and deploy

---

## 7. NEXT STEPS

1. **Complete Tasks 2-10** (Requires local terminal access)
2. **Test thoroughly** before pushing to production
3. **Update documentation** with new structure
4. **Configure Railway** with proper environment variables
5. **Monitor deployment** and logs

---

## 8. NOTES & WARNINGS

⚠️ **Important:**
- Do NOT push to production until local testing passes
- Keep backup branch for emergency rollback
- Test health endpoint before Railway deployment
- Ensure all API keys are in Railway environment variables
- Monitor Railway logs closely during first deployment

📝 **Technical Debt Cleaned:**
- Removed empty `brain` and `integrations` packages
- Simplified from monorepo to single package
- Added proper environment validation
- Added health checks for Railway
- Improved logging structure

---

**Audit completed by:** Comet Assistant
**Backup branch:** ✅ Created
**Ready for restructure:** ✅ Yes
**Deployment risk:** Medium (mitigated by backup branch)
