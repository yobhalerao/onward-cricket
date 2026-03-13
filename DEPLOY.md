# 🏏 Onward Cricket Digital Twin — Deployment Guide
## From files to live URL in ~20 minutes

---

## What you'll end up with

- A live URL like `https://onward-cricket.vercel.app`
- Both you and your daughter open it on any phone/browser
- Enter the family PIN → access the full dashboard
- Every entry either of you makes syncs instantly to the other device
- All data stored safely in Supabase's cloud (free tier)

---

## STEP 1 — Create your Supabase database (5 mins)

1. Go to **https://supabase.com** and click **Start your project** (free)
2. Sign up with Google or email
3. Click **New Project**
   - Name it: `onward-cricket`
   - Set a database password (save it somewhere safe)
   - Choose a region close to you (e.g. Southeast Asia)
   - Click **Create new project** — wait ~2 mins for it to spin up

4. Once ready, click **SQL Editor** in the left sidebar
5. Click **New Query**
6. Open the file `schema.sql` from this folder — copy the entire contents and paste it into the editor
7. Click **Run** (green button) — you should see "Success. No rows returned"

8. Now get your credentials:
   - Click **Project Settings** (gear icon, bottom left)
   - Click **API**
   - Copy **Project URL** — looks like `https://abcdefgh.supabase.co`
   - Copy **anon / public key** — a long string starting with `eyJ...`

---

## STEP 2 — Set up the project on your computer (5 mins)

You need Node.js installed. Check by opening Terminal and typing:
```
node --version
```
If you get an error, download Node.js from **https://nodejs.org** (LTS version).

Then in Terminal:
```bash
# Create a new Vite + React project
npm create vite@latest onward-cricket -- --template react
cd onward-cricket

# Install dependencies
npm install
npm install @supabase/supabase-js
```

Now open the project folder. Replace the contents of `src/App.jsx` with the `App.jsx` file from this folder.

---

## STEP 3 — Add your credentials (2 mins)

Open `src/App.jsx` and find these 3 lines near the top:

```js
const SUPABASE_URL  = "YOUR_SUPABASE_URL";
const SUPABASE_ANON = "YOUR_SUPABASE_ANON_KEY";
const APP_PIN       = "YOUR_4_DIGIT_PIN";
```

Replace them with your actual values, e.g.:
```js
const SUPABASE_URL  = "https://abcdefgh.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const APP_PIN       = "1947";
```

Choose any PIN your family will remember — 4 to 8 digits works well.

**Test it locally first:**
```bash
npm run dev
```
Open **http://localhost:5173** in your browser. You should see the PIN screen. Enter your PIN and the app should load. Try adding an entry — if it saves and reloads correctly, you're ready to deploy.

---

## STEP 4 — Deploy to Vercel (5 mins)

1. Go to **https://vercel.com** and sign up free (use GitHub or Google)

2. Install the Vercel CLI:
```bash
npm install -g vercel
```

3. In your project folder, run:
```bash
vercel
```

4. Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - Project name: `onward-cricket` (or anything you like)
   - Directory: `.` (just press Enter)
   - Override settings? **N**

5. Vercel will build and deploy. At the end you'll see something like:
   ```
   ✅ Production: https://onward-cricket-abc123.vercel.app
   ```

6. That's your live URL. Share it with your daughter. Bookmark it on both phones.

---

## STEP 5 — Add to home screen (optional but recommended)

On iPhone:
- Open the URL in Safari
- Tap the Share button → **Add to Home Screen**
- Name it "Onward" → Add

On Android:
- Open in Chrome
- Tap the 3-dot menu → **Add to Home screen**

It'll look and feel like an app icon.

---

## Updating the app in future

When you get a new version of `App.jsx`, just replace `src/App.jsx` and run:
```bash
vercel --prod
```
The live URL stays the same. Data in Supabase is never touched by redeployments.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| PIN screen appears but login fails | Double-check APP_PIN value in App.jsx matches what you're typing |
| Data doesn't save | Check SUPABASE_URL and SUPABASE_ANON_KEY are correct — no trailing spaces |
| "relation does not exist" error | Re-run the schema.sql in Supabase SQL Editor |
| Vercel build fails | Run `npm run build` locally first to see the error |
| App works locally but not live | Make sure you used `vercel --prod` not just `vercel` |

---

## Your files summary

| File | What it does |
|---|---|
| `App.jsx` | The full React application — paste into `src/App.jsx` |
| `schema.sql` | Creates your Supabase tables — run once in SQL Editor |
| `DEPLOY.md` | This guide |

---

*Built for Onward · Cricket Digital Twin v4 · Supabase + Vercel*
