# AuraTrack AI 🚀
### Premium AI Job Tracker & Resume Matcher for Top AI Startups

AuraTrack AI is a high-performance web application designed to track software engineering, platform, and machine learning roles across top AI labs and startups (including **Reflection AI**, **Wayve**, **Nscale**, **Synthesia**, **ElevenLabs**, **Isomorphic Labs**, and 25+ top London AI startups).

---

## ⚡ Deployment Instructions

### Option 1: GitHub Pages (100% Free)
1. **Push to GitHub**:
   Create a new repository named `AuraTrack` on GitHub and push the code:
   ```bash
   git init
   git add .
   git commit -m "Initial AuraTrack release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/AuraTrack.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to **Repository Settings** -> **Pages**.
   - Under **Build and deployment** -> **Source**, choose **Deploy from a branch**.
   - Select `main` branch and `/ (root)` folder.
   - Click **Save**. Your site will be live at `https://<your-username>.github.io/AuraTrack/`!

3. **Automated Daily Job Syncing**:
   The repository includes a GitHub Action (`.github/workflows/sync_jobs.yml`) that automatically runs `fetch_jobs.py` every night at midnight UTC to keep `jobs.js` updated.

---

### Option 2: Cloudflare Pages (100% Free + Ultra Fast Global CDN)
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Workers & Pages**.
2. Click **Create Application** -> **Pages** -> **Connect to Git**.
3. Select your `AuraTrack` repository.
4. Set build settings:
   - **Framework preset**: `None`
   - **Build command**: `python3 fetch_jobs.py`
   - **Build output directory**: `/` (Root directory)
5. Click **Save and Deploy**. Cloudflare Pages will build and deploy AuraTrack globally with free SSL and custom domain support!

---

## 🛠️ Local Development
To run AuraTrack locally:
```bash
python3 server.py
```
Open [http://localhost:8000](http://localhost:8000) in your browser.
