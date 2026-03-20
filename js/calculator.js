/* ============================================================
   SDG 13 Climate Action — Calculator Logic
   ============================================================ */

const EMISSION_FACTORS = {
  car:      0.21,
  bus:      0.089,
  train:    0.041,
  bicycle:  0,
  walking:  0
};

const MODE_LABELS = {
  car:      '🚗 Car',
  bus:      '🚌 Bus',
  train:    '🚆 Train',
  bicycle:  '🚲 Bicycle',
  walking:  '🚶 Walking'
};

const SDG_TARGET_KG = 1800; // 1.8 tonnes/yr

const DANGER_LEVELS = [
  { max: 1800,     label: 'SAFE',     color: '#22c55e', textClass: 'text-green-400' },
  { max: 3500,     label: 'MODERATE', color: '#facc15', textClass: 'text-yellow-400' },
  { max: 6000,     label: 'HIGH',     color: '#f97316', textClass: 'text-orange-400' },
  { max: Infinity, label: 'CRITICAL', color: '#dc2626', textClass: 'text-red-500'   }
];

function calculateEmissions(mode, distanceKm, workingDays) {
  const dailyKg    = (EMISSION_FACTORS[mode] || 0) * distanceKm * 2; // round trip
  const yearlyKg   = dailyKg * workingDays;
  const yearlyTonnes = yearlyKg / 1000;
  return { dailyKg, yearlyKg, yearlyTonnes };
}

function getDangerLevel(yearlyKg) {
  return DANGER_LEVELS.find(d => yearlyKg <= d.max) || DANGER_LEVELS[DANGER_LEVELS.length - 1];
}

function getProgressWidth(yearlyKg) {
  return Math.min((yearlyKg / 8000) * 100, 100);
}

// ---- DOM helpers ----
function getFormValues() {
  const modeInput = document.querySelector('input[name="transport-mode"]:checked');
  const mode        = modeInput ? modeInput.value : null;
  const distanceKm  = parseFloat(document.getElementById('distance').value)     || 0;
  const workingDays = parseInt(document.getElementById('working-days').value, 10) || 0;
  return { mode, distanceKm, workingDays };
}

function updateLivePanel() {
  const { mode, distanceKm, workingDays } = getFormValues();

  const panel = document.getElementById('live-panel');
  if (!panel) return;

  if (!mode || distanceKm <= 0 || workingDays <= 0) {
    panel.querySelector('#lp-transport').textContent  = mode ? MODE_LABELS[mode] : '—';
    panel.querySelector('#lp-daily').textContent      = '—';
    panel.querySelector('#lp-yearly').textContent     = '—';
    panel.querySelector('#lp-danger').textContent     = '—';
    panel.querySelector('#lp-danger').style.color     = '#9ca3af';
    const fill = document.getElementById('progress-fill');
    if (fill) { fill.style.width = '0%'; fill.style.backgroundColor = '#374151'; }
    return;
  }

  const { dailyKg, yearlyKg, yearlyTonnes } = calculateEmissions(mode, distanceKm, workingDays);
  const danger = getDangerLevel(yearlyKg);
  const width  = getProgressWidth(yearlyKg);

  panel.querySelector('#lp-transport').textContent = MODE_LABELS[mode];
  panel.querySelector('#lp-daily').textContent     = dailyKg.toFixed(2) + ' kg CO₂';
  panel.querySelector('#lp-yearly').textContent    = yearlyTonnes.toFixed(3) + ' tonnes CO₂';

  const dangerEl = panel.querySelector('#lp-danger');
  dangerEl.textContent  = danger.label;
  dangerEl.style.color  = danger.color;

  const fill = document.getElementById('progress-fill');
  if (fill) {
    fill.style.width           = width + '%';
    fill.style.backgroundColor = danger.color;
  }

  // Update progress label
  const pctLabel = document.getElementById('progress-pct');
  if (pctLabel) pctLabel.textContent = Math.round(width) + '%';
}

// ---- Radio visual feedback ----
function setupRadioStyles() {
  const options = document.querySelectorAll('.mode-option');
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      updateLivePanel();
    });
  });

  // Check if one is pre-selected (from localStorage)
  const checked = document.querySelector('input[name="transport-mode"]:checked');
  if (checked) {
    checked.closest('.mode-option')?.classList.add('selected');
  }
}

// ---- Validation ----
function validateForm() {
  const { mode, distanceKm, workingDays } = getFormValues();
  const name  = document.getElementById('user-name')?.value.trim();
  const email = document.getElementById('user-email')?.value.trim();
  const errors = [];

  if (!mode)                        errors.push('Please select a transport mode.');
  if (!distanceKm || distanceKm<=0) errors.push('Please enter a valid distance (> 0 km).');
  if (!workingDays || workingDays<1) errors.push('Please enter valid working days (≥ 1).');
  if (!name)                        errors.push('Please enter your name.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Please enter a valid email address.');

  return errors;
}

function showErrors(errors) {
  let box = document.getElementById('form-errors');
  if (!box) return;
  if (errors.length === 0) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  box.innerHTML = errors.map(e => `<p>• ${e}</p>`).join('');
}

// ---- localStorage pre-fill ----
function prefillFromStorage() {
  const raw = localStorage.getItem('climateCalcResult');
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    if (d.mode) {
      const radio = document.querySelector(`input[name="transport-mode"][value="${d.mode}"]`);
      if (radio) radio.checked = true;
    }
    if (d.distanceKm !== undefined) document.getElementById('distance').value     = d.distanceKm;
    if (d.workingDays !== undefined) document.getElementById('working-days').value = d.workingDays;
    if (d.name)  document.getElementById('user-name').value  = d.name;
    if (d.email) document.getElementById('user-email').value = d.email;
  } catch(e) { /* ignore */ }
}

// ---- Submit ----
function handleSubmit(e) {
  e.preventDefault();
  const errors = validateForm();
  showErrors(errors);
  if (errors.length > 0) return;

  const { mode, distanceKm, workingDays } = getFormValues();
  const name  = document.getElementById('user-name').value.trim();
  const email = document.getElementById('user-email').value.trim();
  const { dailyKg, yearlyKg, yearlyTonnes } = calculateEmissions(mode, distanceKm, workingDays);
  const danger = getDangerLevel(yearlyKg);

  const payload = {
    name, email, mode,
    distanceKm, workingDays,
    dailyKg:      parseFloat(dailyKg.toFixed(4)),
    yearlyKg:     parseFloat(yearlyKg.toFixed(2)),
    yearlyTonnes: parseFloat(yearlyTonnes.toFixed(4)),
    dangerLabel:  danger.label,
    dangerColor:  danger.color,
    timestamp:    new Date().toISOString()
  };

  localStorage.setItem('climateCalcResult', JSON.stringify(payload));
  window.location.href = 'results.html';
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  prefillFromStorage();
  setupRadioStyles();
  updateLivePanel();

  const form = document.getElementById('calculator-form');
  if (form) {
    form.addEventListener('input',  updateLivePanel);
    form.addEventListener('change', updateLivePanel);
    form.addEventListener('submit', handleSubmit);
  }
});
