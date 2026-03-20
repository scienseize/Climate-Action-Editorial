/* ============================================================
   SDG 13 Climate Action — Calculator Logic (daily basis)
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

// ~8 kg/day = 1800 kg/yr ÷ 230 working days
const SDG_TARGET_DAILY_KG = 7.83;

const DANGER_LEVELS = [
  { max: 8,        label: 'SAFE',     color: '#22c55e' },
  { max: 15,       label: 'MODERATE', color: '#facc15' },
  { max: 25,       label: 'HIGH',     color: '#f97316' },
  { max: Infinity, label: 'CRITICAL', color: '#dc2626' }
];

const PROGRESS_MAX_KG = 30; // daily scale ceiling

function calculateEmissions(mode, distanceKm) {
  const dailyKg = (EMISSION_FACTORS[mode] || 0) * distanceKm * 2; // round trip
  return { dailyKg };
}

function getDangerLevel(dailyKg) {
  return DANGER_LEVELS.find(d => dailyKg <= d.max) || DANGER_LEVELS[DANGER_LEVELS.length - 1];
}

function getProgressWidth(dailyKg) {
  return Math.min((dailyKg / PROGRESS_MAX_KG) * 100, 100);
}

// ---- DOM helpers ----
function getFormValues() {
  const modeInput = document.querySelector('input[name="transport-mode"]:checked');
  const mode       = modeInput ? modeInput.value : null;
  const distanceKm = parseFloat(document.getElementById('distance').value) || 0;
  return { mode, distanceKm };
}

function updateLivePanel() {
  const { mode, distanceKm } = getFormValues();
  const panel = document.getElementById('live-panel');
  if (!panel) return;

  if (!mode || distanceKm <= 0) {
    panel.querySelector('#lp-transport').textContent = mode ? MODE_LABELS[mode] : '—';
    panel.querySelector('#lp-daily').textContent     = '—';
    panel.querySelector('#lp-danger').textContent    = '—';
    panel.querySelector('#lp-danger').style.color    = '#9ca3af';
    const fill = document.getElementById('progress-fill');
    if (fill) { fill.style.width = '0%'; fill.style.backgroundColor = '#374151'; }
    return;
  }

  const { dailyKg } = calculateEmissions(mode, distanceKm);
  const danger = getDangerLevel(dailyKg);
  const width  = getProgressWidth(dailyKg);

  panel.querySelector('#lp-transport').textContent = MODE_LABELS[mode];
  panel.querySelector('#lp-daily').textContent     = dailyKg.toFixed(2) + ' kg CO₂';

  const dangerEl = panel.querySelector('#lp-danger');
  dangerEl.textContent = danger.label;
  dangerEl.style.color = danger.color;

  const fill = document.getElementById('progress-fill');
  if (fill) {
    fill.style.width           = width + '%';
    fill.style.backgroundColor = danger.color;
  }

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

  const checked = document.querySelector('input[name="transport-mode"]:checked');
  if (checked) {
    checked.closest('.mode-option')?.classList.add('selected');
  }
}

// ---- Validation ----
function validateForm() {
  const { mode, distanceKm } = getFormValues();
  const name  = document.getElementById('user-name')?.value.trim();
  const email = document.getElementById('user-email')?.value.trim();
  const errors = [];

  if (!mode)                        errors.push('Please select a transport mode.');
  if (!distanceKm || distanceKm<=0) errors.push('Please enter a valid distance (> 0 km).');
  if (!name)                        errors.push('Please enter your name.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Please enter a valid email address.');

  return errors;
}

function showErrors(errors) {
  const box = document.getElementById('form-errors');
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
    if (d.distanceKm !== undefined) document.getElementById('distance').value = d.distanceKm;
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

  const { mode, distanceKm } = getFormValues();
  const name  = document.getElementById('user-name').value.trim();
  const email = document.getElementById('user-email').value.trim();
  const { dailyKg } = calculateEmissions(mode, distanceKm);
  const danger = getDangerLevel(dailyKg);

  const payload = {
    name, email, mode,
    distanceKm,
    dailyKg:     parseFloat(dailyKg.toFixed(4)),
    dangerLabel: danger.label,
    dangerColor: danger.color,
    timestamp:   new Date().toISOString()
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
