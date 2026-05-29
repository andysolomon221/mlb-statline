const firstSeason = 1901;
const lastSeason = 2026;
const leagueIds = { al: "103", nl: "104" };
const playerCache = new Map();
const standingsCache = new Map();
const teamAbbr = {
  "Arizona Diamondbacks": "ARI",
  "D-backs": "ARI",
  "Diamondbacks": "ARI",
  "Atlanta Braves": "ATL",
  "Braves": "ATL",
  "Baltimore Orioles": "BAL",
  "Orioles": "BAL",
  "Boston Red Sox": "BOS",
  "Red Sox": "BOS",
  "Chicago Cubs": "CHC",
  "Cubs": "CHC",
  "Chicago White Sox": "CWS",
  "White Sox": "CWS",
  "Cincinnati Reds": "CIN",
  "Reds": "CIN",
  "Cleveland Guardians": "CLE",
  "Guardians": "CLE",
  "Colorado Rockies": "COL",
  "Rockies": "COL",
  "Detroit Tigers": "DET",
  "Tigers": "DET",
  "Houston Astros": "HOU",
  "Astros": "HOU",
  "Kansas City Royals": "KC",
  "Royals": "KC",
  "Los Angeles Angels": "LAA",
  "Angels": "LAA",
  "Los Angeles Dodgers": "LAD",
  "Dodgers": "LAD",
  "Miami Marlins": "MIA",
  "Marlins": "MIA",
  "Milwaukee Brewers": "MIL",
  "Brewers": "MIL",
  "Minnesota Twins": "MIN",
  "Twins": "MIN",
  "New York Mets": "NYM",
  "Mets": "NYM",
  "New York Yankees": "NYY",
  "Yankees": "NYY",
  "Athletics": "ATH",
  "Oakland Athletics": "ATH",
  "Philadelphia Phillies": "PHI",
  "Phillies": "PHI",
  "Pittsburgh Pirates": "PIT",
  "Pirates": "PIT",
  "San Diego Padres": "SD",
  "Padres": "SD",
  "San Francisco Giants": "SF",
  "Giants": "SF",
  "Seattle Mariners": "SEA",
  "Mariners": "SEA",
  "St. Louis Cardinals": "STL",
  "Cardinals": "STL",
  "Tampa Bay Rays": "TB",
  "Rays": "TB",
  "Texas Rangers": "TEX",
  "Rangers": "TEX",
  "Toronto Blue Jays": "TOR",
  "Blue Jays": "TOR",
  "Washington Nationals": "WSH",
  "Nationals": "WSH"
};

let activeType = "hitting";
let activeSeason = "2026";
let activeLeague = "all";
let pendingTeamAbbr = new URLSearchParams(window.location.search).get("team") || "";
let activeTeamId = "all";
let activeTeamName = "All MLB";
let activeMetric = "iso";
let activeSort = { key: "iso", dir: -1 };
let rows = [];
let teams = [];

const metricConfig = {
  hitting: {
    label: "hitters",
    metrics: [
      ["iso", "ISO"],
      ["babip", "BABIP"],
      ["strikeoutsPerPlateAppearance", "K%"],
      ["walksPerPlateAppearance", "BB%"],
      ["pitchesPerPlateAppearance", "P/PA"],
      ["walksPerStrikeout", "BB/K"],
      ["homeRunsPerPlateAppearance", "HR/PA"]
    ],
    columns: [
      ["iso", "ISO"],
      ["babip", "BABIP"],
      ["strikeoutsPerPlateAppearance", "K%"],
      ["walksPerPlateAppearance", "BB%"],
      ["pitchesPerPlateAppearance", "P/PA"],
      ["walksPerStrikeout", "BB/K"],
      ["plateAppearances", "PA"]
    ],
    lowerBetter: ["strikeoutsPerPlateAppearance"]
  },
  pitching: {
    label: "pitchers",
    metrics: [
      ["strikeoutsPer9", "K/9"],
      ["baseOnBallsPer9", "BB/9"],
      ["homeRunsPer9", "HR/9"],
      ["strikeoutsMinusWalksPercentage", "K-BB%"],
      ["whiffPercentage", "Whiff%"],
      ["strikePercentage", "Strike%"],
      ["ops", "OPS Against"],
      ["babip", "BABIP"]
    ],
    columns: [
      ["strikeoutsPer9", "K/9"],
      ["baseOnBallsPer9", "BB/9"],
      ["homeRunsPer9", "HR/9"],
      ["strikeoutsMinusWalksPercentage", "K-BB%"],
      ["whiffPercentage", "Whiff%"],
      ["strikePercentage", "Strike%"],
      ["ops", "OPS"]
    ],
    lowerBetter: ["baseOnBallsPer9", "homeRunsPer9", "ops", "babip"]
  }
};

