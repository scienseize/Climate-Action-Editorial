const EMISSION_FACTORS = {
  car: 0.21, // private ICE car (solo driver)
  motorcycle: 0.103, // ride-hailing motorcycle (Angkas/Joyride)
  jeepney: 0.1, // traditional diesel jeepney, per passenger
  hybrid: 0.11, // hybrid car (~48% better than ICE)
  ev: 0.053, // electric car on Philippine grid
  bus: 0.089, // bus, per passenger
  train: 0.041, // MRT/LRT, per passenger
  bicycle: 0,
  walking: 0,
};

const MODE_LABELS = {
  car: "🚗 Car",
  motorcycle: "🏍️ Motorcycle",
  jeepney: "🚐 Jeepney",
  hybrid: "🔋 Hybrid Car",
  ev: "⚡ Electric Car",
  bus: "🚌 Bus",
  train: "🚆 Train",
  bicycle: "🚲 Bicycle",
  walking: "🚶 Walking",
};

const MODE_OPTIONS = [
  { value: "car", label: "🚗 Car", info: "0.21 kg/km" },
  { value: "motorcycle", label: "🏍️ Motorcycle", info: "0.103 kg/km" },
  { value: "jeepney", label: "🚐 Jeepney", info: "0.10 kg/km" },
  { value: "hybrid", label: "🔋 Hybrid Car", info: "0.11 kg/km" },
  { value: "ev", label: "⚡ Electric Car", info: "0.053 kg/km" },
  { value: "bus", label: "🚌 Bus", info: "0.089 kg/km" },
  { value: "train", label: "🚆 Train/MRT", info: "0.041 kg/km" },
  { value: "bicycle", label: "🚲 Bicycle", info: "0 kg/km" },
  { value: "walking", label: "🚶 Walking", info: "0 kg/km" },
];

const SDG_TARGET_DAILY_KG = 7.83; // ~8 kg/day = 1800 kg/yr ÷ 230 working days

const DANGER_LEVELS = [
  { max: 8, label: "SAFE" },
  { max: 15, label: "MODERATE" },
  { max: 25, label: "HIGH" },
  { max: Infinity, label: "CRITICAL" },
];

const PROGRESS_MAX_KG = 30; // daily scale ceiling

function getDangerLevel(dailyKg) {
  return (
    DANGER_LEVELS.find((d) => dailyKg <= d.max) ||
    DANGER_LEVELS[DANGER_LEVELS.length - 1]
  );
}

function getProgressWidth(dailyKg) {
  return Math.min((dailyKg / PROGRESS_MAX_KG) * 100, 100);
}

// ---- Leg row helpers ----

function createLegRow(mode = "", distanceKm = "") {
  const container = document.getElementById("legs-container");
  const legIndex = container
    ? container.querySelectorAll(".leg-row").length + 1
    : 1;

  const row = document.createElement("div");
  row.className = "leg-row flex items-center gap-3";

  // Leg label
  const label = document.createElement("span");
  label.className = "text-sm font-semibold text-gray-500 w-12 shrink-0";
  label.textContent = `Leg ${legIndex}`;

  // Mode select
  const select = document.createElement("select");
  select.className =
    "leg-mode flex-1 bg-white border-2 border-gray-200 focus:border-primary focus:outline-none text-gray-900 rounded-xl px-3 py-2.5 text-sm transition-colors";
  select.innerHTML =
    `<option value="">— Select mode —</option>` +
    MODE_OPTIONS.map(
      (o) =>
        `<option value="${o.value}"${o.value === mode ? " selected" : ""}>${o.label} (${o.info})</option>`,
    ).join("");

  // Distance input
  const distInput = document.createElement("input");
  distInput.type = "number";
  distInput.className =
    "leg-distance w-24 bg-white border-2 border-gray-200 focus:border-primary focus:outline-none text-gray-900 rounded-xl px-3 py-2.5 text-sm transition-colors";
  distInput.min = "0";
  distInput.max = "500";
  distInput.step = "0.5";
  distInput.placeholder = "km";
  if (distanceKm) distInput.value = distanceKm;

  // Remove button
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className =
    "leg-remove w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-secondary hover:bg-red-50 transition-colors shrink-0";
  removeBtn.setAttribute("aria-label", "Remove leg");
  removeBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
  removeBtn.addEventListener("click", () => removeLeg(row));

  // Attach live-update listeners
  select.addEventListener("change", updateLivePanel);
  distInput.addEventListener("input", updateLivePanel);

  row.appendChild(label);
  row.appendChild(select);
  row.appendChild(distInput);
  row.appendChild(removeBtn);

  return row;
}

function removeLeg(row) {
  row.remove();
  refreshLegLabels();
  refreshRemoveButtons();
  updateLivePanel();
}

function refreshLegLabels() {
  document.querySelectorAll(".leg-row").forEach((row, i) => {
    const label = row.querySelector("span");
    if (label) label.textContent = `Leg ${i + 1}`;
  });
}

