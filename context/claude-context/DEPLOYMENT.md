# Deployment Guide – Vercel & Supabase

## Pre-Deployment Checklist

- [ ] All code committed to Git
- [ ] Environment variables defined in `.env.local`
- [ ] Database migrations tested locally
- [ ] Auth flows tested (email, Google OAuth, forgot password)
- [ ] Payroll calculations verified with sample data
- [ ] TypeScript build passes (`npm run build`)
- [ ] No `console.log` or debug code in production
- [ ] Sensitive keys not in git history (check `.gitignore`)

---

## Production Database Setup (Supabase)

### 1. Create Production Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New project"
3. Choose Organization, Project name (e.g., `payroll-prod`)
4. Choose region closest to your users (PH: Singapore or similar)
5. Create strong database password
6. Wait for project initialization (2–3 minutes)

### 2. Configure Connection Pool

Vercel Edge Functions work best with connection pooling:

1. In Supabase project, go to **Settings → Database**
2. Copy the **"Connection string"** (select URI format)
3. Replace `[YOUR-PASSWORD]` with your database password
4. Add `?sslmode=require` to the end

Connection string format:
```
postgresql://postgres:[password]@[host]:[port]/postgres?sslmode=require
```

### 3. Apply Migrations

```bash
# Pull production database URL
export DATABASE_URL="postgresql://..."

# Apply all migrations
npx drizzle-kit migrate
```

Or manually run SQL from Supabase:
1. Go to **SQL Editor** in Supabase dashboard
2. Copy migration files from `./drizzle/migrations/` 
3. Paste and run each one

### 4. Verify Tables

```bash
# Check schema in local Drizzle Studio
npm run db:studio

# Or query in Supabase SQL Editor:
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public';
```

---

## Domain & SSL Setup

### 1. Buy a Domain

Options:
- Namecheap, GoDaddy, Route 53, etc.
- Vercel Domains (integrated)

### 2. Point Domain to Vercel

**If using Vercel Domains:**
1. In Vercel project, go to **Settings → Domains**
2. Add domain
3. Vercel handles DNS automatically

**If using external registrar:**
1. In Vercel project, go to **Settings → Domains**
2. Add domain
3. Copy Vercel's nameserver addresses
4. Update domain registrar's DNS records
5. Wait 24–48 hours for DNS propagation

### 3. SSL Certificate

Vercel provides automatic SSL via Let's Encrypt. No additional setup needed.

---

## Environment Variables in Vercel

### 1. Set Production Secrets

In Vercel project dashboard:
1. Go to **Settings → Environment Variables**
2. Add each variable:

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase prod connection string | Keep secret |
| `BETTER_AUTH_SECRET` | Different from local | Run `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` | Public (frontend) |
| `RESEND_API_KEY` | Production Resend key | Keep secret |
| `GOOGLE_CLIENT_ID` | Prod OAuth client ID | Can be public |
| `GOOGLE_CLIENT_SECRET` | Prod OAuth secret | Keep secret |

### 2. Mark as Secrets

Vercel automatically treats non-`NEXT_PUBLIC_` vars as secrets.

### 3. Redeploy After Changes

After updating environment variables, Vercel automatically redeploys.

---

## Deploy to Vercel

### Option A: Git Integration (Recommended)

1. Push code to GitHub:
```bash
git push origin main
```

2. In Vercel dashboard:
   - Click "New Project"
   - Import GitHub repo
   - Select project root
   - Vercel auto-detects Next.js
   - Deploy!

3. Automatic deployments:
   - Every push to `main` triggers production build
   - Preview deployments for PRs

### Option B: Vercel CLI

```bash
# Install
npm i -g vercel

# Deploy
vercel --prod

# Follow prompts to connect account, select project, confirm env vars
```

---

## Post-Deployment Configuration

### 1. Update OAuth Redirect URIs

**Google OAuth:**
1. Go to Google Cloud Console
2. Update OAuth app redirect URIs:
   - Add: `https://yourdomain.com/api/auth/callback/google`
3. Copy updated credentials to Vercel env vars

**In Vercel:**
```
GOOGLE_CLIENT_ID=new_prod_id
GOOGLE_CLIENT_SECRET=new_prod_secret
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2. Verify Resend Sender Domain

1. Go to [resend.com](https://resend.com)
2. In API Keys section, add sender domain
3. Follow Resend's DNS verification steps
4. Update email sender in `lib/auth/server.ts`:
```typescript
from: "Payroll System <noreply@yourdomain.com>"
```

### 3. Create First Admin User (Optional)

Once live, you may want to:
1. Create a user account via signup form
2. Manually update their role in Supabase:
```sql
UPDATE "user" SET role = 'admin' WHERE email = 'admin@example.com';
```

Or create admin endpoint in `server/routes/users.ts`.

### 4. Test All Flows in Production

1. **Auth:**
   - Sign up with email
   - Forgot password (verify email received)
   - Google OAuth
   - Log out and back in

2. **Payroll:**
   - As admin, create employee
   - Create payroll period
   - Process payroll (generates payslips)
   - View payslips as employee

3. **Feedback:**
   - As employee, submit feedback
   - As admin, view feedback summary

---

## Monitoring & Maintenance

### Vercel Monitoring

1. **Logs:** Vercel dashboard → Deployments → select deployment → "Logs"
2. **Errors:** Check browser console and Vercel error logs
3. **Performance:** Vercel Analytics shows performance metrics

### Database Backups

**Supabase auto-backups:**
- Daily backups, 7-day retention (free tier)
- Automatic incremental backups on changes

**Manual backup:**
```bash
# Dump database
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

### Email Monitoring

