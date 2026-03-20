const SDG_TARGET_YEARLY_T = 1.8; // tonnes/yr
const SDG_TARGET_DAILY_KG = 7.83; // ~8 kg/day = 1800 kg/yr ÷ 230 days

// ---- Load data: URL params only (set by calculator submit redirect) ----
function loadData() {
  const params = new URLSearchParams(window.location.search);
  if (!params.get("dailyKg")) return null;

  let legs = [];
  try { legs = JSON.parse(params.get("legs") || "[]"); } catch (e) {}

  return {
    name: params.get("name") || "",
    legs,
    mode: params.get("primaryMode") || params.get("mode") || "",
    primaryMode: params.get("primaryMode") || params.get("mode") || "",
    distanceKm: parseFloat(params.get("distanceKm")),
    dailyKg: parseFloat(params.get("dailyKg")),
    dangerLabel: params.get("dangerLabel"),
    timestamp: params.get("timestamp"),
  };
}

function showNoData() {
  const noData = document.getElementById("no-data-state");
  const content = document.getElementById("results-content");
  const body = document.getElementById("results-body");
  if (noData) noData.classList.remove("hidden");
  if (content) content.classList.add("hidden");
  if (body) body.classList.add("hidden");
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
  const labels = {
    car: "private vehicle",
    motorcycle: "motorcycle (ride-hailing)",
    jeepney: "jeepney",
    hybrid: "hybrid car",
    ev: "electric vehicle",
    bus: "bus",
    train: "MRT/LRT",
    bicycle: "bicycle",
    walking: "walking",
  };
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
  const mode = data.mode;
  const dist = data.distanceKm;

  // ---- Rec 1: Best transit / mode shift ----
  if (mode === "car") {
    const savKg = (0.21 - 0.089) * dist * 2;
    const savT = ((savKg * 230) / 1000).toFixed(1);
    const pct = Math.round((savKg / data.dailyKg) * 100);
    recs.push({
      icon: REC_ICONS.transit,
      title: "Transit Shift",
      desc: `Switching to a jeepney or BRT for even 3 days a week could save ${savT} tonnes of CO₂ annually — bringing you ${pct}% closer to your climate targets.`,
    });
  } else if (mode === "motorcycle") {
    const savKg = (0.103 - 0.041) * dist * 2;
    const savT = ((savKg * 230) / 1000).toFixed(1);
    const pct = Math.round((savKg / data.dailyKg) * 100);
    recs.push({
      icon: REC_ICONS.transit,
      title: "Upgrade to Rail",
      desc: `Swapping your motorcycle ride-hail for MRT/LRT could save ${savT} tonnes of CO₂ annually — a ${pct}% reduction — while avoiding traffic entirely.`,
    });
  } else if (mode === "jeepney") {
    const savKg = (0.1 - 0.041) * dist * 2;
    const savT = ((savKg * 230) / 1000).toFixed(1);
    recs.push({
      icon: REC_ICONS.transit,
      title: "Upgrade to Rail",
      desc: `The MRT-3 and LRT lines emit 59% less CO₂ per passenger than a traditional jeepney. Switching could save ${savT} tonnes of CO₂ per year.`,
    });
  } else if (mode === "bus") {
    const savKg = (0.089 - 0.041) * dist * 2;
    const savT = ((savKg * 230) / 1000).toFixed(1);
    recs.push({
      icon: REC_ICONS.transit,
      title: "Upgrade to Rail",
      desc: `The MRT-3 and LRT lines emit 54% less CO₂ than buses per passenger. Switching could save ${savT} tonnes of CO₂ per year.`,
    });
  } else if (mode === "hybrid") {
    const pct = Math.round((1 - 0.053 / 0.11) * 100);
    recs.push({
      icon: REC_ICONS.transit,
      title: "Go Full Electric",
      desc: `You're already ahead with a hybrid. Completing the switch to a full EV under the DOE incentive program would cut your remaining commute emissions by a further ${pct}%.`,
    });
  } else {
    // ev, train, bicycle, walking
    const isZero = mode === "bicycle" || mode === "walking";
    recs.push({
      icon: REC_ICONS.green,
      title: "Stay Green",
      desc: isZero
        ? "Your transport mode produces zero direct emissions. You're leading by example — encourage others in your workplace to make the switch."
        : "Your commute is already among the lowest-emission options available. Charging from solar or a green energy provider brings that even closer to zero.",
    });
  }

  // ---- Rec 2: Electrification / energy ----
  if (mode === "car") {
    const savKg = (0.21 - 0.053) * dist * 2;
    const pct = Math.round((savKg / data.dailyKg) * 100);
    recs.push({
      icon: REC_ICONS.ev,
      title: "Electrification",
      desc: `The DOE's e-vehicle incentive program makes EVs more accessible. Switching from your ICE car would reduce commute emissions by ${pct}% immediately.`,
    });
  } else if (mode === "motorcycle") {
    const savKg = (0.103 - 0.053) * dist * 2;
    const savT = ((savKg * 230) / 1000).toFixed(1);
    recs.push({
      icon: REC_ICONS.ev,
      title: "E-Motorcycle Switch",
      desc: `Platforms like Angkas and Joyride are expanding e-motorcycle fleets. Switching could save ${savT} tonnes of CO₂ annually with the same door-to-door convenience.`,
    });
  } else if (mode === "hybrid") {
    const savKg = (0.11 - 0.053) * dist * 2;
    const savT = ((savKg * 230) / 1000).toFixed(1);
    recs.push({
      icon: REC_ICONS.ev,
      title: "Full EV Transition",
      desc: `Going from hybrid to full EV could save an additional ${savT} tonnes of CO₂ per year. The DOE's EV incentive program and growing charging infrastructure make this increasingly practical.`,
    });
  } else if (mode === "jeepney") {
    recs.push({
      icon: REC_ICONS.ev,
      title: "Support E-Jeepney",
      desc: "The government's PUV Modernization Program is replacing traditional diesel jeepneys with electric units. Choosing e-jeepney routes when available can cut per-passenger emissions by up to 70%.",
    });
  } else {
    recs.push({
      icon: REC_ICONS.ev,
      title: "Renewable Energy at Home",
      desc: "The Philippines targets 35% renewable energy by 2030. Installing solar panels or switching to a green energy provider reduces your household footprint and supports the national clean energy transition.",
    });
  }

  // ---- Rec 3: Hybrid Work (all modes) ----
  const hybridSavingT = ((data.dailyKg * 0.2 * 230) / 1000).toFixed(2);
  recs.push({
    icon: REC_ICONS.hybrid,
    title: "Hybrid Work",
    desc: `Metro Manila workers lose an average of 66 minutes to traffic daily. Working from home just one day a week eliminates ${hybridSavingT} tonnes of annual emissions and reclaims hours of your week.`,
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
  const level = data.dangerLabel || "SAFE";
  const yearlyT = (data.dailyKg * 230) / 1000;
  const maxT = Math.max(yearlyT * 1.2, SDG_TARGET_YEARLY_T * 2);
  const userPct = Math.min((yearlyT / maxT) * 100, 100);
  const sdgPct = Math.min((SDG_TARGET_YEARLY_T / maxT) * 100, 100);

  const userBar = document.getElementById("bar-user-h");
  const sdgBar = document.getElementById("bar-sdg-h");

  if (userBar) {
    userBar.setAttribute("data-level", level);
    userBar.style.setProperty("--bar-w", "0%");
  }
  if (sdgBar) sdgBar.style.setProperty("--bar-w", "0%");

  setTimeout(() => {
    if (userBar) userBar.style.setProperty("--bar-w", userPct + "%");
    if (sdgBar) sdgBar.style.setProperty("--bar-w", sdgPct + "%");
  }, 80);

  // Yearly label
  setText("res-yearly-lbl", yearlyT.toFixed(1) + "t");

  // Reduction note
  const noteEl = document.getElementById("res-reduction-note");
  if (noteEl) {
    if (yearlyT <= SDG_TARGET_YEARLY_T) {
      noteEl.textContent =
        "You are within the SDG 13 Target 13.2 — your commute emissions are sustainable.";
    } else {
      const pct = Math.round((1 - SDG_TARGET_YEARLY_T / yearlyT) * 100);
      noteEl.textContent = `Achieving SDG Target 13.2 requires a reduction of ${pct}% in your current transportation emissions.`;
    }
  }
}

// ---- Build recommendation cards ----
function buildRecCards(data) {
  const container = document.getElementById("rec-container");
  if (!container) return;
  const recs = buildRecommendations(data);
  container.innerHTML = recs
    .map(
      (r) => `
    <div class="rec-card bg-slate-100 rounded-2xl p-8">
      <div class="mb-5">${r.icon}</div>
      <h3 class="text-xl font-bold text-gray-900 mb-3">${r.title}</h3>
      <p class="text-sm text-gray-600 leading-relaxed">${r.desc}</p>
    </div>
  `,
    )
    .join("");
}

// ---- Populate DOM ----
function populate(data) {
  const level = data.dangerLabel || "SAFE";
  const trees = treesPerYear(data.dailyKg);
  const yearlyT = ((data.dailyKg * 230) / 1000).toFixed(1);

  // Badge (urgency level text)
  const badgeEl = document.getElementById("res-badge");
  if (badgeEl) {
    const labels = {
      SAFE: "Safe",
      MODERATE: "Moderate",
      HIGH: "High",
      CRITICAL: "Critical",
    };
    badgeEl.textContent = labels[level] || level;
    badgeEl.setAttribute("data-level", level);
  }

  // Personalise headline with name
  const headlineEl = document.getElementById("res-headline");
  if (headlineEl && data.name) {
    headlineEl.innerHTML = `${data.name}'s Commute<br />Carbon Legacy.`;
  }

  // Context line (hero subtitle)
  const ctxEl = document.getElementById("res-context");
  if (ctxEl) {
    const dist = data.distanceKm || 0;
    const commuteDesc =
      data.legs && data.legs.length > 1
        ? `${data.legs.length}-mode commute`
        : modeLabel(data.mode);
    const diff = data.dailyKg - SDG_TARGET_DAILY_KG;
    const suffix =
      diff > 0
        ? "your footprint significantly exceeds sustainable SDG thresholds."
        : "your footprint is within sustainable SDG thresholds.";
    const greeting = data.name ? `${data.name}, based on` : "Based on";
    ctxEl.textContent = `${greeting} your daily ${dist}-km commute via ${commuteDesc}, ${suffix}`;
  }

  // Emission summary (urgency card italic)
  const sumEl = document.getElementById("res-emission-summary");
  if (sumEl) {
    sumEl.textContent = `You are emitting ${yearlyT} tonnes of CO₂ annually from commuting — transport is the Philippines' fastest-growing emissions sector.`;
  }

  // Urgency indicator position
  const indicatorEl = document.getElementById("urgency-indicator");
  if (indicatorEl) {
    indicatorEl.style.setProperty(
      "--indicator-pos",
      indicatorPosition(level) + "%",
    );
  }

  // Metric card
  const acres = Math.ceil(trees / 20);
  setText(
    "res-trees-headline",
    `Equivalent to ${trees.toLocaleString()} mature trees burning.`,
  );
  setText(
    "res-metric-desc",
    `The carbon released by your daily commute would require ${acres} acres of forest one full year to sequester.`,
  );

  buildHBarChart(data);
  buildRecCards(data);
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  // Show results only when arriving directly from a calculator submit (URL params present).
  // Any refresh, back-navigation, or page-link visit lands here without params → blank state.
  const navEntry = performance.getEntriesByType("navigation")[0];
  const isReload = navEntry && navEntry.type === "reload";

  const data = isReload ? null : loadData();
  if (!data) {
    showNoData();
    return;
  }
  populate(data);
});
