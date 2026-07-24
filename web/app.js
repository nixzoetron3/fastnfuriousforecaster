const $ = (id) => document.getElementById(id);
const state = { step: 1, rows: [], columns: [], numeric: [], series: [], seriesRows: [], labels: [], results: null, selectedXregs: [], particles: [], mouse: { x: 0, y: 0 }, audioContext: null };
const colors = { Actual: '#f4fbff', SES: '#6dff9d', Holt: '#ffca55', 'Holt-Winters': '#ff7c65', ARIMA: '#57e9ff', ETS: '#b56bff', NNETAR: '#ff62c6', Ensemble: '#72ffb2' };
const DEMO_FILES = {
  weekly: { path: './demo/ducatidemandweekly.csv', name: 'Ducati Panigale weekly demand', target: 'Ducati_Demand(*1000 units)', time: 'Date', frequency: '52' },
  monthly: { path: './demo/ducatidemandmonthly.csv', name: 'Ducati Panigale monthly demand', target: 'panigale_demand(*100 units)', time: 'date', frequency: '12' },
};

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('toast').classList.remove('show'), 4200);
}

function safeNumber(value) {
  const n = Number(String(value ?? '').replaceAll(',', '').trim());
  return Number.isFinite(n) ? n : null;
}

function audioContext() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  if (!state.audioContext) state.audioContext = new Audio();
  return state.audioContext;
}

function playMicroSwitchClickSound() {
  try {
    const ac = audioContext(); if (!ac) return;
    const now = ac.currentTime;
    const gain = ac.createGain(); gain.connect(ac.destination);
    gain.gain.setValueAtTime(.001, now);
    gain.gain.exponentialRampToValueAtTime(.075, now + .004);
    gain.gain.exponentialRampToValueAtTime(.001, now + .045);
    const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * .035), ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length * 12);
    }
    const snap = ac.createBufferSource(); snap.buffer = buffer;
    const filter = ac.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 2300; filter.Q.value = 8;
    snap.connect(filter); filter.connect(gain); snap.start(now);

    const ping = ac.createOscillator(); ping.type = 'square';
    ping.frequency.setValueAtTime(1650, now + .006);
    const pingGain = ac.createGain(); pingGain.connect(ac.destination);
    pingGain.gain.setValueAtTime(.001, now + .006);
    pingGain.gain.exponentialRampToValueAtTime(.025, now + .011);
    pingGain.gain.exponentialRampToValueAtTime(.001, now + .06);
    ping.connect(pingGain); ping.start(now + .006); ping.stop(now + .065);
  } catch (_) { /* Cosmetic micro-switch sound can fail silently. */ }
}

function playWinFanfareSound() {
  try {
    const ac = audioContext(); if (!ac) return;
    const now = ac.currentTime;
    const master = ac.createGain(); master.connect(ac.destination);
    master.gain.setValueAtTime(.001, now);
    master.gain.exponentialRampToValueAtTime(.18, now + .035);
    master.gain.exponentialRampToValueAtTime(.12, now + 1.0);
    master.gain.exponentialRampToValueAtTime(.001, now + 1.65);
    const notes = [
      { f: 523.25, t: 0, d: .22 },
      { f: 659.25, t: .16, d: .22 },
      { f: 783.99, t: .32, d: .28 },
      { f: 1046.5, t: .58, d: .58 },
      { f: 1318.5, t: .84, d: .42 },
    ];
    notes.forEach((note, index) => {
      const osc = ac.createOscillator(); osc.type = index < 3 ? 'triangle' : 'sawtooth';
      const gain = ac.createGain(); gain.connect(master);
      const start = now + note.t;
      gain.gain.setValueAtTime(.001, start);
      gain.gain.exponentialRampToValueAtTime(index < 3 ? .13 : .08, start + .025);
      gain.gain.exponentialRampToValueAtTime(.001, start + note.d);
      osc.frequency.setValueAtTime(note.f, start);
      osc.detune.setValueAtTime(index % 2 ? 3 : -3, start);
      osc.connect(gain); osc.start(start); osc.stop(start + note.d + .04);
    });
    const shimmer = ac.createOscillator(); shimmer.type = 'sine';
    const shimmerGain = ac.createGain(); shimmerGain.connect(master);
    shimmer.frequency.setValueAtTime(2093, now + .7);
    shimmerGain.gain.setValueAtTime(.001, now + .7);
    shimmerGain.gain.exponentialRampToValueAtTime(.035, now + .82);
    shimmerGain.gain.exponentialRampToValueAtTime(.001, now + 1.55);
    shimmer.connect(shimmerGain); shimmer.start(now + .7); shimmer.stop(now + 1.6);
  } catch (_) { /* Cosmetic fanfare sound can fail silently. */ }
}

function syncMusicVolume() {
  const audio = $('bgMusic');
  if (!audio) return;
  const slider = $('musicVolume');
  const level = Math.max(0, Math.min(100, Number(slider.value || 0)));
  const volume = level / 100;
  audio.volume = volume;
  audio.muted = volume <= 0;
  $('musicOut').textContent = String(level);
  slider.style.setProperty('--level', `${level}%`);
}

function startBackgroundMusic() {
  const audio = $('bgMusic');
  if (!audio) return;
  syncMusicVolume();
  if (audio.volume <= 0) return;
  audio.play().catch(() => {
    /* Browsers may wait for the next direct user gesture. */
  });
}

function openMissionGate() {
  const gate = $('missionGate');
  $('gateCard').classList.remove('shattering');
  gate.classList.remove('hidden');
}