function refreshRemoveButtons() {
  const rows = document.querySelectorAll(".leg-row");
  rows.forEach((row) => {
    const btn = row.querySelector(".leg-remove");
    if (btn) btn.classList.toggle("hidden", rows.length === 1);
  });
}

function getLegs() {
  return [...document.querySelectorAll(".leg-row")].map((row) => ({
    mode: row.querySelector(".leg-mode").value,
    distanceKm: parseFloat(row.querySelector(".leg-distance").value) || 0,
  }));
}

// ---- Live Panel ----

function updateLivePanel() {
  const panel = document.getElementById("live-panel");
  if (!panel) return;

  const transportEl = panel.querySelector("#lp-transport");
  const dailyEl = panel.querySelector("#lp-daily");
  const dangerEl = panel.querySelector("#lp-danger");
  const fill = document.getElementById("progress-fill");
  const pctLabel = document.getElementById("progress-pct");

  const legs = getLegs().filter((l) => l.mode && l.distanceKm > 0);

  if (legs.length === 0) {
    if (transportEl) transportEl.textContent = "—";
    if (dailyEl) dailyEl.textContent = "—";
    if (dangerEl) {
      dangerEl.textContent = "—";
      dangerEl.setAttribute("data-level", "none");
    }
    if (fill) {
      fill.setAttribute("data-level", "none");
      fill.style.setProperty("--fill-width", "0%");
    }
    if (pctLabel) pctLabel.textContent = "0%";
    return;
  }

  const dailyKg = legs.reduce(
    (s, l) => s + EMISSION_FACTORS[l.mode] * l.distanceKm * 2,
    0,
  );
  const danger = getDangerLevel(dailyKg);
  const width = getProgressWidth(dailyKg);
  const legCount = document.querySelectorAll(".leg-row").length;

  if (transportEl) {
    transportEl.textContent =
      legCount === 1
        ? MODE_LABELS[legs[0].mode] || "—"
        : `${legCount}-leg commute`;
  }
  if (dailyEl) dailyEl.textContent = dailyKg.toFixed(2) + " kg CO₂";
  if (dangerEl) {
    dangerEl.textContent = danger.label;
    dangerEl.setAttribute("data-level", danger.label);
  }
  if (fill) {
    fill.setAttribute("data-level", danger.label);
    fill.style.setProperty("--fill-width", width + "%");
  }
  if (pctLabel) pctLabel.textContent = Math.round(width) + "%";
}

// ---- Validation ----

function validateForm() {
  const legs = getLegs();
  const errors = [];

  const validLegs = legs.filter((l) => l.mode && l.distanceKm > 0);
  if (validLegs.length === 0)
    errors.push(
      "Please add at least one commute leg with a mode and distance.",
    );

  return errors;
}

function showErrors(errors) {
  const box = document.getElementById("form-errors");
  if (!box) return;
  if (errors.length === 0) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  box.innerHTML = errors.map((e) => `<p>• ${e}</p>`).join("");
}


// ---- Submit ----

function handleSubmit(e) {
  e.preventDefault();
  const errors = validateForm();
  showErrors(errors);
  if (errors.length > 0) return;

  const legs = getLegs().filter((l) => l.mode && l.distanceKm > 0);

  const dailyKg = legs.reduce(
    (s, l) => s + EMISSION_FACTORS[l.mode] * l.distanceKm * 2,
    0,
  );
  const danger = getDangerLevel(dailyKg);

  // Primary mode = leg with highest individual daily kg contribution
  const primaryLeg = legs.reduce((max, l) =>
    EMISSION_FACTORS[l.mode] * l.distanceKm >
    EMISSION_FACTORS[max.mode] * max.distanceKm
      ? l
      : max,
  );

  const payload = {
    legs,
    primaryMode: primaryLeg.mode,
    distanceKm: legs.reduce((s, l) => s + l.distanceKm, 0),
    dailyKg: parseFloat(dailyKg.toFixed(4)),
    dangerLabel: danger.label,
    timestamp: new Date().toISOString(),
  };

  const params = new URLSearchParams({
    legs: JSON.stringify(legs),
    primaryMode: payload.primaryMode,
    distanceKm: payload.distanceKm,
    dailyKg: payload.dailyKg,
    dangerLabel: payload.dangerLabel,
    timestamp: payload.timestamp,
  });
  window.location.href = "results.html?" + params.toString();
}

// ---- Init ----

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("legs-container");

  // Create one default leg row
  if (container) {
    container.appendChild(createLegRow());
  }

  // Sync remove button visibility
  refreshRemoveButtons();

  // Initial live panel state
  updateLivePanel();

  // Add Leg button
  const addLegBtn = document.getElementById("add-leg-btn");
  if (addLegBtn) {
    addLegBtn.addEventListener("click", () => {
      if (container) container.appendChild(createLegRow());
      refreshRemoveButtons();
      updateLivePanel();
    });
  }

  // Form submit
  const form = document.getElementById("calculator-form");
  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
});