Check Resend dashboard:
1. API Usage → see all emails sent/failed
2. Bounce rates
3. Engagement metrics

### Rate Limiting

Hono has built-in protection. For additional control:
1. Vercel Edge Functions have rate limiting
2. Consider adding middleware for API rate limits:
```typescript
// server/middleware/rateLimit.ts
const requestCounts = new Map()

export const rateLimitMiddleware = createMiddleware(async (c, next) => {
  const ip = c.req.header("x-forwarded-for") || "unknown"
  const count = (requestCounts.get(ip) || 0) + 1
  
  if (count > 100) { // 100 requests per minute
    return c.json({ error: "Rate limited" }, 429)
  }
  
  requestCounts.set(ip, count)
  setTimeout(() => requestCounts.delete(ip), 60000)
  
  await next()
})
```

---

## Troubleshooting Production Issues

### Issue: "DATABASE_URL not found"
**Solution:** Check env var is set in Vercel project settings. Redeploy.

### Issue: Auth cookie not persisting
**Solution:** Verify `NEXT_PUBLIC_APP_URL` matches your domain exactly. Check secure cookie settings.

### Issue: Forgot password emails not received
**Solution:** Verify Resend API key is correct. Check domain is verified. Inspect email logs.

### Issue: Google OAuth fails with redirect URI mismatch
**Solution:** Update Google Cloud OAuth redirect URIs to match exactly. Include protocol (`https://`).

### Issue: Vercel build fails
**Solution:**
```bash
npm run type-check  # Check TypeScript errors
npm run build       # Try local build
# Check build logs in Vercel dashboard
```

### Issue: Database migrations fail in production
**Solution:**
1. Verify DATABASE_URL connection string
2. Run migrations locally first to ensure they work
3. Check for schema conflicts in Supabase SQL Editor

---

## Scaling & Performance Tips

### Database
- Use Supabase indexes on frequently-queried columns
- Monitor query performance in Supabase logs
- Consider upgrading tier if load increases

### Caching
- TanStack Query caches on client (5+ min default)
- Vercel Edge caches static assets
- Add ISR (Incremental Static Regeneration) for dashboard data:
```typescript
export const revalidate = 300 // 5 minutes
```

### Edge Functions
- Vercel uses Edge runtime for fast response times
- No cold starts (unlike serverless)
- Global distribution across CDN

### Images & Assets
- Use Next.js Image component for optimization
- Serve static files from `/public` (auto-cached by CDN)

---

## Security Checklist

- [ ] All secrets are environment variables (never in code)
- [ ] HTTPS enforced (Vercel auto-enables)
- [ ] Database password is strong (32+ chars, random)
- [ ] BETTER_AUTH_SECRET is unique per environment
- [ ] OAuth secrets not shared publicly
- [ ] Rate limiting implemented
- [ ] SQL injection protected (Drizzle parameterizes queries)
- [ ] XSS protected (Next.js sanitizes by default)
- [ ] CORS configured if API is consumed by other apps
- [ ] Backups tested and verified

---

## Disaster Recovery

### If Database is Corrupted

1. **Stop accepting writes:**
   - Pause Vercel deployment
   - Or disable write endpoints temporarily

2. **Restore from backup:**
   ```bash
   # Using Supabase backup
   psql $DATABASE_URL < backup.sql
   ```

3. **Verify integrity:**
   - Check record counts match expectations
   - Test key queries work

4. **Resume operations:**
   - Re-enable endpoints
   - Monitor closely

### If App is Hacked

1. Revoke all Better Auth sessions:
   ```sql
   DELETE FROM "session" WHERE "expiresAt" < now();
   ```

2. Force password reset for all users (optional)

3. Rotate all secrets:
   - New `BETTER_AUTH_SECRET`
   - New Google OAuth credentials
   - New Resend API key

4. Review audit logs

---

## Continuous Deployment

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm install
      - run: npm run type-check
      - run: npm run build
      
      - name: Deploy to Vercel
        uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          production: true
```

Setup:
1. Create Vercel API token (Settings → Tokens)
2. Add to GitHub Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
3. On next push, GitHub Actions auto-deploys

---

## Performance Metrics to Monitor

### Key Metrics
- **TTFB (Time to First Byte):** < 200ms ideal
- **LCP (Largest Contentful Paint):** < 2.5s
- **CLS (Cumulative Layout Shift):** < 0.1
- **API response time:** < 500ms
- **Database query time:** < 100ms

### Tools
- Vercel Analytics (built-in)
- Lighthouse (Chrome DevTools)
- New Relic or Datadog (optional paid)

---

## Rollback Procedure

If a deployment causes issues:

1. In Vercel dashboard:
   - Go to Deployments
   - Find last good deployment
   - Click "..." → "Promote to Production"

2. Previous version is live within 30 seconds

---

## Support & Escalation

### For Vercel issues
- [Vercel Docs](https://vercel.com/docs)
- [Vercel Support](https://vercel.com/support)

### For Supabase issues
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Discussions](https://github.com/supabase/supabase/discussions)

### For Resend issues
- [Resend Docs](https://resend.com/docs)
- [Resend Support](https://resend.com/support)

---

## Final Checklist Before Launch

- [ ] All environment variables set in Vercel
- [ ] Database migrations applied to production
- [ ] Google OAuth URIs updated
- [ ] Resend domain verified
- [ ] Custom domain configured and SSL enabled
- [ ] First admin user created
- [ ] All auth flows tested end-to-end
- [ ] Payroll calculation tested with sample data
- [ ] Backup & disaster recovery plan documented
- [ ] Monitoring tools configured
- [ ] Team trained on deployment process

---

Congratulations! Your payroll system is now live in production. 🎉

