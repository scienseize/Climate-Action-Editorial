/* ============================================================
   SDG 13 Climate Action — Results Dashboard Logic (daily basis)
   ============================================================ */

const SDG_TARGET_DAILY_KG = 7.83;  // ~8 kg/day = 1800 kg/yr ÷ 230 days
const WORLD_AVG_DAILY_KG  = 20.4;  // 4700 kg/yr ÷ 230 days

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
  return Math.ceil((dailyKg * 230) / 21);
}

// ---- Recommendations ----
function buildRecommendations(data) {
  const recs = [];

  if (data.mode === 'car') {
    const busSaving   = (0.21 - 0.089) * data.distanceKm * 2;
    const trainSaving = (0.21 - 0.041) * data.distanceKm * 2;
    recs.push({
      icon: '🚌',
      title: 'Switch to Public Transit',
      desc: `Switching from your car to the bus could save <strong>${busSaving.toFixed(2)} kg CO₂/day</strong>. Taking the train saves even more — up to <strong>${trainSaving.toFixed(2)} kg CO₂/day</strong>.`,
      saving: busSaving.toFixed(2) + ' kg CO₂/day saved'
    });
  } else if (data.mode === 'bus') {
    const trainSaving = (0.089 - 0.041) * data.distanceKm * 2;
    recs.push({
      icon: '🚆',
      title: 'Upgrade to Rail',
      desc: `Trains emit 54% less CO₂ than buses. Switching could save <strong>${trainSaving.toFixed(2)} kg CO₂/day</strong>.`,
      saving: trainSaving.toFixed(2) + ' kg CO₂/day saved'
    });
  } else {
    recs.push({
      icon: '🌱',
      title: 'Stay Green',
      desc: 'Your current transport mode already produces zero direct emissions. You\'re leading by example — encourage others to make the switch!',
      saving: '0 kg CO₂/day'
    });
  }

  if (data.mode === 'car') {
    const evSaving = (0.21 - 0.053) * data.distanceKm * 2;
    const pct      = Math.round((evSaving / data.dailyKg) * 100);
    recs.push({
      icon: '⚡',
      title: 'Electric Vehicle Switch',
      desc: `An EV on today's grid emits ~0.053 kg CO₂/km. Switching could cut your daily emissions by <strong>${evSaving.toFixed(2)} kg CO₂/day</strong> — a ${pct}% reduction per trip.`,
      saving: evSaving.toFixed(2) + ' kg CO₂/day saved'
    });
  } else {
    recs.push({
      icon: '☀️',
      title: 'Renewable Energy at Home',
      desc: 'Even with low-emission transport, home energy is often the largest carbon source. Switching to a green energy tariff can cut your daily household footprint by 2–8 kg CO₂/day.',
      saving: 'Up to 8 kg CO₂/day saved'
    });
  }

  const hybridSaving = data.dailyKg * 0.4;
  recs.push({
    icon: '🏠',
    title: 'Hybrid Work (2 Days/Week)',
    desc: `Working from home 2 days a week reduces your commute frequency by ~40%, equivalent to saving <strong>${hybridSaving.toFixed(2)} kg CO₂</strong> on every working day on average.`,
    saving: hybridSaving.toFixed(2) + ' kg CO₂/day avg saved'
  });

  return recs;
}

// ---- Populate DOM ----
function populate(data) {
  const level = data.dangerLabel || 'SAFE';
  const trees = treesPerYear(data.dailyKg);

  // Personal header
  setText('res-name', data.name || 'Your');

  const badgeEl = document.getElementById('res-badge');
  if (badgeEl) {
    badgeEl.textContent = level;
    badgeEl.setAttribute('data-level', level);
  }

  // Stat cards
  setText('res-daily', data.dailyKg.toFixed(2) + ' kg');
  setText('res-trees', trees.toLocaleString() + ' trees');

  const dailyEl = document.getElementById('res-daily');
  if (dailyEl) dailyEl.setAttribute('data-level', level);

  // vs. target card
  const diff  = data.dailyKg - SDG_TARGET_DAILY_KG;
  const vsEl  = document.getElementById('res-vs-target');
  if (vsEl) {
    if (diff <= 0) {
      vsEl.textContent = '✓ Within target';
      vsEl.setAttribute('data-level', 'SAFE');
    } else {
      vsEl.textContent = '+' + diff.toFixed(1) + ' kg over';
      vsEl.setAttribute('data-level', level);
    }
  }

  // Context line
  const ctxEl = document.getElementById('res-context');
  if (ctxEl) {
    if (diff <= 0) {
      ctxEl.textContent = 'You are within the SDG 13 daily target of ~8 kg CO₂/day.';
      ctxEl.setAttribute('data-level', 'SAFE');
    } else {
      const over = Math.round((data.dailyKg / SDG_TARGET_DAILY_KG - 1) * 100);
      ctxEl.textContent = `You are ${over}% above the SDG 13 daily target of ~8 kg CO₂/day.`;
      ctxEl.setAttribute('data-level', level);
    }
  }

  // Timestamp
  const tsEl = document.getElementById('res-timestamp');
  if (tsEl && data.timestamp) {
    tsEl.textContent = 'Calculated: ' + new Date(data.timestamp).toLocaleString();
  }

  buildBarChart(data);
  buildRecCards(data);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function buildBarChart(data) {
  const level    = data.dangerLabel || 'SAFE';
  const maxKg    = Math.max(data.dailyKg, WORLD_AVG_DAILY_KG) * 1.15;
  const userPct  = Math.min((data.dailyKg        / maxKg) * 100, 100);
  const sdgPct   = Math.min((SDG_TARGET_DAILY_KG / maxKg) * 100, 100);
  const worldPct = Math.min((WORLD_AVG_DAILY_KG  / maxKg) * 100, 100);

  const userBar  = document.getElementById('bar-user');
  const sdgBar   = document.getElementById('bar-sdg');
  const worldBar = document.getElementById('bar-world');

  // Set labels
  setText('bar-user-lbl',  data.dailyKg.toFixed(1) + ' kg');
  setText('bar-sdg-lbl',   '7.8 kg');
  setText('bar-world-lbl', '20.4 kg');

  // Apply danger level to user bar and legend dot
  if (userBar) userBar.setAttribute('data-level', level);

  const dot = document.getElementById('legend-user-dot');
  if (dot) dot.setAttribute('data-level', level);

  // Start at 0 then animate to final height via CSS custom property
  if (userBar)  userBar.style.setProperty('--bar-height',  '0%');
  if (sdgBar)   sdgBar.style.setProperty('--bar-height',   '0%');
  if (worldBar) worldBar.style.setProperty('--bar-height', '0%');

  setTimeout(() => {
    if (userBar)  userBar.style.setProperty('--bar-height',  userPct  + '%');
    if (sdgBar)   sdgBar.style.setProperty('--bar-height',   sdgPct   + '%');
    if (worldBar) worldBar.style.setProperty('--bar-height', worldPct + '%');
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
