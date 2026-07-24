# FastForecast by NXZ
Run 
https://fastnfuriousforecaster.onrender.com/

FastForecast by NXZ is a local and deployable three-stage forecasting web agent:

1. **Data Dock** — upload CSV/XLSX data, select the signal and frequency, inspect a live train/test split, and render a classical decomposition.
2. **Model Bay** — configure and run SES, Holt, Holt-Winters, ARIMA, ETS, and NNETAR engines. In multivariate mode, ARIMA and NNETAR consume selected exogenous regressors.
3. **Orbital Results** — compare RMSE and test correlation, inspect forecast trajectories, and evaluate the equal-average ARIMA/ETS/NNETAR ensemble.



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
