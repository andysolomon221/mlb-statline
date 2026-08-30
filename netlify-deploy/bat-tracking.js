const firstBatTrackingSeason = 2023;
const lastBatTrackingSeason = new Date().getFullYear();
const batTrackingParams = new URLSearchParams(window.location.search);
let batTrackingType = batTrackingParams.get("type") === "pitcher" ? "pitcher" : "batter";
let batTrackingSeason = String(Math.min(lastBatTrackingSeason, Math.max(firstBatTrackingSeason, Number(batTrackingParams.get("season")) || lastBatTrackingSeason)));
let batTrackingMetric = batTrackingParams.get("metric") || (batTrackingType === "pitcher" ? "swords" : "avgBatSpeed");
let batTrackingMinimum = batTrackingParams.get("min") || "auto";
let batTrackingRows = [];
let batTrackingSort = { key: batTrackingMetric, dir: -1 };

const batTrackingMetrics = {
  batter: [
    ["avgBatSpeed", "Bat Speed"], ["fastSwingRate", "Fast Swing %"],
    ["squaredUpRate", "Squared-Up %"], ["blastRate", "Blast %"],
    ["swingLength", "Swing Length"], ["attackAngle", "Attack Angle"],
    ["idealAttackAngleRate", "Ideal Angle %"], ["swingPathTilt", "Swing Path Tilt"],
    ["attackDirection", "Attack Direction"], ["whiffRate", "Whiff %"]
  ],
  pitcher: [
    ["swords", "Swords"], ["whiffRate", "Whiff %"],
    ["avgBatSpeed", "Bat Speed Allowed"], ["squaredUpRate", "Squared-Up % Allowed"],
    ["blastRate", "Blast % Allowed"], ["swingLength", "Swing Length Allowed"]
  ]
};

const batTrackingLowerBetter = new Set(["avgBatSpeed", "fastSwingRate", "squaredUpRate", "blastRate"]);

function batMetricLabel(key = batTrackingMetric) {
  return batTrackingMetrics[batTrackingType].find(([metric]) => metric === key)?.[1] || key;
}

function batMetricDirection(key) {
  return batTrackingType === "pitcher" && batTrackingLowerBetter.has(key) ? 1 : -1;
}

function batFormat(key, value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (["fastSwingRate", "squaredUpRate", "blastRate", "idealAttackAngleRate", "whiffRate"].includes(key)) return `${(number * 100).toFixed(1)}%`;
  if (["attackAngle", "swingPathTilt", "attackDirection"].includes(key)) return `${number.toFixed(1)}°`;
  if (key === "avgBatSpeed") return `${number.toFixed(1)} mph`;
  if (key === "swingLength") return `${number.toFixed(1)} ft`;
  return Math.round(number).toLocaleString("en-US");
}

function batTrackingAutoMinimum() {
  if (Number(batTrackingSeason) < lastBatTrackingSeason) return 300;
  const now = new Date();
  const progress = Math.min(1, Math.max(0.15, (now - new Date(lastBatTrackingSeason, 3, 1)) / (new Date(lastBatTrackingSeason, 8, 30) - new Date(lastBatTrackingSeason, 3, 1))));
  return Math.max(50, Math.round(300 * progress / 25) * 25);
}

function batTrackingMinimumValue() {
  return batTrackingMinimum === "auto" ? batTrackingAutoMinimum() : Number(batTrackingMinimum) || 0;
}

function batTrackingFilteredRows() {
  const query = document.querySelector("#bat-tracking-search").value.trim().toLowerCase();
  const minimum = batTrackingMinimumValue();
  return batTrackingRows
    .filter((row) => Number(row.swings) >= minimum)
    .filter((row) => !query || `${row.name} ${row.team}`.toLowerCase().includes(query))
    .sort((a, b) => {
      if (batTrackingSort.key === "name" || batTrackingSort.key === "team") return String(a[batTrackingSort.key]).localeCompare(String(b[batTrackingSort.key])) * batTrackingSort.dir;
      return ((Number(a[batTrackingSort.key]) || 0) - (Number(b[batTrackingSort.key]) || 0)) * batTrackingSort.dir;
    });
}