function shatterMissionGate(afterShatter) {
  const gate = $('missionGate');
  const card = $('gateCard');
  const rect = card.getBoundingClientRect();
  card.classList.add('shattering');
  for (let i = 0; i < 42; i += 1) {
    const shard = document.createElement('i');
    shard.className = 'gate-shard';
    shard.style.left = `${rect.left + Math.random() * rect.width}px`;
    shard.style.top = `${rect.top + Math.random() * rect.height}px`;
    shard.style.setProperty('--tx', `${(Math.random() - .5) * innerWidth * 1.25}px`);
    shard.style.setProperty('--ty', `${(Math.random() - .5) * innerHeight * 1.25}px`);
    shard.style.setProperty('--rot', `${(Math.random() - .5) * 940}deg`);
    document.body.appendChild(shard);
    setTimeout(() => shard.remove(), 980);
  }
  setTimeout(() => {
    gate.classList.add('hidden');
    card.classList.remove('shattering');
    if (typeof afterShatter === 'function') afterShatter();
  }, 560);
}

async function loadDemoFile(kind) {
  const demo = DEMO_FILES[kind];
  if (!demo) return;
  $('fileName').textContent = `Loading ${demo.name}…`;
  try {
    const fileResponse = await fetch(demo.path, { cache: 'no-store' });
    if (!fileResponse.ok) throw new Error(`Demo file ${demo.name} could not be loaded.`);
    const blob = await fileResponse.blob();
    const response = await fetch('/api/upload', { method: 'POST', headers: { 'X-Filename': demo.path.split('/').pop() }, body: blob });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'Demo upload failed.');
    loadDataset(payload, { mode: 'multivariate' });
    setSelectValue('targetColumn', demo.target);
    $('frequency').value = demo.frequency;
    state.selectedXregs = state.numeric.filter((name) => name !== $('targetColumn').value && name !== $('timeColumn').value);
    updateSeries();
    renderXregPanel();
    toast(`${demo.name} loaded. Multivariate mode is armed with xreg candidates.`);
  } catch (error) {
    $('fileName').textContent = 'Demo load rejected';
    toast(error.message);
  }
}

async function uploadFile(file) {
  if (!file) return;
  $('fileName').textContent = `Uploading ${file.name}…`;
  try {
    const response = await fetch('/api/upload', { method: 'POST', headers: { 'X-Filename': file.name }, body: file });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'Upload failed.');
    loadDataset(payload);
  } catch (error) {
    $('fileName').textContent = 'Upload rejected';
    toast(error.message);
  }
}

function loadDataset(payload, options = {}) {
  state.rows = payload.rows || [];
  state.columns = payload.columns || [];
  state.numeric = payload.numeric_columns || [];
  state.results = null;
  state.selectedXregs = [];
  $('fileName').textContent = `${payload.name} · ${payload.row_count.toLocaleString()} rows${payload.sheet ? ` · ${payload.sheet}` : ''}`;
  const target = $('targetColumn');
  target.innerHTML = state.numeric.length ? state.numeric.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('') : '<option>No numeric columns detected</option>';
  target.disabled = !state.numeric.length;
  $('forecastMode').disabled = !state.numeric.length;
  $('forecastMode').value = options.mode === 'multivariate' ? 'multivariate' : 'univariate';
  const time = $('timeColumn');
  time.innerHTML = '<option value="">Row Index</option>' + state.columns.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  time.disabled = false;
  time.value = '';
  $('datasetMeta').textContent = `${payload.row_count.toLocaleString()} observations received · ${state.columns.length} columns · ${state.numeric.length} numeric signals`;
  $('decomposeBtn').disabled = !state.numeric.length;
  $('proceedBtn').disabled = !state.numeric.length;
  $('suggestSeasonalityBtn').disabled = !state.numeric.length;
  if (options.autoSelectXregs) state.selectedXregs = state.numeric.filter((name) => name !== target.value && name !== time.value);
  renderXregPanel();
  updateSeries();
}

