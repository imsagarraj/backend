# Vicloud Deployment Guide

## Changes made in this branch

| File | Change |
|------|--------|
| `vi-backend/requirements.txt` | Added `supervisor` + `gunicorn` |
| `vi-backend/supervisord.conf` | **New** — runs web + worker + beat in one container |
| `vi-backend/railway.json` | **New** — Railway build/deploy config |
| `src/App.jsx` | `BrowserRouter` → `HashRouter` (for Hostinger static hosting) |
| `vicloud-admin/src/App.jsx` | `BrowserRouter` → `HashRouter` |
| `dist/` | Built main SPA |
| `vicloud-admin/dist/` | Built admin SPA |

---

## Step 1 — Push to GitHub

```bash
git add -A
git commit -m "deploy: add Railway config, switch to HashRouter"
git push
```

---

## Step 2 — Deploy backend to Railway

1. Go to https://railway.app and sign in with GitHub
2. **New Project** → **Deploy from GitHub repo**
3. Select your repo, set root directory to `vi-backend`
4. Railway will auto-detect Python + install deps from `requirements.txt`
5. It will fail initially — that's fine, we need to configure env vars

### Add Redis Plugin
- Click **+ New** → **Database** → **Redis**
- This gives you a `REDIS_URL` automatically

### Set Environment Variables
In the Railway dashboard for your service → **Variables** tab, add:

```
PORT = 8000
DATABASE_URL = <your Supabase direct PG URL>
REDIS_URL = <auto-provided by Railway Redis plugin>
GEMINI_API_KEY = <your Gemini API key>
META_ACCESS_TOKEN = <your Meta WhatsApp token>
META_PHONE_NUMBER_ID = <your phone number ID>
META_WABA_ID = <your WABA ID>
META_VERIFY_TOKEN = vicloud123
VITE_SUPABASE_URL = <your Supabase URL>
VITE_SUPABASE_ANON_KEY = <your Supabase anon key>
SUPABASE_SERVICE_KEY = <your Supabase service role key>
ADMIN_EMAILS = <comma-separated admin emails>
```

### Set Start Command
In **Settings** → **Deploy**, set **Start Command** to:
```
supervisord -c supervisord.conf -n
```

### Deploy
Click **Deploy**. Once it's live, note your Railway URL:
```
https://vi-backend-production-XXXX.up.railway.app
```

### Add Custom Domain (optional)
Railway dashboard → **Settings** → **Domains** → add `api.yourdomain.com`, then add a CNAME record at your DNS provider pointing to the Railway URL.

---

## Step 3 — Rebuild frontends with correct API URL

Now that you have the Railway URL, rebuild both SPAs:

### Main frontend
```bash
VITE_API_URL=https://vi-backend-production-XXXX.up.railway.app/api/v1 npm run build
```

### Admin frontend
```bash
VITE_API_URL=https://vi-backend-production-XXXX.up.railway.app/api/v1 npm run build
```

---

## Step 4 — Upload to Hostinger

1. Upload `dist/` folder → Hostinger for your main app (e.g. `app.yourdomain.com`)
2. Upload `vicloud-admin/dist/` folder → Hostinger for admin panel (e.g. `admin.yourdomain.com`)

---

## Step 5 — Configure WhatsApp Webhook

In Meta Developer Console, set the webhook callback URL to:
```
https://vi-backend-production-XXXX.up.railway.app/api/v1/webhook/whatsapp
```
Verify token: `vicloud123`

---

## Step 6 — Verify

- Visit `app.yourdomain.com` — login, dashboard, customers all work
- Visit `admin.yourdomain.com` — admin login, platform overview, pipeline
- Send a test WhatsApp message — verify it appears in the pipeline