function batPlayerActions(name, chart = false) {
  const group = batTrackingType === "pitcher" ? "pitching" : "hitting";
  const query = new URLSearchParams({ player: name, group }).toString();
  return `<div class="player-row-actions${chart ? " chart-player-actions" : ""}"><a href="career.html?${query}">Career</a><a href="splits.html?${query}">Splits</a></div>`;
}

function batTrackingRenderControls() {
  document.querySelector("#bat-tracking-season").innerHTML = Array.from({ length: lastBatTrackingSeason - firstBatTrackingSeason + 1 }, (_, index) => {
    const year = lastBatTrackingSeason - index;
    return `<option value="${year}">${year}</option>`;
  }).join("");
  document.querySelector("#bat-tracking-season").value = batTrackingSeason;
  if (!batTrackingMetrics[batTrackingType].some(([key]) => key === batTrackingMetric)) batTrackingMetric = batTrackingMetrics[batTrackingType][0][0];
  const options = batTrackingMetrics[batTrackingType].map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
  document.querySelectorAll("#bat-tracking-metric, #bat-tracking-metric-board").forEach((select) => { select.innerHTML = options; select.value = batTrackingMetric; });
  document.querySelectorAll("[data-bat-tracking-type]").forEach((button) => button.classList.toggle("active", button.dataset.batTrackingType === batTrackingType));
  const auto = batTrackingAutoMinimum();
  document.querySelector("#bat-tracking-min").innerHTML = [["auto", `Auto (${auto}+)`], ["0", "All"], ["50", "50+"], ["100", "100+"], ["200", "200+"], ["300", "300+"], ["500", "500+"]]
    .map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  document.querySelector("#bat-tracking-min").value = batTrackingMinimum;
}

