/* ============================================================
   SDG 13 Climate Action — Results Dashboard Logic (daily basis)
   ============================================================ */

// ~8 kg/day = 1800 kg/yr ÷ 230 working days
const SDG_TARGET_DAILY_KG  = 7.83;
const WORLD_AVG_DAILY_KG   = 20.4;  // 4700 kg/yr ÷ 230 days
const TREE_ABSORB_KG_DAILY = 21 / 365; // ~0.0575 kg CO₂ absorbed per tree per day

const DANGER_COLORS = {
  SAFE:     '#2E7D32',
  MODERATE: '#F57C00',
  HIGH:     '#E65100',
  CRITICAL: '#D32F2F'
};

const DANGER_BG = {
  SAFE:     'rgba(46,125,50,0.15)',
  MODERATE: 'rgba(245,124,0,0.15)',
  HIGH:     'rgba(230,81,0,0.15)',
  CRITICAL: 'rgba(211,47,47,0.15)'
};

// ---- Guard: redirect if no data ----
function loadData() {
  const raw = localStorage.getItem('climateCalcResult');
  if (!raw) { window.location.href = 'calculator.html'; return null; }
  try {
    return JSON.parse(raw);
  } catch(e) {
    window.location.href = 'calculator.html';
    return null;
  }
}

// Trees needed per year to offset the daily commute every workday (230 days)
function treesPerYear(dailyKg) {
  const annualKg = dailyKg * 230;
  return Math.ceil(annualKg / 21);
}

// ---- Recommendations ----
function buildRecommendations(data) {
  const recs = [];

  // 1. Transit shift
  if (data.mode === 'car') {
    const busSavingDaily   = (0.21 - 0.089) * data.distanceKm * 2;
    const trainSavingDaily = (0.21 - 0.041) * data.distanceKm * 2;
    recs.push({
      icon: '🚌',
      title: 'Switch to Public Transit',
      desc: `Switching from your car to the bus could save <strong>${busSavingDaily.toFixed(2)} kg CO₂/day</strong>. Taking the train saves even more — up to <strong>${trainSavingDaily.toFixed(2)} kg CO₂/day</strong>.`,
      saving: busSavingDaily.toFixed(2) + ' kg CO₂/day saved'
    });
  } else if (data.mode === 'bus') {
    const trainSavingDaily = (0.089 - 0.041) * data.distanceKm * 2;
    recs.push({
      icon: '🚆',
      title: 'Upgrade to Rail',
      desc: `Trains emit 54% less CO₂ than buses. Switching could save <strong>${trainSavingDaily.toFixed(2)} kg CO₂/day</strong>.`,
      saving: trainSavingDaily.toFixed(2) + ' kg CO₂/day saved'
    });
  } else {
    recs.push({
      icon: '🌱',
      title: 'Stay Green',
      desc: 'Your current transport mode already produces zero direct emissions. You\'re leading by example — encourage others to make the switch!',
      saving: '0 kg CO₂/day'
    });
  }

  // 2. Electrification / EV
  if (data.mode === 'car') {
    const evSavingDaily = (0.21 - 0.053) * data.distanceKm * 2;
    const pct = Math.round((evSavingDaily / data.dailyKg) * 100);
    recs.push({
      icon: '⚡',
      title: 'Electric Vehicle Switch',
      desc: `An EV on today's grid emits ~0.053 kg CO₂/km. Switching could cut your daily emissions by <strong>${evSavingDaily.toFixed(2)} kg CO₂/day</strong> — a ${pct}% reduction per trip.`,
      saving: evSavingDaily.toFixed(2) + ' kg CO₂/day saved'
    });
  } else {
    recs.push({
      icon: '☀️',
      title: 'Renewable Energy at Home',
      desc: 'Even with low-emission transport, home energy is often the largest carbon source. Switching to a green energy tariff can cut your daily household footprint by 2–8 kg CO₂/day.',
      saving: 'Up to 8 kg CO₂/day saved'
    });
  }

  // 3. Hybrid work — 2 WFH days means 40% fewer commute days
  const hybridSavingDaily = data.dailyKg * 0.4;
  recs.push({
    icon: '🏠',
    title: 'Hybrid Work (2 Days/Week)',
    desc: `Working from home 2 days a week reduces your commute frequency by ~40%, which is equivalent to saving <strong>${hybridSavingDaily.toFixed(2)} kg CO₂</strong> on every working day on average.`,
    saving: hybridSavingDaily.toFixed(2) + ' kg CO₂/day avg saved'
  });

  return recs;
}