function config() {
  return metricConfig[activeType];
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function metricLabel(key = activeMetric) {
  return config().metrics.find(([metric]) => metric === key)?.[1] || key.toUpperCase();
}

function sortDirection(key) {
  return config().lowerBetter.includes(key) ? 1 : -1;
}

function fmtStat(key, value) {
  if (value === undefined || value === null || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  const percentKeys = ["strikeoutsPerPlateAppearance", "walksPerPlateAppearance", "homeRunsPerPlateAppearance", "strikeoutsMinusWalksPercentage", "whiffPercentage", "flyBallPercentage", "strikePercentage"];
  if (["plateAppearances", "battersFaced"].includes(key)) return Math.round(number).toLocaleString("en-US");
  if (percentKeys.includes(key)) return `${(number * 100).toFixed(1)}%`;
  if (["iso", "babip", "ops"].includes(key)) return number.toFixed(3).replace(/^0/, "");
  return number.toFixed(2);
}

function baseballReferenceSearchUrl(name) {
  return `https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(name)}`;
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request returned ${response.status}`);
  return response.json();
}

function statsUrl() {
  const params = new URLSearchParams({
    stats: "seasonAdvanced",
    group: activeType,
    playerPool: activeTeamId === "all" ? "qualified" : "all",
    season: activeSeason,
    sportIds: "1",
    limit: "500"
  });
  if (activeLeague !== "all") params.set("leagueIds", leagueIds[activeLeague]);
  if (activeTeamId !== "all") params.set("teamIds", activeTeamId);
  return `https://statsapi.mlb.com/api/v1/stats?${params.toString()}`;
}

function standingsUrl() {
  const params = new URLSearchParams({
    leagueId: activeLeague === "all" ? "103,104" : leagueIds[activeLeague],
    season: activeSeason,
    standingsTypes: "regularSeason"
  });
  return `https://statsapi.mlb.com/api/v1/standings?${params.toString()}`;
}

function normalizePosition(value) {
  return ["LF", "CF", "RF"].includes(value) ? "OF" : value || "P";
}

function mapRow(split) {
  const stat = split.stat || {};
  return {
    id: split.player?.id,
    name: split.player?.fullName || "Unknown",
    team: split.team?.abbreviation || teamAbbr[split.team?.name] || split.team?.name || "MLB",
    teamName: split.team?.name || split.team?.abbreviation || "MLB",
    position: normalizePosition(split.position?.abbreviation || ""),
    ...stat
  };
}

async function updateTeams() {
  const cacheKey = `${activeLeague}:${activeSeason}`;
  if (standingsCache.has(cacheKey)) {
    teams = standingsCache.get(cacheKey);
  } else {
    const data = await fetchJson(standingsUrl());
    teams = (data.records || []).flatMap((division) => division.teamRecords || []).map((record) => ({
      id: record.team?.id || record.team?.name,
      name: record.team?.name || "Unknown",
      abbr: record.team?.abbreviation || teamAbbr[record.team?.name] || record.team?.teamCode?.toUpperCase() || ""
    }));
    standingsCache.set(cacheKey, teams);
  }
  renderTeamOptions();
}

function renderTeamOptions() {
  const select = document.querySelector("#advanced-team");
  if (pendingTeamAbbr) {
    const requestedTeam = teams.find((team) => team.abbr === pendingTeamAbbr.toUpperCase());
    if (requestedTeam) {
      activeTeamId = String(requestedTeam.id);
      activeTeamName = requestedTeam.name;
    }
    pendingTeamAbbr = "";
  }
  select.innerHTML = `<option value="all">All teams</option>${teams
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((team) => `<option value="${team.id}">${team.name}</option>`)
    .join("")}`;
  if (activeTeamId !== "all" && !teams.some((team) => String(team.id) === String(activeTeamId))) {
    activeTeamId = "all";
    activeTeamName = "All MLB";
  }
  select.value = activeTeamId;
}

async function updatePlayers() {
  document.querySelector("#advanced-status").textContent = "Loading...";
  document.querySelector("#advanced-chart").innerHTML = `<div class="empty-state">Loading advanced stats...</div>`;
  const cacheKey = [activeType, activeLeague, activeTeamId, activeSeason].join(":");
  try {
    if (playerCache.has(cacheKey)) {
      rows = playerCache.get(cacheKey);
    } else {
      const data = await fetchJson(statsUrl());
      rows = (data.stats?.[0]?.splits || []).map(mapRow);
      playerCache.set(cacheKey, rows);
    }
    renderAll();
    document.querySelector("#advanced-status").textContent = `${rows.length} players loaded`;
  } catch (error) {
    rows = [];
    document.querySelector("#advanced-status").textContent = "Source unavailable";
    document.querySelector("#advanced-chart").innerHTML = `<div class="empty-state">Could not load MLB advanced stats.</div>`;
    document.querySelector("#advanced-table").innerHTML = `<tr><td colspan="9" class="empty-row">Could not load MLB advanced stats.</td></tr>`;
  }
}

function sortedRows() {
  const query = document.querySelector("#advanced-search").value.trim().toLowerCase();
  return rows
    .filter((row) => !query || `${row.name} ${row.team} ${row.teamName}`.toLowerCase().includes(query))
    .sort((a, b) => (toNumber(a[activeSort.key]) - toNumber(b[activeSort.key])) * activeSort.dir);
}

function renderControls() {
  document.querySelector("#advanced-metric").innerHTML = config().metrics.map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
  document.querySelector("#advanced-metric").value = activeMetric;
  document.querySelectorAll("[data-advanced-type]").forEach((button) => button.classList.toggle("active", button.dataset.advancedType === activeType));
  document.querySelectorAll("[data-advanced-league]").forEach((button) => button.classList.toggle("active", button.dataset.advancedLeague === activeLeague));
}

function renderSummary() {
  const data = sortedRows();
  const leader = data[0];
  document.querySelector("#advanced-leader").textContent = leader ? leader.name : "No players";
  document.querySelector("#advanced-leader-note").textContent = leader ? `${leader.team} | ${metricLabel()} ${fmtStat(activeMetric, leader[activeMetric])}` : "Try another filter";
  document.querySelector("#advanced-metric-card").textContent = metricLabel();
  document.querySelector("#advanced-scope-card").textContent = activeSeason;
  document.querySelector("#advanced-scope-note").textContent = activeTeamId === "all" ? (activeLeague === "all" ? "All MLB" : activeLeague.toUpperCase()) : activeTeamName;
  document.querySelector("#advanced-count").textContent = data.length;
  document.querySelector("#advanced-count-note").textContent = activeTeamId === "all" ? "Qualified pool" : "Team player pool";
  document.querySelector("#advanced-chart-title").textContent = `${metricLabel()} ${activeType === "hitting" ? "hitter" : "pitcher"} leaders`;
  document.querySelector("#advanced-table-title").textContent = `${activeTeamId === "all" ? activeSeason : activeTeamName} ${metricLabel()} advanced ${config().label}`;
}

function renderChart() {
  const data = sortedRows().slice(0, 8);
  const max = Math.max(...data.map((row) => Math.abs(toNumber(row[activeMetric]))), 1);
  document.querySelector("#advanced-chart").innerHTML = data.map((row) => `
    <div class="bar-row">
      <div class="bar-label">
        <a class="chart-player-link" href="${baseballReferenceSearchUrl(row.name)}" target="_blank" rel="noopener noreferrer"><strong>${row.name}</strong></a>
        <span>${row.team} | ${row.position}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, Math.abs(toNumber(row[activeMetric])) / max * 100)}%"></div></div>
      <div class="bar-value">${fmtStat(activeMetric, row[activeMetric])}</div>
    </div>
  `).join("") || `<div class="empty-state">No players match this filter.</div>`;
}

function renderTableHead() {
  const columns = [["name", "Player"], ["team", "Team"], ["position", "Pos"], ...config().columns];
  document.querySelector("#advanced-head").innerHTML = `<tr>${columns.map(([key, label]) => `<th data-sort="${key}">${label}</th>`).join("")}</tr>`;
  document.querySelectorAll("#advanced-head th[data-sort]").forEach((header) => {
    header.addEventListener("click", () => {
      const key = header.dataset.sort;
      const metricKeys = config().metrics.map(([metric]) => metric);
      if (metricKeys.includes(key)) {
        activeMetric = key;
        document.querySelector("#advanced-metric").value = activeMetric;
      }
      activeSort = activeSort.key === key ? { key, dir: activeSort.dir * -1 } : { key, dir: sortDirection(key) };
      renderAll();
    });
  });
}

function renderTable() {
  const columns = [["position", "Pos"], ...config().columns];
  document.querySelector("#advanced-table").innerHTML = sortedRows().slice(0, 100).map((row) => `
    <tr>
      <td>
        <a class="player-link" href="${baseballReferenceSearchUrl(row.name)}" target="_blank" rel="noopener noreferrer">
          <span class="avatar">${initials(row.name)}</span>
          <span>${row.name}</span>
        </a>
      </td>
      <td>${row.team}</td>
      ${columns.map(([key]) => `<td>${key === "position" ? row.position : fmtStat(key, row[key])}</td>`).join("")}
    </tr>
  `).join("") || `<tr><td colspan="10" class="empty-row">No players match this filter.</td></tr>`;
}

function renderAll() {
  renderSummary();
  renderChart();
  renderTableHead();
  renderTable();
}

function populateSeasonSelect() {
  document.querySelector("#advanced-season").innerHTML = Array.from({ length: lastSeason - firstSeason + 1 }, (_, index) => {
    const year = lastSeason - index;
    return `<option value="${year}">${year}</option>`;
  }).join("");
  document.querySelector("#advanced-season").value = activeSeason;
}

function bindEvents() {
  document.querySelector("#advanced-season").addEventListener("change", (event) => {
    activeSeason = event.target.value;
    updateTeams().then(updatePlayers);
  });
  document.querySelector("#advanced-team").addEventListener("change", (event) => {
    activeTeamId = event.target.value;
    activeTeamName = event.target.selectedOptions[0]?.textContent || "All MLB";
    updatePlayers();
  });
  document.querySelector("#advanced-metric").addEventListener("change", (event) => {
    activeMetric = event.target.value;
    activeSort = { key: activeMetric, dir: sortDirection(activeMetric) };
    renderAll();
  });
  document.querySelectorAll("[data-advanced-type]").forEach((button) => {
    button.addEventListener("click", () => {
      activeType = button.dataset.advancedType;
      activeMetric = config().metrics[0][0];
      activeSort = { key: activeMetric, dir: sortDirection(activeMetric) };
      renderControls();
      updatePlayers();
    });
  });
  document.querySelectorAll("[data-advanced-league]").forEach((button) => {
    button.addEventListener("click", () => {
      activeLeague = button.dataset.advancedLeague;
      activeTeamId = "all";
      activeTeamName = "All MLB";
      renderControls();
      updateTeams().then(updatePlayers);
    });
  });
  document.querySelector("#advanced-search").addEventListener("input", renderAll);
}

populateSeasonSelect();
renderControls();
bindEvents();
updateTeams().then(updatePlayers);