function batTrackingRender() {
  const rows = batTrackingFilteredRows();
  const leader = rows[0];
  document.querySelector("#bat-tracking-leader").textContent = leader?.name || "No players";
  document.querySelector("#bat-tracking-leader-note").textContent = leader ? `${leader.team} · ${batMetricLabel()} ${batFormat(batTrackingMetric, leader[batTrackingMetric])}` : "Try another filter";
  document.querySelector("#bat-tracking-metric-card").textContent = batMetricLabel();
  document.querySelector("#bat-tracking-scope-card").textContent = batTrackingSeason;
  document.querySelector("#bat-tracking-count").textContent = rows.length;
  document.querySelector("#bat-tracking-count-note").textContent = `${batTrackingMinimumValue()}+ competitive swings`;
  document.querySelector("#bat-tracking-chart-title").textContent = `${batMetricLabel()} ${batTrackingType === "pitcher" ? "pitcher" : "hitter"} leaders`;
  document.querySelector("#bat-tracking-table-title").textContent = `${batTrackingSeason} ${batMetricLabel()} board`;
  const top = rows.slice(0, 10);
  const values = top.map((row) => Number(row[batTrackingMetric]) || 0);
  const max = Math.max(...values.map(Math.abs), 1);
  document.querySelector("#bat-tracking-chart").innerHTML = top.map((row) => `
    <div class="bar-row"><div class="bar-label"><strong>${row.name}</strong><span>${row.team} · ${batFormat("swings", row.swings)} swings</span>${batPlayerActions(row.name, true)}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${Math.max(6, Math.abs(Number(row[batTrackingMetric]) || 0) / max * 100).toFixed(1)}%"></div></div>
    <div class="bar-value">${batFormat(batTrackingMetric, row[batTrackingMetric])}</div></div>`).join("") || `<div class="empty-state">No players match this filter.</div>`;
  const columns = [["name", "Player"], ["team", "Team"], ["swings", "Swings"], ...batTrackingMetrics[batTrackingType]];
  document.querySelector("#bat-tracking-head").innerHTML = `<tr>${columns.map(([key, label]) => `<th data-sort="${key}">${label}</th>`).join("")}</tr>`;
  document.querySelector("#bat-tracking-table").innerHTML = rows.slice(0, 100).map((row) => `<tr>
    <td><div class="player-cell-stack"><strong>${row.name}</strong>${batPlayerActions(row.name)}</div></td><td>${row.team}</td><td>${batFormat("swings", row.swings)}</td>
    ${batTrackingMetrics[batTrackingType].map(([key]) => `<td>${batFormat(key, row[key])}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="13" class="empty-row">No players match this filter.</td></tr>`;
  document.querySelectorAll("#bat-tracking-head th[data-sort]").forEach((header) => header.addEventListener("click", () => {
    const key = header.dataset.sort;
    if (batTrackingMetrics[batTrackingType].some(([metric]) => metric === key)) {
      batTrackingMetric = key;
      document.querySelectorAll("#bat-tracking-metric, #bat-tracking-metric-board").forEach((select) => { select.value = key; });
    }
    batTrackingSort = batTrackingSort.key === key ? { key, dir: batTrackingSort.dir * -1 } : { key, dir: batMetricDirection(key) };
    batTrackingRender();
  }));
}

async function loadBatTracking() {
  document.querySelector("#bat-tracking-status").textContent = "Loading…";
  document.querySelector("#bat-tracking-chart").innerHTML = `<div class="empty-state loading-state" role="status">Loading Baseball Savant bat tracking…</div>`;
  try {
    const response = await fetch(`/.netlify/functions/bat-tracking?type=${batTrackingType}&year=${batTrackingSeason}`);
    if (!response.ok) throw new Error(`Bat tracking returned ${response.status}`);
    const data = await response.json();
    batTrackingRows = data.rows || [];
    batTrackingSort = { key: batTrackingMetric, dir: batMetricDirection(batTrackingMetric) };
    batTrackingRender();
    document.querySelector("#bat-tracking-status").textContent = `${batTrackingRows.length} players loaded`;
  } catch (error) {
    batTrackingRows = [];
    document.querySelector("#bat-tracking-status").textContent = "Bat-tracking feed unavailable";
    document.querySelector("#bat-tracking-chart").innerHTML = `<div class="empty-state">The Baseball Savant feed is temporarily unavailable.<button type="button" onclick="loadBatTracking()">Try again</button></div>`;
    document.querySelector("#bat-tracking-table").innerHTML = `<tr><td colspan="13" class="empty-row">Bat-tracking results could not be loaded.</td></tr>`;
  }
}

document.querySelector("#bat-tracking-season").addEventListener("change", (event) => { batTrackingSeason = event.target.value; batTrackingRenderControls(); loadBatTracking(); });
document.querySelectorAll("[data-bat-tracking-type]").forEach((button) => button.addEventListener("click", () => {
  batTrackingType = button.dataset.batTrackingType;
  batTrackingMetric = batTrackingType === "pitcher" ? "swords" : "avgBatSpeed";
  batTrackingRenderControls(); loadBatTracking();
}));
document.querySelectorAll("#bat-tracking-metric, #bat-tracking-metric-board").forEach((select) => select.addEventListener("change", (event) => {
  batTrackingMetric = event.target.value; batTrackingSort = { key: batTrackingMetric, dir: batMetricDirection(batTrackingMetric) };
  document.querySelectorAll("#bat-tracking-metric, #bat-tracking-metric-board").forEach((other) => { other.value = batTrackingMetric; }); batTrackingRender();
}));
document.querySelector("#bat-tracking-min").addEventListener("change", (event) => { batTrackingMinimum = event.target.value; batTrackingRender(); });
document.querySelector("#bat-tracking-search").addEventListener("input", batTrackingRender);

batTrackingRenderControls();
loadBatTracking();
