/* ============================================================
   SDG 13 Climate Action — Results Dashboard Logic
   ============================================================ */

const SDG_TARGET_KG   = 1800;
const WORLD_AVG_KG    = 4700;
const TREE_ABSORB_KG  = 21; // avg kg CO₂ absorbed per tree per year

const DANGER_COLORS = {
  SAFE:     '#22c55e',
  MODERATE: '#facc15',
  HIGH:     '#f97316',
  CRITICAL: '#dc2626'
};

const DANGER_BG = {
  SAFE:     'rgba(34,197,94,0.15)',
  MODERATE: 'rgba(250,204,21,0.15)',
  HIGH:     'rgba(249,115,22,0.15)',
  CRITICAL: 'rgba(220,38,38,0.15)'
};

// ---- Guard: redirect if no data ----
function loadData() {
  const raw = localStorage.getItem('climateCalcResult');
  if (!raw) {
    window.location.href = 'calculator.html';
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch(e) {
    window.location.href = 'calculator.html';
    return null;
  }
}

// ---- Tree equivalent ----
function treesEquivalent(yearlyKg) {
  return Math.ceil(yearlyKg / TREE_ABSORB_KG);
}

// ---- Recommendations ----
function buildRecommendations(data) {
  const recs = [];

  // 1. Transit shift
  if (data.mode === 'car') {
    const busSaving   = (0.21 - 0.089) * data.distanceKm * 2 * data.workingDays;
    const trainSaving = (0.21 - 0.041) * data.distanceKm * 2 * data.workingDays;
    recs.push({
      icon: '🚌',
      title: 'Switch to Public Transit',
      desc: `Switching from your car to the bus could save <strong>${(busSaving/1000).toFixed(2)} tonnes CO₂/yr</strong>. Taking the train saves even more — up to <strong>${(trainSaving/1000).toFixed(2)} tonnes CO₂/yr</strong>.`,
      saving: (busSaving/1000).toFixed(2) + ' t CO₂ saved'
    });
  } else if (data.mode === 'bus') {
    const trainSaving = (0.089 - 0.041) * data.distanceKm * 2 * data.workingDays;
    recs.push({
      icon: '🚆',
      title: 'Upgrade to Rail',
      desc: `Trains emit 54% less CO₂ than buses. Switching could save <strong>${(trainSaving/1000).toFixed(2)} tonnes CO₂/yr</strong>.`,
      saving: (trainSaving/1000).toFixed(2) + ' t CO₂ saved'
    });
  } else {
    recs.push({
      icon: '🌱',
      title: 'Stay Green',
      desc: 'Your current transport mode already produces zero direct emissions. You\'re leading by example — encourage others to make the switch!',
      saving: 'Already 0 kg CO₂'
    });
  }

  // 2. Electrification / EV
  if (data.mode === 'car') {
    const evSaving = (0.21 - 0.053) * data.distanceKm * 2 * data.workingDays;
    recs.push({
      icon: '⚡',
      title: 'Electric Vehicle Switch',
      desc: `An EV on today's grid emits ~0.053 kg CO₂/km. Switching could cut your emissions by <strong>${(evSaving/1000).toFixed(2)} tonnes/yr</strong> — a ${Math.round((evSaving/data.yearlyKg)*100)}% reduction.`,
      saving: (evSaving/1000).toFixed(2) + ' t CO₂ saved'
    });
  } else {
    recs.push({
      icon: '☀️',
      title: 'Renewable Energy at Home',
      desc: 'Even with low-emission transport, home energy use is often the largest carbon source. Installing rooftop solar or switching to a green energy tariff can cut household emissions by 1–3 tonnes/yr.',
      saving: 'Up to 3 t CO₂ saved'
    });
  }

  // 3. Hybrid work
  const hybridSaving = data.yearlyKg * 0.4; // 2 days WFH = ~40% reduction
  recs.push({
    icon: '🏠',
    title: 'Hybrid Work (2 Days/Week)',
    desc: `Working from home just 2 days per week reduces commute days by ~40%, saving approximately <strong>${(hybridSaving/1000).toFixed(2)} tonnes CO₂/yr</strong> without changing your transport mode.`,
    saving: (hybridSaving/1000).toFixed(2) + ' t CO₂ saved'
  });

  return recs;
}

// ---- Populate DOM ----
function populate(data) {
  const color  = DANGER_COLORS[data.dangerLabel] || '#9ca3af';
  const bgColor = DANGER_BG[data.dangerLabel]    || 'rgba(156,163,175,0.1)';
  const trees  = treesEquivalent(data.yearlyKg);

  // Personal header
  const nameEl = document.getElementById('res-name');
  if (nameEl) nameEl.textContent = data.name || 'Your';

  const badgeEl = document.getElementById('res-badge');
  if (badgeEl) {
    badgeEl.textContent        = data.dangerLabel;
    badgeEl.style.color        = color;
    badgeEl.style.borderColor  = color;
    badgeEl.style.backgroundColor = bgColor;
  }

  // Stats
  setText('res-daily',   data.dailyKg.toFixed(2) + ' kg');
  setText('res-yearly',  data.yearlyTonnes.toFixed(3) + ' tonnes');
  setText('res-trees',   trees.toLocaleString() + ' trees');

  // Stat card colors
  colorEl('res-daily',  color);
  colorEl('res-yearly', color);

  // Comparison context line
  const ctxEl = document.getElementById('res-context');
  if (ctxEl) {
    if (data.yearlyKg <= SDG_TARGET_KG) {
      ctxEl.textContent = `You are within the SDG 13 target of 1.8 t/yr. `;
      ctxEl.style.color = '#22c55e';
    } else {
      const over = ((data.yearlyKg / SDG_TARGET_KG) - 1) * 100;
      ctxEl.textContent = `You are ${over.toFixed(0)}% above the SDG 13 target of 1.8 t/yr.`;
      ctxEl.style.color = color;
    }
  }

  // Timestamp
  const tsEl = document.getElementById('res-timestamp');
  if (tsEl && data.timestamp) {
    tsEl.textContent = 'Calculated: ' + new Date(data.timestamp).toLocaleString();
  }

  // ---- Bar chart ----
  buildBarChart(data, color);

  // ---- Recommendations ----
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
  const maxKg     = Math.max(data.yearlyKg, WORLD_AVG_KG) * 1.15;
  const userPct   = Math.min((data.yearlyKg / maxKg) * 100, 100);
  const sdgPct    = Math.min((SDG_TARGET_KG  / maxKg) * 100, 100);
  const worldPct  = Math.min((WORLD_AVG_KG   / maxKg) * 100, 100);

  const userBar  = document.getElementById('bar-user');
  const sdgBar   = document.getElementById('bar-sdg');
  const worldBar = document.getElementById('bar-world');

  const userLbl  = document.getElementById('bar-user-lbl');
  const sdgLbl   = document.getElementById('bar-sdg-lbl');
  const worldLbl = document.getElementById('bar-world-lbl');

  if (userBar) {
    userBar.style.backgroundColor = userColor;
    userBar.style.height = '0%';
    userLbl && (userLbl.textContent = (data.yearlyKg/1000).toFixed(2) + 't');
  }
  if (sdgBar) {
    sdgBar.style.height = '0%';
    sdgLbl && (sdgLbl.textContent = '1.8t');
  }
  if (worldBar) {
    worldBar.style.height = '0%';
    worldLbl && (worldLbl.textContent = '4.7t');
  }

  // Animate after short delay (triggers CSS transition)
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
    <div class="rec-card bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div class="text-4xl mb-3">${r.icon}</div>
      <h3 class="text-lg font-bold text-white mb-2">${r.title}</h3>
      <p class="text-gray-300 text-sm leading-relaxed mb-4">${r.desc}</p>
      <span class="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-green-900/50 text-green-400 border border-green-800">
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
