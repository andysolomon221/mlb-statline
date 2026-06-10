const firstSeason = 2015;
const lastSeason = 2026;
let activeType = "batter";
let activeSeason = "2026";
let pendingTeam = new URLSearchParams(window.location.search).get("team") || "all";
let activeTeam = "all";
let activeMetric = "exit_velocity_avg";
let activeSort = { key: "exit_velocity_avg", dir: -1 };
let activeSampleMin = "auto";
let rows = [];

const metrics = {
  batter: [
    ["exit_velocity_avg", "Avg EV"],
    ["hard_hit_percent", "Hard-Hit %"],
    ["barrel_batted_rate", "Barrel %"],
    ["launch_angle_avg", "Launch Angle"],
    ["sweet_spot_percent", "Sweet Spot %"],
    ["xwoba", "xwOBA"],
    ["xba", "xBA"],
    ["xslg", "xSLG"]
  ],
  pitcher: [
    ["xwoba", "xwOBA Allowed"],
    ["exit_velocity_avg", "EV Allowed"],
    ["hard_hit_percent", "Hard-Hit % Allowed"],
    ["barrel_batted_rate", "Barrel % Allowed"],
    ["launch_angle_avg", "Launch Angle"],
    ["sweet_spot_percent", "Sweet Spot %"],
    ["xba", "xBA Allowed"],
    ["xslg", "xSLG Allowed"]
  ]
};

const lowerBetter = {
  batter: [],
  pitcher: ["xwoba", "exit_velocity_avg", "hard_hit_percent", "barrel_batted_rate", "xba", "xslg"]
};

function metricLabel(key = activeMetric) {
  return metrics[activeType].find(([metric]) => metric === key)?.[1] || key;
}

