# VinClub360 - Production Deployment Guide

## 📋 Pre-Deployment Checklist

### Environment & Configuration
- [ ] All environment variables configured in Render Dashboard
- [ ] Verified Supabase connection from production environment
- [ ] Tested GEMINI_API_KEY is working
- [ ] Database migrations applied to production Supabase
- [ ] SSL/TLS certificates are valid

### Security
- [ ] Input validation implemented on all API endpoints
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] Authentication/Authorization verified
- [ ] No secrets committed to repository
- [ ] Supabase Row Level Security (RLS) policies configured

### Testing & Quality
- [ ] All linting issues resolved (`npm run lint`)
- [ ] Type checking passed (`npm run typecheck`)
- [ ] Unit tests created and passing
- [ ] Manual smoke testing completed
- [ ] Load testing performed

### Monitoring & Observability
- [ ] Health check endpoint configured (`/health`)
- [ ] Error logging setup (Sentry recommended)
- [ ] Performance monitoring enabled
- [ ] Log aggregation configured
- [ ] Alerting rules set up

### Database
- [ ] Production database backed up
- [ ] Migration rollback strategy tested
- [ ] Connection pooling configured (if needed)
- [ ] Query performance verified

---

## 🚀 Deployment Steps

### 1. Final Code Verification
```bash
# Run linting
npm run lint:fix

# Run type checking
npm run typecheck

# Build the project
npm run build

# Verify build output
ls -la dist/
```

### 2. Environment Setup on Render

1. Go to Render Dashboard > Your Service > Environment
2. Add the following variables:
   - `NODE_ENV` = `production`
   - `NODE_VERSION` = `20`
   - `PORT` = `3000`
   - `VITE_SUPABASE_URL` = Your Supabase URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Your anon public key
   - `SUPABASE_URL` = Your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY` = Your service role key ⚠️ SECRET
   - `GEMINI_API_KEY` = Your Gemini API key ⚠️ SECRET
   - `TELEGRAM_BOT_TOKEN` = (optional) ⚠️ SECRET
   - `TELEGRAM_CHAT_ID` = (optional)
   - `TELEGRAM_BUSINESS_USERNAME` = (optional)

3. **DO NOT check "Sync with .env.production"** - Set values directly

### 3. Database Migration

1. Verify migrations are in `supabase/migrations/`
2. Login to Supabase Dashboard
3. Run migrations:
   ```sql
   -- Connect to your production database
   -- Run all migration files in order
   ```

### 4. Deploy

**Option A: Manual Deployment**
```bash
# Push to main branch
git push origin feature/production-ready

# Create PR and merge to main
# Render will auto-deploy on merge
```

**Option B: Manual Trigger**
1. Render Dashboard > Your Service > Manual Deploy
2. Select branch and click "Deploy"

### 5. Post-Deployment Verification

```bash
# Check health endpoint
curl https://your-app.render.com/health

# Should return:
# {
#   "status": "healthy",
#   "timestamp": "2024-09-13T...",
#   "services": {
#     "supabase": { "status": "ok", "latency": ... },
#     "node": { "status": "ok", "uptime": ... }
#   }
# }

# Check liveness
curl https://your-app.render.com/health/live

# Test key endpoints
curl -X POST https://your-app.render.com/api/market-search \
  -H "Content-Type: application/json" \
  -d '{"query": "VinGroup VIC"}'
```

---

## 🔍 Monitoring & Troubleshooting

### View Logs
```bash
# Render Dashboard > Your Service > Logs
# Filter by:
# - Level: ERROR, WARN
# - Time: Last 1 hour
```

### Common Issues

**1. 502 Bad Gateway**
- Check if app is running: `curl /health/live`
- Review server logs for startup errors
- Verify all environment variables are set

**2. Supabase Connection Failed**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Render
- Check Supabase project status
- Verify network connectivity from Render to Supabase

**3. Cold Start Slow**
- Normal for Render free tier (30-60 seconds)
- Consider upgrading to paid plan for faster starts
- Self-ping is configured to keep service warm

**4. Out of Memory**
- Check memory usage: `curl /health` → check memory in response
- Review logs for memory leaks
- Render free tier: 512MB, paid plans offer more

---

## 📊 Performance Optimization

### Before Production

1. **Bundle Size**
   ```bash
   npm run build
   # Check dist/ size - should be < 2MB for JS/CSS combined
   ```

2. **Database Queries**
   - Use indexes on frequently queried columns
   - Optimize Supabase queries (use `limit()`, select specific columns)

3. **Caching**
   - Implement response caching for `/api/market-search`
   - Browser caching via HTTP headers

4. **Asset Optimization**
   - Vite automatically optimizes in production
   - Verify using DevTools Network tab

---

## 🔐 Security Hardening

### Production Checklist

1. **Secrets Rotation**
   - Plan secret rotation schedule (every 90 days)
   - Update in Render Dashboard
   - Monitor for unauthorized access

2. **Database Security**
   - Enable Supabase Row Level Security (RLS)
   - Restrict direct database access
   - Use parameterized queries only

3. **API Security**
   - Rate limiting on `/api/telegram-webhook`
   - Verify Telegram webhook signature
   - Implement request signing for sensitive operations

4. **Network Security**
   - Use HTTPS only
   - Configure CORS whitelist
   - Enable DDoS protection (Render auto-includes)

---

## 📈 Scaling & Upgrades

### When to Scale Up

- **Memory**: Monitor via `/health` endpoint
- **CPU**: Check Render dashboard metrics
- **Connections**: Monitor Supabase connection pool

### Upgrade Path

1. **Free Tier** → **Starter Plan** ($7/month)
   - 512MB RAM → 1GB RAM
   - 1 vCPU → more reliable
   - Always warm (no cold starts)

2. **Starter** → **Standard** ($15/month)
   - 2GB RAM, 2 vCPU
   - Auto-scaling capable
   - Priority support

---

## 🆘 Rollback Procedure

If deployment fails:

1. Render Dashboard > Your Service
2. Click "Manual Deploy"
3. Select previous working commit
4. Click "Deploy"

For database issues:
1. Access Supabase Dashboard
2. Use backup/restore feature
3. Re-run migrations if needed

---

## 📞 Support & Resources

- **Render Docs**: https://render.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Google Gemini API**: https://ai.google.dev/docs

---

**Last Updated**: 2026-09-13
**Maintainer**: Your Team
