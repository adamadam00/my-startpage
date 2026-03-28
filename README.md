# My Start Page

A personal browser start page with workspaces, bookmarks, weather, clock, search, and sticky notes. Works on any device.

---

## Deploy Guide (no terminal needed)

### Step 1 — Supabase (database + auth)

1. Go to [supabase.com](https://supabase.com) → **Start your project** → create a free account
2. Click **New project**, give it a name, set a database password, choose a region
3. Once ready, go to **SQL Editor** → **New query**
4. Open the file `supabase-schema.sql` from this project, paste the entire contents, click **Run**
5. Go to **Settings → API**
   - Copy **Project URL** → this is your `VITE_SUPABASE_URL`
   - Copy **anon public** key → this is your `VITE_SUPABASE_ANON_KEY`
6. Go to **Authentication → Providers → Email** — make sure it's enabled (it is by default)

---

### Step 2 — GitHub (host your code)

1. Go to [github.com](https://github.com) → create a free account if needed
2. Click **+** → **New repository**, name it `my-startpage`, make it private, click **Create**
3. On the repo page, click **uploading an existing file**
4. Drag and drop ALL the project files into the uploader (everything in this folder)
5. Click **Commit changes**

---

### Step 3 — Vercel (deploy)

1. Go to [vercel.com](https://vercel.com) → sign up with your GitHub account
2. Click **Add New Project** → import your `my-startpage` repo
3. Before deploying, click **Environment Variables** and add:
   - `VITE_SUPABASE_URL` → paste your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` → paste your Supabase anon key
4. Click **Deploy** — done! Vercel gives you a free URL like `my-startpage.vercel.app`

---

### Step 4 — Set as homepage

**Firefox:**
Settings → Home → Homepage and new windows → Custom URLs → paste your Vercel URL

**Chrome:**
Settings → On startup → Open a specific page → paste your Vercel URL

**Mobile (add to home screen):**
Visit your Vercel URL on mobile → browser menu → "Add to Home Screen"

---

## Customising weather location

The weather defaults to Melbourne, Australia. To change it, edit `src/components/Weather.jsx`:

```jsx
<Weather lat={-33.8688} lon={151.2093} locationName="Sydney" />
```

Find lat/lon for your city at [latlong.net](https://www.latlong.net)

Then commit the change to GitHub — Vercel will auto-redeploy.

---

## Tech stack

- React + Vite
- Supabase (auth + Postgres database)
- Vercel (hosting)
- Open-Meteo API (weather, free, no key needed)
- All 100% free for personal use
