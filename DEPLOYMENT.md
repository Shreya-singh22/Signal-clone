# Deploying Signal

Two pieces to deploy: the FastAPI backend (needs a persistent disk for
`signam.db` and uploaded files) and the Next.js frontend (fully static/SSR,
no disk needed). Recommended combo: **Render** for the backend, **Vercel**
for the frontend — both have free tiers and no credit card required to start.

## 0. Push the code to GitHub

If you haven't already:

```bash
gh repo create signal-messenger --public --source=. --remote=origin
git push -u origin main
```

(Or create the repo on github.com first, then `git remote add origin <url>`
and `git push -u origin main`.)

## 1. Backend → Render

A `render.yaml` blueprint is already in the repo root, so this is close to
one click:

1. Go to [render.com](https://render.com) → sign in with GitHub.
2. **New** → **Blueprint** → pick your `signal-messenger` repo.
3. Render reads `render.yaml` and proposes a `signal-backend` web service
   with a 1GB persistent disk mounted at `/var/data`. Click **Apply**.
4. First boot builds `backend/Dockerfile`, then runs
   `python -m app.seed --if-empty` (seeds demo data only if the disk is
   empty — safe on every restart/redeploy) followed by `uvicorn`.
5. Once live, note the URL Render gives you, e.g.
   `https://signal-backend-xxxx.onrender.com`. Confirm it's up:
   ```bash
   curl https://signal-backend-xxxx.onrender.com/api/health
   # {"status":"ok"}
   ```

Render supports WebSocket upgrades on every plan, so `wss://` chat and
typing indicators work without extra config. Uploaded files and the SQLite
DB persist across redeploys because they live on the mounted disk, not the
container filesystem.

If you'd rather do it by hand instead of the blueprint (or use Railway/Fly
instead of Render), the two things that matter are:
- Set `DATABASE_URL=sqlite:////<mounted-disk-path>/signam.db`
- Set `UPLOAD_DIR=/<mounted-disk-path>/uploads`

Both env vars are optional — omit them and it falls back to a path inside
the container, which works but loses data on every redeploy since it's not
on a persistent volume.

## 2. Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import
   the same GitHub repo.
2. Set **Root Directory** to `frontend` (Vercel auto-detects Next.js).
3. Add one environment variable:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL from step 1
     (e.g. `https://signal-backend-xxxx.onrender.com`)
4. Deploy. Vercel gives you a URL like `https://signal-messenger.vercel.app`.

The frontend derives the WebSocket URL from `NEXT_PUBLIC_API_URL` by
swapping `http`→`ws` ([lib/store.tsx](frontend/lib/store.tsx)), so
`https://...` automatically becomes `wss://...` — no separate WS env var
needed.

## 3. Verify end to end

Open the Vercel URL and log in as one of the seeded demo accounts (alice /
bob / carol / dave / erin, password `password123`, OTP `123456`). Send a
message, open a second browser/incognito window as another user, and
confirm real-time delivery, typing indicators, and read receipts all work
across the public URLs.

## Notes / things that intentionally aren't set up

- **CORS** is wide open (`allow_origins=["*"]`, [backend/app/main.py](backend/app/main.py)) since
  auth is a bearer token, not a cookie — fine for this demo, but a real
  production deployment would restrict it to the exact frontend origin.
- **Render's free tier spins down after inactivity**; the first request
  after idle takes ~30-50s to wake up. Paid tiers avoid this.
- There's no CI/CD pipeline — both platforms auto-deploy on every push to
  `main`, which is sufficient for an assignment submission.
