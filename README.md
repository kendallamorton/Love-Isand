# 🌴 Love Island USA 2026 — Betting Site

A beautiful, mobile-friendly betting-pool tracker for Love Island USA. Participants can see the rules, view islander standings, and check who's backing whom. You (the admin) can manage everything from a password-protected admin panel.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🏝️ Public site | Rules, schedule, participants table, islander grid, live countdown |
| 💸 Join form | People can submit their pick request; you approve + add them |
| 🔒 Admin panel | Password-protected; add/eliminate islanders, manage picks, lock Casa Amor |
| 🔄 Auto-refresh | Site re-fetches `data.json` every 2 minutes so all viewers see updates |
| 📥 Export/Import | Download `data.json` after edits and commit to publish changes |
| 📱 Mobile-first | Works great on phones |

---

## 🚀 Deploying the Site

### Option A — GitHub Pages (Recommended, Free)

1. Push this repo to GitHub (any repo name)
2. Go to **Settings → Pages**
3. Source: **Deploy from a branch** → branch `main` → folder `/` (root)
4. Save → your site is live at `https://<your-username>.github.io/<repo-name>/`

Whenever you commit an updated `data.json`, the site auto-deploys in ~30 seconds and everyone sees the new data on their next page load (or the 2-minute auto-refresh).

### Option B — Netlify (Also Free)

1. Connect your GitHub repo to [Netlify](https://netlify.com)
2. Build command: *(leave blank — this is a static site)*
3. Publish directory: `/` (root)
4. Deploy!

---

## ⚙️ Using the Admin Panel

1. Go to `/admin.html` on your site
2. Password: **`loveisland2026`** ← change this in `js/admin.js` (line 7)
3. From there you can:
   - **Add islanders** as they're revealed in episode 1
   - **Eliminate islanders** as they're sent home
   - **Add participants** with their picks
   - **Approve pending bets** submitted via the public Join form
   - **Lock picks** when islanders return from Casa Amor
   - **Export `data.json`** after any changes → commit this file to publish updates

### Workflow for updating the site

```
1. Open admin.html
2. Make changes (eliminate an islander, add a participant, etc.)
3. Click "Export JSON" → saves data.json to your Downloads
4. Replace the data.json in this repo with the downloaded one
5. Commit and push → GitHub Pages auto-deploys → everyone sees it!
```

---

## 📁 File Structure

```
/
├── index.html          # Public site
├── admin.html          # Admin panel
├── data.json           # Game state — the source of truth
├── css/
│   ├── style.css       # Public site styles
│   └── admin.css       # Admin panel styles
├── js/
│   ├── app.js          # Public site logic
│   └── admin.js        # Admin panel logic
└── README.md
```

---

## 🔑 Changing the Admin Password

Open `js/admin.js` and change line 7:

```js
const ADMIN_PASSWORD = 'loveisland2026';
```

Replace `'loveisland2026'` with your chosen password.

---

## 📋 Rules Summary (from the game)

- **$20** to play — Venmo @kendall_morton
- Pick your islander **before Wednesday June 3, 8 pm CT**
- The participant whose islander **makes it the furthest** wins the pot
- If multiple people pick the winner, **the pot is split**
- **Buy back** for **$15** if your pick is sent home before Casa Amor
- **Switch pick** for **$25** during the 24-hr Casa Amor window
- Picks **lock** once islanders return from Casa Amor

---

## 🌺 Season Schedule

Episodes at **8 pm CT on Peacock**:
- ✅ Sunday, Monday, Tuesday, Thursday, Friday
- ❌ Wednesday, Saturday (no episode)
