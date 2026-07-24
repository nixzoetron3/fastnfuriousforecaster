# FastForecast by NXZ

FastForecast by NXZ is a local and deployable three-stage forecasting web agent with a neon intergalactic interface:

1. **Data Dock** — upload CSV/XLSX data, select the signal and frequency, inspect a live train/test split, and render a classical decomposition.
2. **Model Bay** — configure and run SES, Holt, Holt-Winters, ARIMA, ETS, and NNETAR engines. In multivariate mode, ARIMA and NNETAR consume selected exogenous regressors.
3. **Orbital Results** — compare RMSE and test correlation, inspect forecast trajectories, and evaluate the equal-average ARIMA/ETS/NNETAR ensemble.

## Launch

From the AFIP workspace in PowerShell:

```powershell
.\agent_fastfuriosforecaster\run_af3_web.ps1
```

Then open `http://127.0.0.1:8793/`. The launch selector lets you start from Ducati weekly demo data, Ducati monthly demo data, or your own upload.

FastForecast runs entirely on the local machine when launched this way. The bundled Python runtime supplies NumPy and openpyxl. CSV, XLSX, and XLSM uploads are accepted; legacy XLS files should first be saved as XLSX or CSV.

The opening launch selector can start with bundled Ducati Panigale weekly/monthly demo demand data or let you upload your own temporal dataset.

## Deploy for beta testing

FastForecast is packaged for Render as a Python Web Service. The hosted app serves both the frontend and the backend forecasting API from one URL.

Use the included deployment files:

- `requirements.txt`
- `.python-version`
- `render.yaml`
- `DEPLOY_RENDER.md`

Recommended Render settings:

```text
Build Command: pip install -r requirements.txt
Start Command: python web/server.py --host 0.0.0.0 --port $PORT
Health Check Path: /healthz
```

See `DEPLOY_RENDER.md` for the full GitHub + Render checklist.

## Forecast implementation

The local backend fits optimized exponential smoothing, Holt trend, seasonal Holt-style forecasts, an autoregressive integrated model, configurable ETS-style seasonal state estimates, and a repeated random-hidden-layer neural autoregression. Metrics are calculated strictly over the held-out test partition.