function setSelectValue(id, value) {
  const select = $(id);
  if ([...select.options].some((option) => option.value === value)) select.value = value;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function isMultivariate() {
  return $('forecastMode').value === 'multivariate';
}

function validXregCandidates() {
  const target = $('targetColumn').value;
  const time = $('timeColumn').value;
  return state.columns.map((name) => ({
    name,
    enabled: state.numeric.includes(name) && name !== target && name !== time,
    reason: !state.numeric.includes(name) ? 'text' : name === target ? 'target' : name === time ? 'time' : 'numeric',
  }));
}

function selectedXregs() {
  return [...document.querySelectorAll('input[data-xreg]:checked')].map((input) => input.value);
}

function renderXregPanel() {
  const panel = $('xregPanel');
  const list = $('xregList');
  panel.classList.toggle('hidden', !isMultivariate() || !state.columns.length);
  if (!isMultivariate() || !state.columns.length) {
    state.selectedXregs = [];
    list.innerHTML = '';
    return;
  }
  const candidates = validXregCandidates();
  const allowed = new Set(candidates.filter((item) => item.enabled).map((item) => item.name));
  state.selectedXregs = state.selectedXregs.filter((name) => allowed.has(name));
  list.innerHTML = candidates.map((item) => {
    const checked = state.selectedXregs.includes(item.name) ? ' checked' : '';
    const disabled = item.enabled ? '' : ' disabled';
    const className = item.enabled ? '' : ' class="disabled"';
    return `<label${className}><input type="checkbox" data-xreg value="${escapeHtml(item.name)}"${checked}${disabled}><span>${escapeHtml(item.name)}</span><small>${escapeHtml(item.reason)}</small></label>`;
  }).join('');
  document.querySelectorAll('input[data-xreg]').forEach((input) => input.addEventListener('change', () => { state.selectedXregs = selectedXregs(); }));
}

function xregPlotCandidates() {
  const target = $('targetColumn').value;
  const time = $('timeColumn').value;
  return state.numeric.filter((name) => name !== target && name !== time);
}

function updateXregPlotOptions() {
  const select = $('xregPlotColumn');
  const previous = select.value;
  const candidates = xregPlotCandidates();
  select.innerHTML = candidates.length
    ? candidates.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')
    : '<option>No xreg candidates</option>';
  select.disabled = !candidates.length;
  if (candidates.includes(previous)) select.value = previous;
  $('xregEmpty').classList.toggle('hidden', Boolean(candidates.length && state.seriesRows.length));
  drawXregChart();
}

function drawXregChart(split = null) {
  const select = $('xregPlotColumn');
  if (!state.seriesRows.length || select.disabled || !select.value) {
    const fit = fitCanvas($('xregChart'));
    if (fit) fit.ctx.clearRect(0, 0, fit.width, fit.height);
    $('xregTitle').textContent = 'Exogenous variable partition';
    $('xregEmpty').classList.remove('hidden');
    return;
  }
  const name = select.value;
  const values = state.seriesRows.map((row) => safeNumber(row[name]));
  const usable = values.filter((value) => value !== null);
  if (!usable.length) {
    $('xregEmpty').classList.remove('hidden');
    return;
  }
  $('xregTitle').textContent = name;
  $('xregEmpty').classList.add('hidden');
  const partition = split ?? Math.max(1, Math.min(values.length - 1, Math.round(values.length * Number($('trainPct').value) / 100)));
  const chart = chartBase($('xregChart'), [values.map((value) => value ?? NaN)]);
  if (!chart) return;
  const train = values.map((value, i) => i < partition ? value ?? NaN : NaN);
  const test = values.map((value, i) => i >= partition - 1 ? value ?? NaN : NaN);
  line(chart.ctx, train, chart, colors.Ensemble, 0, values.length, 2.7);
  line(chart.ctx, test, chart, colors.ETS, partition - 1, values.length, 2.7);
  const x = chart.area.x + ((partition - .5) / Math.max(1, values.length - 1)) * chart.area.w;
  chart.ctx.strokeStyle = 'rgba(255,255,255,.28)';
  chart.ctx.setLineDash([3, 5]);
  chart.ctx.beginPath(); chart.ctx.moveTo(x, chart.area.y); chart.ctx.lineTo(x, chart.area.y + chart.area.h); chart.ctx.stroke(); chart.ctx.setLineDash([]);
  drawTimeAxis(chart, state.labels);
}

function updateSeries() {
  if (!state.rows.length || !$('targetColumn').value) return;
  const target = $('targetColumn').value;
  const time = $('timeColumn').value;
  const pairs = state.rows.map((row, i) => ({ value: safeNumber(row[target]), label: time ? row[time] : i + 1, row })).filter((item) => item.value !== null);
  state.series = pairs.map((item) => item.value);
  state.seriesRows = pairs.map((item) => item.row);
  state.labels = pairs.map((item) => String(item.label ?? ''));
  $('seriesTitle').textContent = target;
  $('seriesEmpty').classList.toggle('hidden', state.series.length > 0);
  $('suggestSeasonalityBtn').disabled = state.series.length < 12;
  updateXregPlotOptions();
  updatePartition();
  if (!$('decompositionPanel').classList.contains('hidden')) drawDecomposition();
  if (!$('seasonalityPanel').classList.contains('hidden')) suggestSeasonality();
}

function updatePartition() {
  const pct = Number($('trainPct').value);
  $('trainOut').textContent = `${pct}%`;
  const split = Math.max(1, Math.min(state.series.length - 1, Math.round(state.series.length * pct / 100)));
  $('trainCount').textContent = state.series.length ? split : '—';
  $('testCount').textContent = state.series.length ? state.series.length - split : '—';
  $('freqReadout').textContent = $('frequency').value;
  drawSeriesChart(split);
  drawXregChart(split);
}

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  return { ctx, width: rect.width, height: rect.height };
}

function bounds(seriesList) {
  const values = seriesList.flat().filter(Number.isFinite);
  let min = Math.min(...values), max = Math.max(...values);
  if (!values.length) return { min: 0, max: 1 };
  const pad = Math.max((max - min) * .12, Math.abs(max) * .03, 1);
  return { min: min - pad, max: max + pad };
}

function chartBase(canvas, seriesList, yLabel = '') {
  const fit = fitCanvas(canvas); if (!fit) return null;
  const { ctx, width, height } = fit;
  const area = { x: 55, y: 18, w: width - 72, h: height - 55 };
  const range = bounds(seriesList);
  ctx.clearRect(0, 0, width, height);
  ctx.font = '9px Space Mono, monospace'; ctx.fillStyle = '#6f899c'; ctx.strokeStyle = 'rgba(100,190,225,.12)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = area.y + area.h * i / 4; ctx.beginPath(); ctx.moveTo(area.x, y); ctx.lineTo(area.x + area.w, y); ctx.stroke();
    const value = range.max - (range.max - range.min) * i / 4; ctx.fillText(compact(value), 4, y + 3);
  }
  if (yLabel) { ctx.save(); ctx.translate(12, height / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(yLabel, 0, 0); ctx.restore(); }
  return { ctx, width, height, area, ...range };
}

function compact(value) {
  const abs = Math.abs(value);
  return abs >= 1000000 ? `${(value / 1000000).toFixed(1)}m` : abs >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(abs < 10 ? 2 : 1);
}

