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
let activeMode = "single";
let activeSeason = "2026";
let activeRangeStart = "1990";
let activeRangeEnd = "1999";
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
      ["atBats", "AB"],
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
      ["inningsPitched", "IP"],
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
  if (["plateAppearances", "battersFaced", "atBats"].includes(key)) return Math.round(number).toLocaleString("en-US");
  if (key === "inningsPitched") return String(value);
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

function scopeSeason() {
  return activeMode === "range" ? activeRangeEnd : activeSeason;
}

function scopeLabel() {
  return activeMode === "range" ? `${activeRangeStart}-${activeRangeEnd}` : activeSeason;
}

function yearsInScope() {
  if (activeMode === "single") return [activeSeason];
  const start = Math.min(Number(activeRangeStart), Number(activeRangeEnd));
  const end = Math.max(Number(activeRangeStart), Number(activeRangeEnd));
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

function statsUrl(season = activeSeason) {
  const params = new URLSearchParams({
    stats: "seasonAdvanced",
    group: activeType,
    playerPool: activeTeamId === "all" ? "qualified" : "all",
    season,
    sportIds: "1",
    limit: "500"
  });
  if (activeLeague !== "all") params.set("leagueIds", leagueIds[activeLeague]);
  if (activeTeamId !== "all") params.set("teamIds", activeTeamId);
  return `https://statsapi.mlb.com/api/v1/stats?${params.toString()}`;
}

function basicStatsUrl(season = activeSeason) {
  const params = new URLSearchParams({
    stats: "season",
    group: activeType,
    playerPool: activeTeamId === "all" ? "qualified" : "all",
    season,
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
    season: scopeSeason(),
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

function inningsToOuts(value) {
  const [whole = "0", partial = "0"] = String(value || "0").split(".");
  return (Number(whole) || 0) * 3 + (Number(partial) || 0);
}

function outsToInnings(outs) {
  const whole = Math.floor(outs / 3);
  const partial = outs % 3;
  return `${whole}.${partial}`;
}

function mapBasicStats(data) {
  return new Map((data.stats?.[0]?.splits || []).map((split) => [
    String(split.player?.id),
    activeType === "hitting"
      ? {
          atBats: toNumber(split.stat?.atBats),
          plateAppearances: toNumber(split.stat?.plateAppearances)
        }
      : {
          inningsPitched: split.stat?.inningsPitched || "0.0",
          inningsOuts: inningsToOuts(split.stat?.inningsPitched)
        }
  ]));
}

async function updateTeams() {
  const cacheKey = `${activeLeague}:${scopeSeason()}`;
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
  const cacheKey = [activeType, activeMode, activeLeague, activeTeamId, scopeLabel()].join(":");
  try {
    if (playerCache.has(cacheKey)) {
      rows = playerCache.get(cacheKey);
    } else {
      const seasonRows = await Promise.all(yearsInScope().map(fetchSeasonRows));
      rows = activeMode === "range" ? aggregateRangeRows(seasonRows.flat()) : seasonRows.flat();
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

async function fetchSeasonRows(season) {
  const [data, basicData] = await Promise.all([fetchJson(statsUrl(season)), fetchJson(basicStatsUrl(season))]);
  const basicByPlayer = mapBasicStats(basicData);
  return (data.stats?.[0]?.splits || []).map((split) => ({
    ...mapRow(split),
    season,
    ...(basicByPlayer.get(String(split.player?.id)) || {})
  }));
}

function metricWeight(row) {
  if (activeType === "pitching") return row.inningsOuts || inningsToOuts(row.inningsPitched);
  return toNumber(row.plateAppearances) || toNumber(row.atBats) || 1;
}

function aggregateRangeRows(sourceRows) {
  const byPlayer = new Map();
  const keys = new Set([...config().metrics.map(([key]) => key), ...config().columns.map(([key]) => key)]);
  sourceRows.forEach((row) => {
    const id = String(row.id || row.name);
    if (!byPlayer.has(id)) {
      byPlayer.set(id, {
        id: row.id,
        name: row.name,
        teamSet: new Set(),
        position: row.position,
        atBats: 0,
        plateAppearances: 0,
        inningsOuts: 0,
        metricTotals: {}
      });
    }
    const aggregate = byPlayer.get(id);
    if (row.team && row.team !== "MLB") aggregate.teamSet.add(row.team);
    aggregate.position = aggregate.position || row.position;
    aggregate.atBats += toNumber(row.atBats);
    aggregate.plateAppearances += toNumber(row.plateAppearances);
    aggregate.inningsOuts += row.inningsOuts || inningsToOuts(row.inningsPitched);
    const weight = metricWeight(row);
    keys.forEach((key) => {
      if (row[key] === undefined || row[key] === null || row[key] === "") return;
      const value = toNumber(row[key]);
      if (!Number.isFinite(value) || key === "atBats" || key === "plateAppearances" || key === "inningsPitched") return;
      if (!aggregate.metricTotals[key]) aggregate.metricTotals[key] = { weighted: 0, weight: 0 };
      aggregate.metricTotals[key].weighted += value * weight;
      aggregate.metricTotals[key].weight += weight;
    });
  });

  return Array.from(byPlayer.values()).map((aggregate) => {
    const teamList = Array.from(aggregate.teamSet);
    const row = {
      id: aggregate.id,
      name: aggregate.name,
      team: teamList.length ? teamList.slice(0, 3).join("/") + (teamList.length > 3 ? "+" : "") : "MLB",
      teamName: teamList.length ? teamList.join(", ") : "MLB",
      position: aggregate.position,
      atBats: aggregate.atBats,
      plateAppearances: aggregate.plateAppearances,
      inningsPitched: outsToInnings(aggregate.inningsOuts),
      inningsOuts: aggregate.inningsOuts
    };
    Object.entries(aggregate.metricTotals).forEach(([key, total]) => {
      row[key] = total.weight ? total.weighted / total.weight : 0;
    });
    return row;
  });
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
  document.querySelectorAll("[data-advanced-mode]").forEach((button) => button.classList.toggle("active", button.dataset.advancedMode === activeMode));
  document.querySelectorAll("[data-advanced-league]").forEach((button) => button.classList.toggle("active", button.dataset.advancedLeague === activeLeague));
  document.querySelector(".advanced-season-control").dataset.activeMode = activeMode;
  document.querySelector(".advanced-quick-ranges").hidden = activeMode !== "range";
  document.querySelectorAll("[data-advanced-start]").forEach((button) => {
    button.classList.toggle("active", button.dataset.advancedStart === activeRangeStart && button.dataset.advancedEnd === activeRangeEnd);
  });
}

function renderSummary() {
  const data = sortedRows();
  const leader = data[0];
  document.querySelector("#advanced-leader").textContent = leader ? leader.name : "No players";
  document.querySelector("#advanced-leader-note").textContent = leader ? `${leader.team} | ${metricLabel()} ${fmtStat(activeMetric, leader[activeMetric])}` : "Try another filter";
  document.querySelector("#advanced-metric-card").textContent = metricLabel();
  document.querySelector("#advanced-scope-card").textContent = scopeLabel();
  document.querySelector("#advanced-scope-note").textContent = activeTeamId === "all" ? (activeLeague === "all" ? "All MLB" : activeLeague.toUpperCase()) : activeTeamName;
  document.querySelector("#advanced-count").textContent = data.length;
  document.querySelector("#advanced-count-note").textContent = activeMode === "range" ? "Weighted range pool" : (activeTeamId === "all" ? "Qualified pool" : "Team player pool");
  document.querySelector("#advanced-chart-title").textContent = `${metricLabel()} ${activeType === "hitting" ? "hitter" : "pitcher"} leaders`;
  document.querySelector("#advanced-table-title").textContent = `${activeTeamId === "all" ? scopeLabel() : activeTeamName} ${metricLabel()} advanced ${config().label}`;
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
  const options = Array.from({ length: lastSeason - firstSeason + 1 }, (_, index) => {
    const year = lastSeason - index;
    return `<option value="${year}">${year}</option>`;
  }).join("");
  document.querySelector("#advanced-season").innerHTML = options;
  document.querySelector("#advanced-range-start").innerHTML = options;
  document.querySelector("#advanced-range-end").innerHTML = options;
  document.querySelector("#advanced-season").value = activeSeason;
  document.querySelector("#advanced-range-start").value = activeRangeStart;
  document.querySelector("#advanced-range-end").value = activeRangeEnd;
}

function bindEvents() {
  document.querySelector("#advanced-season").addEventListener("change", (event) => {
    activeSeason = event.target.value;
    updateTeams().then(updatePlayers);
  });
  document.querySelector("#advanced-range-start").addEventListener("change", (event) => {
    activeRangeStart = event.target.value;
    updateTeams().then(updatePlayers);
  });
  document.querySelector("#advanced-range-end").addEventListener("change", (event) => {
    activeRangeEnd = event.target.value;
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
  document.querySelectorAll("[data-advanced-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      activeMode = button.dataset.advancedMode;
      renderControls();
      updateTeams().then(updatePlayers);
    });
  });
  document.querySelectorAll("[data-advanced-start]").forEach((button) => {
    button.addEventListener("click", () => {
      activeMode = "range";
      activeRangeStart = button.dataset.advancedStart;
      activeRangeEnd = button.dataset.advancedEnd;
      document.querySelector("#advanced-range-start").value = activeRangeStart;
      document.querySelector("#advanced-range-end").value = activeRangeEnd;
      renderControls();
      updateTeams().then(updatePlayers);
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