function sortDirection(key) {
  return lowerBetter[activeType].includes(key) ? 1 : -1;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function fmtStat(key, value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  if (["hard_hit_percent", "barrel_batted_rate", "sweet_spot_percent"].includes(key)) return `${number.toFixed(1)}%`;
  if (["xwoba", "xba", "xslg"].includes(key)) return number.toFixed(3).replace(/^0/, "");
  if (key === "sample") return Math.round(number).toLocaleString("en-US");
  return number.toFixed(1);
}

function sampleLabel() {
  return activeType === "batter" ? "PA" : "BF";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function seasonProgress(season = activeSeason) {
  const year = Number(season);
  const currentYear = new Date().getFullYear();
  if (year < currentYear) return 1;
  if (year > currentYear) return 0.25;
  const today = new Date();
  const seasonStart = new Date(year, 3, 1);
  const seasonEnd = new Date(year, 8, 30);
  return clamp((today - seasonStart) / (seasonEnd - seasonStart), 0.2, 1);
}

function roundedMinimum(fullSeasonMinimum, earlyMinimum, step = 25) {
  const raw = Math.max(earlyMinimum, fullSeasonMinimum * seasonProgress());
  return Math.round(raw / step) * step;
}

function autoSampleMinimum() {
  return activeType === "batter" ? roundedMinimum(250, 50, 25) : roundedMinimum(250, 50, 25);
}

function activeSampleMinimum() {
  if (activeSampleMin === "all") return 0;
  if (activeSampleMin === "auto") return autoSampleMinimum();
  return Number(activeSampleMin) || 0;
}

function baseballReferenceSearchUrl(name) {
  return `https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(name)}`;
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("");
}

function apiUrl() {
  const params = new URLSearchParams({ type: activeType, year: activeSeason });
  return `/.netlify/functions/statcast?${params.toString()}`;
}

function filteredRows() {
  const query = document.querySelector("#statcast-search").value.trim().toLowerCase();
  return rows
    .filter((row) => activeTeam === "all" || row.team === activeTeam)
    .filter((row) => !query || `${row.name} ${row.team} ${row.teamName}`.toLowerCase().includes(query))
    .filter((row) => query || toNumber(row.sample) >= activeSampleMinimum())
    .sort((a, b) => (toNumber(a[activeSort.key]) - toNumber(b[activeSort.key])) * activeSort.dir);
}

function renderTeamOptions() {
  const teams = Array.from(new Map(rows.filter((row) => row.team !== "MLB").map((row) => [row.team, row.teamName || row.team])).entries())
    .sort((a, b) => a[1].localeCompare(b[1]));
  if (pendingTeam !== "all" && teams.some(([abbr]) => abbr === pendingTeam.toUpperCase())) {
    activeTeam = pendingTeam.toUpperCase();
  }
  pendingTeam = "all";
  document.querySelector("#statcast-team").innerHTML = `<option value="all">All teams</option>${teams.map(([abbr, name]) => `<option value="${abbr}">${name}</option>`).join("")}`;
  if (activeTeam !== "all" && !teams.some(([abbr]) => abbr === activeTeam)) activeTeam = "all";
  document.querySelector("#statcast-team").value = activeTeam;
}

function renderControls() {
  document.querySelector("#statcast-season").innerHTML = Array.from({ length: lastSeason - firstSeason + 1 }, (_, index) => {
    const year = lastSeason - index;
    return `<option value="${year}">${year}</option>`;
  }).join("");
  document.querySelector("#statcast-season").value = activeSeason;
  document.querySelector("#statcast-metric").innerHTML = metrics[activeType].map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
  document.querySelector("#statcast-metric").value = activeMetric;
  document.querySelector(".statcast-sample-filter label").textContent = `Minimum ${sampleLabel()}`;
  document.querySelector("#statcast-sample-min").innerHTML = [
    ["auto", `Auto (${autoSampleMinimum()}+)`],
    ["all", "All"],
    ["25", "25+"],
    ["50", "50+"],
    ["100", "100+"],
    ["250", "250+"],
    ["500", "500+"]
  ].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  document.querySelector("#statcast-sample-min").value = activeSampleMin;
  document.querySelector("#statcast-count-note").textContent = `${activeSampleMinimum() ? `${activeSampleMinimum()}+ ${sampleLabel()}` : `All ${sampleLabel()}`} sample`;
  document.querySelectorAll("[data-statcast-type]").forEach((button) => button.classList.toggle("active", button.dataset.statcastType === activeType));
}

function renderSummary() {
  const data = filteredRows();
  const leader = data[0];
  const teamLabel = activeTeam === "all" ? "All MLB" : document.querySelector("#statcast-team").selectedOptions[0]?.textContent || activeTeam;
  document.querySelector("#statcast-leader").textContent = leader ? leader.name : "No players";
  document.querySelector("#statcast-leader-note").textContent = leader ? `${leader.team} | ${metricLabel()} ${fmtStat(activeMetric, leader[activeMetric])}` : "Try another filter";
  document.querySelector("#statcast-metric-card").textContent = metricLabel();
  document.querySelector("#statcast-scope-card").textContent = activeSeason;
  document.querySelector("#statcast-scope-note").textContent = teamLabel;
  document.querySelector("#statcast-count").textContent = data.length;
  document.querySelector("#statcast-count-note").textContent = `${activeSampleMinimum() ? `${activeSampleMinimum()}+ ${sampleLabel()}` : `All ${sampleLabel()}`} sample`;
  document.querySelector("#statcast-chart-title").textContent = `${metricLabel()} ${activeType === "batter" ? "hitter" : "pitcher"} leaders`;
  document.querySelector("#statcast-table-title").textContent = `${teamLabel} ${metricLabel()} Statcast ${activeType === "batter" ? "hitters" : "pitchers"}`;
}

function renderChart() {
  const data = filteredRows().slice(0, 8);
  const max = Math.max(...data.map((row) => Math.abs(toNumber(row[activeMetric]))), 1);
  document.querySelector("#statcast-chart").innerHTML = data.map((row) => `
    <div class="bar-row">
      <div class="bar-label">
        <a class="chart-player-link" href="${baseballReferenceSearchUrl(row.name)}" target="_blank" rel="noopener noreferrer"><strong>${row.name}</strong></a>
        <span>${row.team}${row.position ? ` | ${row.position}` : ""} | ${fmtStat("sample", row.sample)} ${sampleLabel()}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, Math.abs(toNumber(row[activeMetric])) / max * 100)}%"></div></div>
      <div class="bar-value">${fmtStat(activeMetric, row[activeMetric])}</div>
    </div>
  `).join("") || `<div class="empty-state">No players match this filter.</div>`;
}

function renderTableHead() {
  const columns = [["name", "Player"], ["team", "Team"], ["sample", activeType === "batter" ? "PA" : "BF"], ...metrics[activeType]];
  document.querySelector("#statcast-head").innerHTML = `<tr>${columns.map(([key, label]) => `<th data-sort="${key}">${label}</th>`).join("")}</tr>`;
  document.querySelectorAll("#statcast-head th[data-sort]").forEach((header) => {
    header.addEventListener("click", () => {
      const key = header.dataset.sort;
      const metricKeys = metrics[activeType].map(([metric]) => metric);
      if (metricKeys.includes(key)) {
        activeMetric = key;
        document.querySelector("#statcast-metric").value = activeMetric;
      }
      activeSort = activeSort.key === key ? { key, dir: activeSort.dir * -1 } : { key, dir: sortDirection(key) };
      renderAll();
    });
  });
}

function renderTable() {
  const columns = [["sample", "Sample"], ...metrics[activeType]];
  document.querySelector("#statcast-table").innerHTML = filteredRows().slice(0, 100).map((row) => `
    <tr>
      <td>
        <a class="player-link" href="${baseballReferenceSearchUrl(row.name)}" target="_blank" rel="noopener noreferrer">
          <span class="avatar">${initials(row.name)}</span>
          <span>${row.name}</span>
        </a>
      </td>
      <td>${row.team}</td>
      ${columns.map(([key]) => `<td>${fmtStat(key, row[key])}</td>`).join("")}
    </tr>
  `).join("") || `<tr><td colspan="11" class="empty-row">No players match this filter.</td></tr>`;
}

function renderAll() {
  renderSummary();
  renderChart();
  renderTableHead();
  renderTable();
}

async function loadStatcast() {
  document.querySelector("#statcast-status").textContent = "Loading...";
  document.querySelector("#statcast-chart").innerHTML = `<div class="empty-state">Loading Baseball Savant data...</div>`;
  try {
    const response = await fetch(apiUrl());
    if (!response.ok) throw new Error(`Statcast function returned ${response.status}`);
    const data = await response.json();
    rows = data.rows || [];
    renderTeamOptions();
    renderAll();
    document.querySelector("#statcast-status").textContent = `${rows.length} players loaded`;
  } catch (error) {
    rows = [];
    renderTeamOptions();
    document.querySelector("#statcast-status").textContent = "Live Statcast feed unavailable";
    document.querySelector("#statcast-chart").innerHTML = `<div class="empty-state">Live Statcast data loads on the Netlify site. Localhost cannot run this function.</div>`;
    document.querySelector("#statcast-table").innerHTML = `<tr><td colspan="11" class="empty-row">Live Statcast data loads on the Netlify site.</td></tr>`;
  }
}

function bindEvents() {
  document.querySelector("#statcast-season").addEventListener("change", (event) => {
    activeSeason = event.target.value;
    renderControls();
    loadStatcast();
  });
  document.querySelector("#statcast-team").addEventListener("change", (event) => {
    activeTeam = event.target.value;
    renderAll();
  });
  document.querySelector("#statcast-metric").addEventListener("change", (event) => {
    activeMetric = event.target.value;
    activeSort = { key: activeMetric, dir: sortDirection(activeMetric) };
    renderAll();
  });
  document.querySelector("#statcast-sample-min").addEventListener("change", (event) => {
    activeSampleMin = event.target.value;
    renderAll();
  });
  document.querySelectorAll("[data-statcast-type]").forEach((button) => {
    button.addEventListener("click", () => {
      activeType = button.dataset.statcastType;
      activeMetric = metrics[activeType][0][0];
      activeSort = { key: activeMetric, dir: sortDirection(activeMetric) };
      renderControls();
      loadStatcast();
    });
  });
  document.querySelector("#statcast-search").addEventListener("input", renderAll);
}

renderControls();
bindEvents();
loadStatcast();