function line(ctx, values, chart, color, start = 0, total = values.length, width = 2.2, dash = []) {
  const { area, min, max } = chart; ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.shadowColor = color; ctx.shadowBlur = width > 2 ? 9 : 0;
  let begun = false;
  values.forEach((value, i) => {
    if (!Number.isFinite(value) || i < start) return;
    const x = area.x + (i / Math.max(1, total - 1)) * area.w;
    const y = area.y + (1 - (value - min) / Math.max(1e-9, max - min)) * area.h;
    if (!begun) { ctx.moveTo(x, y); begun = true; } else ctx.lineTo(x, y);
  });
  ctx.stroke(); ctx.shadowBlur = 0; ctx.setLineDash([]);
}

function drawSeriesChart(split) {
  if (!state.series.length) return;
  const chart = chartBase($('seriesChart'), [state.series]); if (!chart) return;
  const train = state.series.map((v, i) => i < split ? v : NaN);
  const test = state.series.map((v, i) => i >= split - 1 ? v : NaN);
  line(chart.ctx, train, chart, colors.ARIMA, 0, state.series.length, 3.2);
  line(chart.ctx, test, chart, colors['Holt-Winters'], split - 1, state.series.length, 3.2);
  const x = chart.area.x + ((split - .5) / Math.max(1, state.series.length - 1)) * chart.area.w;
  chart.ctx.strokeStyle = 'rgba(255,255,255,.28)'; chart.ctx.setLineDash([3, 5]); chart.ctx.beginPath(); chart.ctx.moveTo(x, chart.area.y); chart.ctx.lineTo(x, chart.area.y + chart.area.h); chart.ctx.stroke(); chart.ctx.setLineDash([]);
  chart.ctx.fillStyle = '#7c96a8'; chart.ctx.font = '8px Space Mono'; chart.ctx.fillText('SPLIT', x + 5, chart.area.y + 11);
}

function movingAverage(values, period) {
  const half = Math.floor(period / 2);
  return values.map((_, i) => {
    const from = Math.max(0, i - half), to = Math.min(values.length, i + half + 1);
    return values.slice(from, to).reduce((a, b) => a + b, 0) / (to - from);
  });
}

function drawMini(canvas, values, color) {
  const chart = chartBase(canvas, [values]); if (!chart) return; line(chart.ctx, values, chart, color, 0, values.length, 1.8);
}

function drawDecomposition() {
  const period = Math.max(1, Number($('frequency').value));
  const observed = state.series;
  const trend = movingAverage(observed, Math.min(period, Math.max(2, Math.floor(observed.length / 3))));
  const detrended = observed.map((v, i) => v - trend[i]);
  const seasonalPattern = Array.from({ length: period }, (_, phase) => {
    const vals = detrended.filter((_, i) => i % period === phase); return vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
  });
  const seasonal = observed.map((_, i) => seasonalPattern[i % period]);
  const remainder = observed.map((v, i) => v - trend[i] - seasonal[i]);
  drawMini($('decompObserved'), observed, colors.Actual); drawMini($('decompTrend'), trend, colors.ARIMA); drawMini($('decompSeasonal'), seasonal, colors.ETS); drawMini($('decompRemainder'), remainder, colors['Holt-Winters']);
}

function autocorrelation(values, maxLag) {
  const clean = values.filter(Number.isFinite);
  const mean = clean.reduce((sum, value) => sum + value, 0) / Math.max(1, clean.length);
  const centered = clean.map((value) => value - mean);
  const denom = centered.reduce((sum, value) => sum + value * value, 0) || 1;
  return Array.from({ length: maxLag }, (_, index) => {
    const lag = index + 1;
    let sum = 0;
    for (let i = lag; i < centered.length; i += 1) sum += centered[i] * centered[i - lag];
    return sum / denom;
  });
}

function solveLinearSystem(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-10) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const scale = a[col][col];
    for (let j = col; j <= n; j += 1) a[col][j] /= scale;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j += 1) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map((row) => row[n]);
}

function partialAutocorrelation(values, maxLag) {
  const clean = values.filter(Number.isFinite);
  const mean = clean.reduce((sum, value) => sum + value, 0) / Math.max(1, clean.length);
  const centered = clean.map((value) => value - mean);
  return Array.from({ length: maxLag }, (_, index) => {
    const lag = index + 1;
    const rows = [];
    const target = [];
    for (let t = lag; t < centered.length; t += 1) {
      rows.push(Array.from({ length: lag }, (_, j) => centered[t - j - 1]));
      target.push(centered[t]);
    }
    if (rows.length <= lag + 1) return 0;
    const xtx = Array.from({ length: lag }, () => Array(lag).fill(0));
    const xty = Array(lag).fill(0);
    rows.forEach((row, i) => {
      row.forEach((value, r) => {
        xty[r] += value * target[i];
        row.forEach((other, c) => { xtx[r][c] += value * other; });
      });
    });
    for (let i = 0; i < lag; i += 1) xtx[i][i] += 1e-6;
    const coef = solveLinearSystem(xtx, xty);
    return coef ? Math.max(-1, Math.min(1, coef[lag - 1])) : 0;
  });
}