// ---- Populate DOM ----
function populate(data) {
  const color   = DANGER_COLORS[data.dangerLabel] || '#9ca3af';
  const bgColor = DANGER_BG[data.dangerLabel]     || 'rgba(156,163,175,0.1)';
  const trees   = treesPerYear(data.dailyKg);

  // Personal header
  setText('res-name', data.name || 'Your');

  const badgeEl = document.getElementById('res-badge');
  if (badgeEl) {
    badgeEl.textContent           = data.dangerLabel;
    badgeEl.style.color           = color;
    badgeEl.style.borderColor     = color;
    badgeEl.style.backgroundColor = bgColor;
  }

  // Stats
  setText('res-daily',     data.dailyKg.toFixed(2) + ' kg');
  setText('res-trees',     trees.toLocaleString() + ' trees');

  // vs. target card
  const diff = data.dailyKg - SDG_TARGET_DAILY_KG;
  const vsEl = document.getElementById('res-vs-target');
  if (vsEl) {
    if (diff <= 0) {
      vsEl.textContent = '✓ Within target';
      vsEl.style.color = '#2E7D32';
    } else {
      vsEl.textContent = '+' + diff.toFixed(1) + ' kg over';
      vsEl.style.color = color;
    }
  }

  colorEl('res-daily', color);

  // Context line
  const ctxEl = document.getElementById('res-context');
  if (ctxEl) {
    if (diff <= 0) {
      ctxEl.textContent = `You are within the SDG 13 daily target of ~8 kg CO₂/day.`;
      ctxEl.style.color = '#2E7D32';
    } else {
      const over = Math.round((data.dailyKg / SDG_TARGET_DAILY_KG - 1) * 100);
      ctxEl.textContent = `You are ${over}% above the SDG 13 daily target of ~8 kg CO₂/day.`;
      ctxEl.style.color = color;
    }
  }

  // Timestamp
  const tsEl = document.getElementById('res-timestamp');
  if (tsEl && data.timestamp) {
    tsEl.textContent = 'Calculated: ' + new Date(data.timestamp).toLocaleString();
  }

  buildBarChart(data, color);
  buildRecCards(data);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function colorEl(id, color) {
  const el = document.getElementById(id);
  if (el) el.style.color = color;
}

function buildBarChart(data, userColor) {
  const maxKg    = Math.max(data.dailyKg, WORLD_AVG_DAILY_KG) * 1.15;
  const userPct  = Math.min((data.dailyKg          / maxKg) * 100, 100);
  const sdgPct   = Math.min((SDG_TARGET_DAILY_KG   / maxKg) * 100, 100);
  const worldPct = Math.min((WORLD_AVG_DAILY_KG    / maxKg) * 100, 100);

  const userBar  = document.getElementById('bar-user');
  const sdgBar   = document.getElementById('bar-sdg');
  const worldBar = document.getElementById('bar-world');
  const userLbl  = document.getElementById('bar-user-lbl');
  const sdgLbl   = document.getElementById('bar-sdg-lbl');
  const worldLbl = document.getElementById('bar-world-lbl');

  if (userBar)  { userBar.style.backgroundColor  = userColor; userBar.style.height  = '0%'; }
  if (sdgBar)   { sdgBar.style.height   = '0%'; }
  if (worldBar) { worldBar.style.height = '0%'; }
  if (userLbl)  userLbl.textContent  = data.dailyKg.toFixed(1) + ' kg';
  if (sdgLbl)   sdgLbl.textContent   = '7.8 kg';
  if (worldLbl) worldLbl.textContent = '20.4 kg';

  // Also update the legend dot colour
  const dot = document.getElementById('legend-user-dot');
  if (dot) dot.style.backgroundColor = userColor;

  setTimeout(() => {
    if (userBar)  userBar.style.height  = userPct  + '%';
    if (sdgBar)   sdgBar.style.height   = sdgPct   + '%';
    if (worldBar) worldBar.style.height = worldPct + '%';
  }, 80);
}

function buildRecCards(data) {
  const container = document.getElementById('rec-container');
  if (!container) return;
  const recs = buildRecommendations(data);
  container.innerHTML = recs.map(r => `
    <div class="rec-card bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div class="text-4xl mb-3">${r.icon}</div>
      <h3 class="text-lg font-bold text-gray-900 mb-2">${r.title}</h3>
      <p class="text-gray-600 text-sm leading-relaxed mb-4">${r.desc}</p>
      <span class="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-green-50 text-green-800 border border-green-200">
        ${r.saving}
      </span>
    </div>
  `).join('');
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  const data = loadData();
  if (!data) return;
  populate(data);
});
