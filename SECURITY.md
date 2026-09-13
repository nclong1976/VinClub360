# Security Policy - VinClub360

## 🔒 Security Principles

1. **Never commit secrets** - Use environment variables only
2. **Validate all input** - Prevent injection attacks
3. **Principle of least privilege** - Only grant necessary permissions
4. **Defense in depth** - Multiple layers of security
5. **Security by default** - Secure configurations out of the box

---

## 🛡️ Implementation

### Environment Variables

**Safe:**
- `VITE_SUPABASE_URL` (public, safe to expose)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key, limited scope)
- `PORT`, `NODE_ENV` (non-sensitive)

**Never expose to frontend:**
- `SUPABASE_SERVICE_ROLE_KEY` (full database access)
- `GEMINI_API_KEY` (billing tied to this)
- `TELEGRAM_BOT_TOKEN` (can be exploited)

**Deployment:**
- Set secrets in Render Dashboard, not `.env` files
- Rotate secrets every 90 days
- Audit access logs regularly

### Input Validation

**All API endpoints must:**
```typescript
// Validate request body
const errors = validateRequestBody(req.body, ['query', 'amount']);
if (errors.length > 0) {
  throw new ValidationException(errors);
}

// Sanitize strings
const sanitized = sanitizeString(req.body.query, 500);

// Validate email/URL
if (!validateEmail(user.email)) {
  throw new ApiError(400, 'Invalid email');
}
```

### Authentication & Authorization

**Supabase Security:**
- Use RLS (Row Level Security) policies
- Restrict to `auth.uid()` when possible
- Never trust client input for user identity

**Example RLS Policy:**
```sql
-- Only users can see their own data
CREATE POLICY "Users can only view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);
```

### CORS Configuration

**Current:**
```typescript
cors: {
  origin: "*",  // ⚠️ TOO PERMISSIVE FOR PRODUCTION
  methods: ["GET", "POST"]
}
```

**Production Fix:**
```typescript
cors: {
  origin: [
    'https://your-domain.com',
    'https://www.your-domain.com',
  ],
  methods: ["GET", "POST"],
  credentials: true,
  maxAge: 86400,
}
```

### Rate Limiting

**Install:**
```bash
npm install express-rate-limit
```

**Usage:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to sensitive endpoints
app.post('/api/market-search', limiter, (req, res) => { ... });
app.post('/api/telegram-webhook', limiter, (req, res) => { ... });
```

### Telegram Webhook Security

**Verify webhook signature:**
```typescript
import crypto from 'crypto';

function verifyTelegramWebhook(body: Buffer, signature: string): boolean {
  const hash = crypto
    .createHmac('sha256', process.env.TELEGRAM_BOT_TOKEN || '')
    .update(body)
    .digest('hex');
  return hash === signature;
}

app.post('/api/telegram-webhook', (req, res) => {
  const signature = req.headers['x-telegram-bot-api-secret-token'];
  if (!verifyTelegramWebhook(req.rawBody, signature as string)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Process webhook...
});
```

---

## 🔍 Audit & Monitoring

### What to Monitor

1. **Failed Login Attempts** - Watch for brute force
2. **API Errors** - Filter for 4xx errors
3. **Database Slow Queries** - Check Supabase metrics
4. **Memory Usage** - Via `/health` endpoint
5. **Unauthorized Access** - Review request logs

### Logging

**Always log:**
```typescript
console.error('[AUTH_FAILED]', email, 'Reason:', reason);
console.warn('[VALIDATION_ERROR]', errors);
console.info('[API_CALL]', method, path, statusCode);
```

**Never log:**
```typescript
// DON'T: passwords, tokens, API keys
console.log(password); // ❌
console.log(apiKey);   // ❌
console.log(token);    // ❌
```

---

## 🚨 Incident Response

### If Credentials are Compromised

1. **Immediate:**
   - Rotate compromised secrets in Render Dashboard
   - Review access logs for unauthorized activity
   - Kill existing sessions if possible

2. **Within 1 hour:**
   - Notify users if their data was accessed
   - Update firewall rules if needed
   - Force password reset for affected users

3. **Within 24 hours:**
   - Post-incident analysis
   - Update security measures
   - Document lessons learned

### If Data Breach Occurs

1. **Immediately:**
   - Isolate affected systems
   - Begin forensic analysis
   - Notify relevant stakeholders

2. **Communication:**
   - Be transparent with users
   - Provide clear guidance on what was exposed
   - Offer support (credit monitoring, etc.)

---

## 📚 Additional Resources

- **OWASP Top 10**: https://owasp.org/Top10/
- **Express Security**: https://expressjs.com/en/advanced/best-practice-security.html
- **Supabase Security**: https://supabase.com/docs/guides/database/securing-your-database
- **Node.js Security**: https://nodejs.org/en/docs/guides/security/

---

## ✅ Security Checklist

- [ ] All secrets in environment variables, not committed
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] CORS restricted to known domains
- [ ] Security headers enabled
- [ ] Supabase RLS policies configured
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't capture secrets
- [ ] Health check endpoint protected from abuse
- [ ] Telegram webhook signature verified
- [ ] Regular security audits scheduled
- [ ] Incident response plan documented

---

**Last Updated**: 2026-09-13