function recommendCycles(acf, pacf, sampleSize) {
  const significance = 1.96 / Math.sqrt(Math.max(1, sampleSize));
  const scored = [];
  for (let lag = 2; lag <= acf.length; lag += 1) {
    const a = acf[lag - 1] || 0;
    const p = pacf[lag - 1] || 0;
    const prev = acf[lag - 2] || 0;
    const next = acf[lag] || 0;
    const localPeak = a > prev && a >= next ? .22 : 0;
    const harmonic = lag * 2 <= acf.length ? Math.max(0, acf[lag * 2 - 1]) * .18 : 0;
    const score = Math.max(0, a) * 1.35 + Math.abs(p) * .55 + localPeak + harmonic + (a > significance ? .2 : 0) + (Math.abs(p) > significance ? .1 : 0);
    if (score > .04) scored.push({ lag, acf: a, pacf: p, score, significant: a > significance || Math.abs(p) > significance });
  }
  scored.sort((a, b) => b.score - a.score);
  const chosen = [];
  for (const candidate of scored) {
    const tooClose = chosen.some((item) => Math.abs(item.lag - candidate.lag) <= Math.max(1, Math.round(candidate.lag * .08)));
    if (!tooClose) chosen.push(candidate);
    if (chosen.length === 3) break;
  }
  return chosen;
}

function drawCorrelationBars(canvas, values, sampleSize, color, title) {
  const fit = fitCanvas(canvas); if (!fit) return;
  const { ctx, width, height } = fit;
  const area = { x: 46, y: 20, w: width - 62, h: height - 52 };
  const confidence = 1.96 / Math.sqrt(Math.max(1, sampleSize));
  ctx.clearRect(0, 0, width, height);
  ctx.font = '8px Space Mono'; ctx.fillStyle = '#6f899c';
  ctx.fillText(title, 6, 11);
  ctx.strokeStyle = 'rgba(100,190,225,.13)';
  for (let i = 0; i <= 4; i += 1) {
    const y = area.y + area.h * i / 4;
    ctx.beginPath(); ctx.moveTo(area.x, y); ctx.lineTo(area.x + area.w, y); ctx.stroke();
  }
  const yOf = (value) => area.y + (1 - (value + 1) / 2) * area.h;
  const zero = yOf(0);
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(area.x, zero); ctx.lineTo(area.x + area.w, zero); ctx.stroke();
  ctx.strokeStyle = 'rgba(109,255,157,.42)'; ctx.setLineDash([4, 5]);
  [confidence, -confidence].forEach((band) => { const y = yOf(band); ctx.beginPath(); ctx.moveTo(area.x, y); ctx.lineTo(area.x + area.w, y); ctx.stroke(); });
  ctx.setLineDash([]);
  const barWidth = Math.max(2, area.w / Math.max(1, values.length) * .56);
  values.forEach((value, index) => {
    const x = area.x + (index + .5) / values.length * area.w;
    const y = yOf(value);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.abs(value) > confidence ? 10 : 0;
    ctx.lineWidth = barWidth;
    ctx.beginPath(); ctx.moveTo(x, zero); ctx.lineTo(x, y); ctx.stroke();
  });
  ctx.shadowBlur = 0; ctx.lineWidth = 1;
  ctx.fillStyle = '#6f899c';
  ctx.fillText('+1', 10, area.y + 4); ctx.fillText('0', 16, zero + 3); ctx.fillText('-1', 10, area.y + area.h);
  ctx.fillText('LAG →', width - 48, height - 7);
}

