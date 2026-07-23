# AF3 Render beta deployment guide

This guide publishes AgentFastFuriosForecaster (AF3) as a single Render Python Web Service. The same public URL serves the neon frontend and the forecasting API routes.

## What gets deployed

- Frontend: `web/index.html`, `web/styles.css`, `web/app.js`
- Backend: `web/server.py`
- API routes: `/api/health`, `/api/upload`, `/api/forecast`
- Health route: `/healthz`

## Recommended repository layout

For the cleanest beta deployment, create a GitHub repository that contains the contents of this `agent_fastfuriosforecaster` folder as the repository root.

Your GitHub repo root should look like this:

```text
.python-version
.gitignore
DEPLOY_RENDER.md
README.md
render.yaml
requirements.txt
run_af3_web.ps1
web/
```

## Render settings

If you deploy manually from the Render dashboard, use these settings:

```text
Service type: Web Service
Runtime / Language: Python 3
Build Command: pip install -r requirements.txt
Start Command: python web/server.py --host 0.0.0.0 --port $PORT
Instance type: Free
Health Check Path: /healthz
```

Optional environment variable:

```text
PYTHON_VERSION=3.12.11
```

## Notes for beta testers

- Free Render web services can sleep after inactivity. The first page load after sleep may take about a minute.
- Uploaded files are processed in memory and are not intended for long-term storage.
- Keep test files reasonably small; AF3 currently enforces a 25 MB upload limit.
- Share the final `https://...onrender.com/` URL with testers.
