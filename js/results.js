/* ============================================================
   SDG 13 Climate Action — Results Dashboard Logic
   ============================================================ */

const SDG_TARGET_YEARLY_T = 1.8;   // tonnes/yr
const SDG_TARGET_DAILY_KG = 7.83;  // ~8 kg/day = 1800 kg/yr ÷ 230 days

// ---- Load data: URL params first (cross-file compatible), then localStorage ----
function loadData() {
  // URL params are set by the calculator redirect — works on all browsers with file://
  const params = new URLSearchParams(window.location.search);
  if (params.get('dailyKg')) {
    const data = {
      mode:        params.get('mode'),
      distanceKm:  parseFloat(params.get('distanceKm')),
      dailyKg:     parseFloat(params.get('dailyKg')),
      dangerLabel: params.get('dangerLabel'),
      name:        params.get('name') || '',
      timestamp:   params.get('timestamp')
    };
    // Mirror to localStorage so the calculator can pre-fill on Recalculate
    try { localStorage.setItem('climateCalcResult', JSON.stringify(data)); } catch(e) {}
    return data;
  }

  // Fallback: same-origin navigation (served via HTTP)
  try {
    const raw = localStorage.getItem('climateCalcResult');
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return null;
}

function showNoData() {
  const noData  = document.getElementById('no-data-state');
  const content = document.getElementById('results-content');
  const body    = document.getElementById('results-body');
  if (noData)  noData.classList.remove('hidden');
  if (content) content.classList.add('hidden');
  if (body)    body.classList.add('hidden');
}

// Trees needed per year (avg tree absorbs ~21 kg CO₂/yr)
function treesPerYear(dailyKg) {
  return Math.ceil((dailyKg * 230) / 21);
}

// Urgency indicator position on gradient bar (%)
function indicatorPosition(level) {
  const positions = { SAFE: 10, MODERATE: 38, HIGH: 65, CRITICAL: 88 };
  return positions[level] || 10;
}

// Mode display label
function modeLabel(mode) {
  const labels = { car: 'internal combustion engine', bus: 'bus', train: 'train', bicycle: 'bicycle', walking: 'walking' };
  return labels[mode] || mode;
}

// ---- Recommendations ----
const REC_ICONS = {
  transit: `<svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2h-2m-4 0v4m0 0H8m4 0h4M3 10h18"/>
  </svg>`,
  ev: `<svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M13 10V3L4 14h7v7l9-11h-7z"/>
  </svg>`,
  hybrid: `<svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
  </svg>`,
  green: `<svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
  </svg>`,
};

function buildRecommendations(data) {
  const recs = [];

  if (data.mode === 'car') {
    const busSavingKg  = (0.21 - 0.089) * data.distanceKm * 2;
    const busSavingT   = ((busSavingKg * 230) / 1000).toFixed(1);
    const busPct       = Math.round((busSavingKg / data.dailyKg) * 100);
    recs.push({
      icon: REC_ICONS.transit,
      title: 'Transit Shift',
      desc: `Take the bus ${Math.ceil(230 * 0.4)} days a week to save ${busSavingT} tons of CO2. This single change brings you ${busPct}% closer to your climate targets.`,
    });
  } else if (data.mode === 'bus') {
    const trainSavingKg = (0.089 - 0.041) * data.distanceKm * 2;
    const trainSavingT  = ((trainSavingKg * 230) / 1000).toFixed(1);
    recs.push({
      icon: REC_ICONS.transit,
      title: 'Upgrade to Rail',
      desc: `Trains emit 54% less CO₂ than buses. Switching could save ${trainSavingT}t of CO₂ per year and bring you significantly closer to SDG 13 targets.`,
    });
  } else {
    recs.push({
      icon: REC_ICONS.green,
      title: 'Stay Green',
      desc: 'Your current transport mode already produces zero direct emissions. You\'re leading by example — encourage others to make the switch.',
    });
  }

  if (data.mode === 'car') {
    const evSavingKg = (0.21 - 0.053) * data.distanceKm * 2;
    const evPct      = Math.round((evSavingKg / data.dailyKg) * 100);
    recs.push({
      icon: REC_ICONS.ev,
      title: 'Electrification',
      desc: `Switching to a used EV for your commute would reduce transportation emissions by ${evPct}% immediately.`,
    });
  } else {
    recs.push({
      icon: REC_ICONS.ev,
      title: 'Renewable Energy',
      desc: 'Even with low-emission transport, home energy is often the largest carbon source. Switching to a green energy tariff can cut your household footprint by 2–8 kg CO₂/day.',
    });
  }

  const hybridSavingT = ((data.dailyKg * 0.2 * 230) / 1000).toFixed(2);
  recs.push({
    icon: REC_ICONS.hybrid,
    title: 'Hybrid Work',
    desc: `Working from home just one day a week eliminates ${hybridSavingT} tons of annual emissions.`,
  });

  return recs;
}

// ---- Helper ----
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ---- Build horizontal bar chart ----
function buildHBarChart(data) {
  const level       = data.dangerLabel || 'SAFE';
  const yearlyT     = data.dailyKg * 230 / 1000;
  const maxT        = Math.max(yearlyT * 1.2, SDG_TARGET_YEARLY_T * 2);
  const userPct     = Math.min((yearlyT / maxT) * 100, 100);
  const sdgPct      = Math.min((SDG_TARGET_YEARLY_T / maxT) * 100, 100);

  const userBar = document.getElementById('bar-user-h');
  const sdgBar  = document.getElementById('bar-sdg-h');

  if (userBar) {
    userBar.setAttribute('data-level', level);
    userBar.style.setProperty('--bar-w', '0%');
  }
  if (sdgBar) sdgBar.style.setProperty('--bar-w', '0%');

  setTimeout(() => {
    if (userBar) userBar.style.setProperty('--bar-w', userPct + '%');
    if (sdgBar)  sdgBar.style.setProperty('--bar-w',  sdgPct  + '%');
  }, 80);

  // Yearly label
  setText('res-yearly-lbl', yearlyT.toFixed(1) + 't');

  // Reduction note
  const noteEl = document.getElementById('res-reduction-note');
  if (noteEl) {
    if (yearlyT <= SDG_TARGET_YEARLY_T) {
      noteEl.textContent = 'You are within the SDG 13 Target 13.2 — your commute emissions are sustainable.';
    } else {
      const pct = Math.round((1 - SDG_TARGET_YEARLY_T / yearlyT) * 100);
      noteEl.textContent = `Achieving SDG Target 13.2 requires a reduction of ${pct}% in your current transportation emissions.`;
    }
  }
}

// ---- Build recommendation cards ----
function buildRecCards(data) {
  const container = document.getElementById('rec-container');
  if (!container) return;
  const recs = buildRecommendations(data);
  container.innerHTML = recs.map(r => `
    <div class="rec-card bg-slate-100 rounded-2xl p-8">
      <div class="mb-5">${r.icon}</div>
      <h3 class="text-xl font-bold text-gray-900 mb-3">${r.title}</h3>
      <p class="text-sm text-gray-600 leading-relaxed">${r.desc}</p>
    </div>
  `).join('');
}

// ---- Populate DOM ----
function populate(data) {
  const level  = data.dangerLabel || 'SAFE';
  const trees  = treesPerYear(data.dailyKg);
  const yearlyT = (data.dailyKg * 230 / 1000).toFixed(1);

  // Badge (urgency level text)
  const badgeEl = document.getElementById('res-badge');
  if (badgeEl) {
    const labels = { SAFE: 'Safe', MODERATE: 'Moderate', HIGH: 'High', CRITICAL: 'Critical' };
    badgeEl.textContent = labels[level] || level;
    badgeEl.setAttribute('data-level', level);
  }

  // Context line (hero subtitle)
  const ctxEl = document.getElementById('res-context');
  if (ctxEl) {
    const dist   = data.distanceKm || 0;
    const mode   = modeLabel(data.mode);
    const diff   = data.dailyKg - SDG_TARGET_DAILY_KG;
    const suffix = diff > 0
      ? 'your footprint significantly exceeds sustainable SDG thresholds.'
      : 'your footprint is within sustainable SDG thresholds.';
    ctxEl.textContent = `Based on your daily ${dist}-km round trip via ${mode}, ${suffix}`;
  }

  // Emission summary (urgency card italic)
  const sumEl = document.getElementById('res-emission-summary');
  if (sumEl) {
    sumEl.textContent = `You are emitting ${yearlyT} tons of CO2 annually from commuting alone.`;
  }

  // Urgency indicator position
  const indicatorEl = document.getElementById('urgency-indicator');
  if (indicatorEl) {
    indicatorEl.style.setProperty('--indicator-pos', indicatorPosition(level) + '%');
  }

  // Metric card
  const acres = Math.ceil(trees / 20);
  setText('res-trees-headline', `Equivalent to ${trees.toLocaleString()} mature trees burning.`);
  setText('res-metric-desc',
    `The carbon released by your daily commute would require ${acres} acres of forest one full year to sequester.`);

  buildHBarChart(data);
  buildRecCards(data);
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  const data = loadData();
  if (!data) { showNoData(); return; }
  populate(data);
});