function setFrequencyValue(cycle) {
  const value = String(cycle);
  const select = $('frequency');
  if (![...select.options].some((option) => option.value === value)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${value} · Suggested cycle`;
    select.appendChild(option);
  }
  select.value = value;
}

function suggestSeasonality() {
  if (state.series.length < 12) { toast('Load at least 12 observations before scanning cycle length.'); return; }
  const maxLag = Math.min(80, Math.max(2, Math.floor(state.series.length / 2) - 1));
  const acf = autocorrelation(state.series, maxLag);
  const pacf = partialAutocorrelation(state.series, maxLag);
  const recommendations = recommendCycles(acf, pacf, state.series.length);
  $('seasonalityRecommendations').innerHTML = recommendations.length
    ? recommendations.map((item, index) => `<button type="button" data-cycle="${item.lag}"><b>#${index + 1} · ${item.lag}</b><span>ACF ${item.acf.toFixed(3)} · PACF ${item.pacf.toFixed(3)} · score ${item.score.toFixed(2)}</span></button>`).join('')
    : '<div class="recommendation-empty">No strong cycle peak found. Keep frequency at 1 or use domain knowledge.</div>';
  document.querySelectorAll('[data-cycle]').forEach((button) => button.addEventListener('click', () => {
    setFrequencyValue(button.dataset.cycle);
    updatePartition();
    if (!$('decompositionPanel').classList.contains('hidden')) drawDecomposition();
    toast(`Seasonality frequency set to ${button.dataset.cycle}.`);
  }));
  $('seasonalityPanel').classList.remove('hidden');
  requestAnimationFrame(() => {
    drawCorrelationBars($('acfChart'), acf, state.series.length, colors.ARIMA, 'ACF');
    drawCorrelationBars($('pacfChart'), pacf, state.series.length, colors.ETS, 'PACF');
    $('seasonalityPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function navigate(step) {
  if (step > 1 && !state.series.length) { toast('Load a numeric time series before leaving the data dock.'); return; }
  if (step > 1 && isMultivariate() && !selectedXregs().length) { toast('Tick at least one numeric xreg before leaving the data dock.'); return; }
  if (step === 3 && !state.results) { toast('Run at least one model before entering the results orbit.'); return; }
  state.step = step; document.body.dataset.step = step;
  document.querySelectorAll('.page').forEach((page, i) => page.classList.toggle('active', i + 1 === step));
  document.querySelectorAll('.step-node').forEach((node, i) => { node.classList.toggle('active', i + 1 === step); node.classList.toggle('complete', i + 1 < step); });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (step === 1) requestAnimationFrame(updatePartition);
  if (step === 3) requestAnimationFrame(drawResults);
}

function buildXregPayload() {
  if (!isMultivariate()) return null;
  const names = selectedXregs();
  if (!names.length) throw new Error('Select at least one numeric exogenous regressor for multivariate forecasting.');
  const xreg = {};
  names.forEach((name) => {
    xreg[name] = state.seriesRows.map((row) => safeNumber(row[name]));
  });
  return xreg;
}

async function runModels() {
  const models = [...document.querySelectorAll('input[name=model]:checked')].map((input) => input.value);
  if (!models.length) { toast('Select at least one forecast engine.'); return; }
  playWinFanfareSound(); $('loading').classList.remove('hidden');
  setTimeout(() => { $('loadingText').textContent = 'Synchronizing model trajectories…'; }, 450);
  try {
    const xreg = buildXregPayload();
    const payload = { series: state.series, mode: isMultivariate() ? 'multivariate' : 'univariate', xreg, train_pct: Number($('trainPct').value), frequency: Number($('frequency').value), models, params: { ets: { error: $('etsError').value, trend: $('etsTrend').value, season: $('etsSeason').value, allow_multiplicative_trend: $('etsAllowMultiplicative').checked, restrict: $('etsRestrict').checked }, nnetar: { p: Number($('nnetP').value), P: Number($('nnetSP').value), size: Number($('nnetSize').value), repeats: Number($('nnetRepeats').value), lambda: 10 ** Number($('nnetLambda').value) } } };
    const response = await fetch('/api/forecast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error || 'Forecast run failed.');
    state.results = result; navigate(3);
  } catch (error) { toast(error.message); } finally { $('loading').classList.add('hidden'); $('loadingText').textContent = 'Crossing the forecast event horizon…'; }
}

function legend(ctx, items, width, y = 16) {
  ctx.font = '8px Space Mono'; let x = 58;
  items.forEach((item) => { if (x > width - 95) return; ctx.fillStyle = item.color; ctx.fillRect(x, y, 14, 3); ctx.fillStyle = '#91aabd'; ctx.fillText(item.name, x + 19, y + 4); x += 35 + item.name.length * 6; });
}

function drawPerformance() {
  const results = state.results.results;
  const fit = fitCanvas($('performanceChart')); if (!fit) return; const { ctx, width, height } = fit;
  const xVals = results.map(r => r.rmse), yVals = results.map(r => r.correlation); const xb = bounds([xVals]), yb = { min: Math.min(-.05, ...yVals) - .05, max: Math.max(.2, ...yVals) + .08 };
  const area = { x: 58, y: 24, w: width - 82, h: height - 65 }; ctx.clearRect(0, 0, width, height); ctx.font = '8px Space Mono';
  for (let i = 0; i <= 4; i += 1) { const x = area.x + area.w * i / 4, y = area.y + area.h * i / 4; ctx.strokeStyle = 'rgba(100,190,225,.12)'; ctx.beginPath(); ctx.moveTo(x, area.y); ctx.lineTo(x, area.y + area.h); ctx.moveTo(area.x, y); ctx.lineTo(area.x + area.w, y); ctx.stroke(); ctx.fillStyle = '#698497'; ctx.fillText(compact(xb.min + (xb.max - xb.min) * i / 4), x - 8, height - 20); ctx.fillText((yb.max - (yb.max - yb.min) * i / 4).toFixed(2), 12, y + 3); }
  results.forEach((r, i) => { const x = area.x + (r.rmse - xb.min) / Math.max(1e-9, xb.max - xb.min) * area.w, y = area.y + (1 - (r.correlation - yb.min) / Math.max(1e-9, yb.max - yb.min)) * area.h; const color = colors[r.model || r.name] || colors.ARIMA; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#d8edf5'; ctx.fillText(r.name, x + 9, y - 7 - (i % 2) * 7); });
  ctx.fillStyle = '#7691a4'; ctx.fillText('LOWER RMSE  ←', area.x, height - 4); ctx.fillText('CORRELATION', 4, 11);
}

function drawForecasts() {
  const actual = state.results.actual, items = [{ name: 'Actual', color: colors.Actual, values: actual }, ...state.results.results.map(r => ({ name: r.name, color: colors[r.model || r.name], values: r.forecast }))];
  const chart = chartBase($('forecastChart'), items.map(i => i.values)); if (!chart) return; items.forEach((item, i) => line(chart.ctx, item.values, chart, item.color, 0, actual.length, i ? 1.6 : 3, i ? [] : [])); legend(chart.ctx, items, chart.width, 9); drawTimeAxis(chart, state.labels.slice(state.results.split));
}

function drawTimeAxis(chart, labels) {
  if (!labels.length) return;
  const ticks = [...new Set([0, Math.floor((labels.length - 1) / 3), Math.floor((labels.length - 1) * 2 / 3), labels.length - 1])];
  chart.ctx.font = '8px Space Mono'; chart.ctx.fillStyle = '#6f899c';
  ticks.forEach(i => { const x = chart.area.x + i / Math.max(1, labels.length - 1) * chart.area.w; const label = String(labels[i] ?? i + 1); chart.ctx.fillText(label.length > 13 ? `${label.slice(0, 12)}…` : label, Math.min(x, chart.width - 75), chart.height - 10); });
  chart.ctx.fillText('TIME →', chart.width - 52, chart.height - 1);
}

function drawEnsemble() {
  const empty = $('ensembleEmpty');
  if (!state.results.ensemble) { empty.classList.remove('hidden'); const fit = fitCanvas($('ensembleChart')); if (fit) fit.ctx.clearRect(0, 0, fit.width, fit.height); return; }
  empty.classList.add('hidden'); const actual = state.results.actual, ensemble = state.results.ensemble;
  const chart = chartBase($('ensembleChart'), [actual, ensemble]); if (!chart) return; line(chart.ctx, actual, chart, colors.Actual, 0, actual.length, 3); line(chart.ctx, ensemble, chart, colors.Ensemble, 0, actual.length, 3); legend(chart.ctx, [{ name: 'Actual', color: colors.Actual }, { name: 'Equal-average ensemble', color: colors.Ensemble }], chart.width, 9); drawTimeAxis(chart, state.labels.slice(state.results.split));
}

function drawResults() {
  if (!state.results) return;
  drawPerformance(); drawForecasts(); drawEnsemble();
  const best = [...state.results.results].sort((a, b) => a.rmse - b.rmse)[0];
  const modeText = state.results.mode === 'multivariate' ? ` · ${state.results.xreg_columns.length} xregs` : '';
  $('resultSummary').textContent = `${state.results.results.length} models${modeText} · ${state.results.actual.length} test observations · best RMSE: ${best.name}`;
  $('metricsStrip').innerHTML = state.results.results.map(r => `<div class="metric-pill"><b>${r.name}</b><span>RMSE ${compact(r.rmse)} · CORR ${r.correlation.toFixed(3)}</span></div>`).join('') + (state.results.ensemble_metrics ? `<div class="metric-pill"><b>ENSEMBLE</b><span>RMSE ${compact(state.results.ensemble_metrics.rmse)} · CORR ${state.results.ensemble_metrics.correlation.toFixed(3)}</span></div>` : '');
}

function initSpace() {
  const canvas = $('space'), ctx = canvas.getContext('2d');
  function resize() { canvas.width = innerWidth * Math.min(devicePixelRatio, 1.5); canvas.height = innerHeight * Math.min(devicePixelRatio, 1.5); ctx.setTransform(canvas.width / innerWidth, 0, 0, canvas.height / innerHeight, 0, 0); state.particles = Array.from({ length: Math.min(260, Math.floor(innerWidth / 5)) }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, z: Math.random(), r: Math.random() * 1.5 + .2, vx: (Math.random() - .5) * .09, vy: Math.random() * .12 + .02 })); }
  function glow(x, y, radius, stops) { const g = ctx.createRadialGradient(x, y, 0, x, y, radius); stops.forEach(s => g.addColorStop(s[0], s[1])); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); }
  function frame(time) {
    ctx.clearRect(0, 0, innerWidth, innerHeight); ctx.fillStyle = '#02040b'; ctx.fillRect(0, 0, innerWidth, innerHeight);
    state.particles.forEach((p, i) => { p.x += p.vx + state.mouse.x * p.z * .02; p.y += p.vy; if (p.y > innerHeight + 5) p.y = -5; if (p.x < -5) p.x = innerWidth + 5; if (p.x > innerWidth + 5) p.x = -5; ctx.globalAlpha = .25 + p.z * .7; ctx.fillStyle = i % 17 ? '#bdeaff' : '#b66dff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (.4 + p.z), 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1;
    if (state.step === 1) { for (let i = 0; i < 9; i += 1) { const x = (i * 241 + time * .012 * (i % 3 + 1)) % (innerWidth + 150) - 75, y = (i * 137) % innerHeight; ctx.fillStyle = 'rgba(78,86,106,.32)'; ctx.beginPath(); for (let k = 0; k < 8; k += 1) { const a = k / 8 * Math.PI * 2, r = 8 + (i % 4) * 4 + Math.sin(k * 7 + i) * 4; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.fill(); } }
    if (state.step === 2) { glow(innerWidth * .16, innerHeight * .37, 125, [[0,'rgba(255,243,190,.95)'],[.08,'rgba(255,130,50,.75)'],[.35,'rgba(255,76,30,.15)'],[1,'transparent']]); glow(innerWidth * .83, innerHeight * .28, 155, [[0,'rgba(235,250,255,.95)'],[.06,'rgba(90,180,255,.8)'],[.4,'rgba(40,91,255,.12)'],[1,'transparent']]); }
    if (state.step === 3) { const cx = innerWidth * .5, cy = innerHeight * .47; ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.08); const g = ctx.createRadialGradient(0,0,55,0,0,250); g.addColorStop(0,'#000'); g.addColorStop(.22,'#000'); g.addColorStop(.25,'rgba(255,240,210,.9)'); g.addColorStop(.3,'rgba(255,90,35,.65)'); g.addColorStop(.48,'rgba(149,54,255,.2)'); g.addColorStop(1,'transparent'); ctx.scale(1,.26); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,250,0,Math.PI*2); ctx.fill(); ctx.restore(); glow(cx,cy,75,[[0,'#000'],[.85,'#000'],[1,'rgba(77,156,255,.3)']]); }
    requestAnimationFrame(frame);
  }
  addEventListener('resize', resize); resize(); requestAnimationFrame(frame);
}

function clearCanvasById(id) {
  const canvas = $(id);
  if (!canvas) return;
  const fit = fitCanvas(canvas);
  if (fit) fit.ctx.clearRect(0, 0, fit.width, fit.height);
}

function resetMission() {
  state.rows = [];
  state.columns = [];
  state.numeric = [];
  state.series = [];
  state.seriesRows = [];
  state.labels = [];
  state.results = null;
  state.selectedXregs = [];
  $('fileInput').value = '';
  $('fileName').textContent = 'No telemetry attached';
  $('targetColumn').innerHTML = '<option>Awaiting dataset…</option>';
  $('targetColumn').disabled = true;
  $('forecastMode').value = 'univariate';
  $('forecastMode').disabled = true;
  $('timeColumn').innerHTML = '<option value="">Row Index</option>';
  $('timeColumn').disabled = true;
  $('frequency').value = '12';
  $('trainPct').value = '80';
  $('datasetMeta').textContent = 'Attach data to initialize the signal array.';
  $('seriesTitle').textContent = 'Train / test partition';
  $('seriesEmpty').classList.remove('hidden');
  $('decompositionPanel').classList.add('hidden');
  $('seasonalityPanel').classList.add('hidden');
  $('xregPanel').classList.add('hidden');
  $('xregList').innerHTML = '';
  $('xregPlotColumn').innerHTML = '<option>No xreg candidates</option>';
  $('xregPlotColumn').disabled = true;
  $('xregTitle').textContent = 'Exogenous variable partition';
  $('xregEmpty').classList.remove('hidden');
  $('decomposeBtn').disabled = true;
  $('suggestSeasonalityBtn').disabled = true;
  $('proceedBtn').disabled = true;
  $('resultSummary').textContent = 'Awaiting model launch';
  $('metricsStrip').innerHTML = '';
  $('trainCount').textContent = '—';
  $('testCount').textContent = '—';
  $('freqReadout').textContent = '12';
  $('seasonalityRecommendations').innerHTML = '';
  ['seriesChart', 'xregChart', 'acfChart', 'pacfChart', 'performanceChart', 'forecastChart', 'ensembleChart', 'decompObserved', 'decompTrend', 'decompSeasonal', 'decompRemainder'].forEach(clearCanvasById);
  navigate(1);
  openMissionGate();
}

document.addEventListener('pointerdown', (event) => {
  startBackgroundMusic();
  const actionable = event.target.closest('button,select,input[type=range],.upload-zone,.model-cards label,.xreg-list label,.switch,.sound-control');
  if (!actionable || actionable.closest('#runModels')) return;
  if ((actionable.tagName === 'BUTTON' || actionable.tagName === 'SELECT') && actionable.disabled) return;
  playMicroSwitchClickSound();
}, true);

document.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => navigate(Number(btn.dataset.go))));
$('fileInput').addEventListener('change', (event) => uploadFile(event.target.files[0]));
['dragenter', 'dragover'].forEach(name => $('uploadZone').addEventListener(name, e => { e.preventDefault(); $('uploadZone').classList.add('drag'); }));
['dragleave', 'drop'].forEach(name => $('uploadZone').addEventListener(name, e => { e.preventDefault(); $('uploadZone').classList.remove('drag'); }));
$('uploadZone').addEventListener('drop', e => uploadFile(e.dataTransfer.files[0]));
$('demoData').addEventListener('click', openMissionGate);
$('startAfreshBtn').addEventListener('click', resetMission);
document.querySelectorAll('[data-start]').forEach((button) => button.addEventListener('click', () => {
  const choice = button.dataset.start;
  if (choice === 'upload') {
    $('fileInput').click();
    shatterMissionGate();
  } else {
    shatterMissionGate(() => loadDemoFile(choice));
  }
}));
$('targetColumn').addEventListener('change', () => { renderXregPanel(); updateSeries(); });
$('timeColumn').addEventListener('change', () => { renderXregPanel(); updateSeries(); });
$('forecastMode').addEventListener('change', () => {
  if (isMultivariate() && !state.selectedXregs.length) state.selectedXregs = state.numeric.filter((name) => name !== $('targetColumn').value && name !== $('timeColumn').value);
  renderXregPanel();
});
$('musicVolume').addEventListener('input', () => { syncMusicVolume(); startBackgroundMusic(); });
$('trainPct').addEventListener('input', updatePartition); $('frequency').addEventListener('change', () => { updatePartition(); if (!$('decompositionPanel').classList.contains('hidden')) drawDecomposition(); });
$('xregPlotColumn').addEventListener('change', () => drawXregChart());
$('suggestSeasonalityBtn').addEventListener('click', suggestSeasonality);
$('decomposeBtn').addEventListener('click', () => { $('decompositionPanel').classList.remove('hidden'); requestAnimationFrame(drawDecomposition); $('decompositionPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
$('closeSeasonality').addEventListener('click', () => $('seasonalityPanel').classList.add('hidden'));
$('closeDecomp').addEventListener('click', () => $('decompositionPanel').classList.add('hidden')); $('proceedBtn').addEventListener('click', () => navigate(2)); $('runModels').addEventListener('click', runModels);
$('newMissionBtn').addEventListener('click', resetMission);
$('selectAll').addEventListener('click', () => { const boxes = [...document.querySelectorAll('input[name=model]')], all = boxes.every(b => b.checked); boxes.forEach(b => { b.checked = !all; }); $('selectAll').textContent = all ? 'Select all' : 'Clear all'; });
[['nnetP','pOut',v=>v],['nnetSP','POut',v=>v],['nnetSize','sizeOut',v=>v],['nnetRepeats','repeatsOut',v=>v],['nnetLambda','lambdaOut',v=>(10 ** Number(v)).toPrecision(1)]].forEach(([id,out,format]) => $(id).addEventListener('input', () => $(out).textContent = format($(id).value)));
addEventListener('pointermove', e => { state.mouse.x = e.clientX - innerWidth / 2; state.mouse.y = e.clientY - innerHeight / 2; });
addEventListener('resize', () => { clearTimeout(state.resizeTimer); state.resizeTimer = setTimeout(() => { if (state.step === 1) updatePartition(); if (state.step === 3) drawResults(); if (!$('decompositionPanel').classList.contains('hidden')) drawDecomposition(); }, 120); });
syncMusicVolume();
startBackgroundMusic();
initSpace();
