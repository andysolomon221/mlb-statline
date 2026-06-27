const firstStartSeason = 1901;
const lastStartSeason = 2026;
const startsCache = new Map();
const numberFormat = new Intl.NumberFormat("en-US");

let activeGroup = "hitting";
let activeMetric = "homeRuns";
let activeSeasonCount = 2;
let activeSeasonRule = "all";
let activeTeam = "all";
let activeRange = { start: 1901, end: 2026 };
let activeRequestId = 0;
let lastRenderedRows = [];

const teamOptions = [
  ["all", "All MLB"],
  ["ARI", "Arizona Diamondbacks"],
  ["ATH", "Athletics"],
  ["ATL", "Atlanta Braves"],
  ["BAL", "Baltimore Orioles"],
  ["BOS", "Boston Red Sox"],
  ["CHC", "Chicago Cubs"],
  ["CWS", "Chicago White Sox"],
  ["CIN", "Cincinnati Reds"],
  ["CLE", "Cleveland Guardians"],
  ["COL", "Colorado Rockies"],
  ["DET", "Detroit Tigers"],
  ["HOU", "Houston Astros"],
  ["KC", "Kansas City Royals"],
  ["LAA", "Los Angeles Angels"],
  ["LAD", "Los Angeles Dodgers"],
  ["MIA", "Miami Marlins"],
  ["MIL", "Milwaukee Brewers"],
  ["MIN", "Minnesota Twins"],
  ["NYM", "New York Mets"],
  ["NYY", "New York Yankees"],
  ["PHI", "Philadelphia Phillies"],
  ["PIT", "Pittsburgh Pirates"],
  ["SD", "San Diego Padres"],
  ["SEA", "Seattle Mariners"],
  ["SF", "San Francisco Giants"],
  ["STL", "St. Louis Cardinals"],
  ["TB", "Tampa Bay Rays"],
  ["TEX", "Texas Rangers"],
  ["TOR", "Toronto Blue Jays"],
  ["WSH", "Washington Nationals"]
];

const teamAliases = {
  ATH: ["ATH", "OAK", "PHA", "ATHLETICS", "OAKLAND", "KANSAS CITY ATHLETICS", "PHILADELPHIA ATHLETICS"],
  ATL: ["ATL", "MLN", "BSN", "BRAVES", "MILWAUKEE BRAVES", "BOSTON BRAVES"],
  BAL: ["BAL", "SLB", "ORIOLES", "BROWNS", "ST. LOUIS BROWNS"],
  BOS: ["BOS", "RED SOX", "AMERICANS"],
  LAD: ["LAD", "LA", "BRO", "BRK", "DODGERS", "BROOKLYN DODGERS"],
  SF: ["SF", "SFG", "NYG", "GIANTS", "NEW YORK GIANTS"],
  MIN: ["MIN", "WS1", "SENATORS", "TWINS", "WASHINGTON SENATORS"],
  TEX: ["TEX", "WS2", "RANGERS", "WASHINGTON SENATORS"],
  WSH: ["WSH", "MON", "EXPOS", "NATIONALS", "MONTREAL EXPOS"],
  LAA: ["LAA", "ANA", "CAL", "ANGELS"],
  MIA: ["MIA", "FLA", "MARLINS", "FLORIDA MARLINS"],
  MIL: ["MIL", "SEATTLE PILOTS", "PILOTS", "BREWERS"],
  TB: ["TB", "TBD", "RAYS", "DEVIL RAYS"],
  CWS: ["CWS", "CHW", "WHITE SOX"],
  CHC: ["CHC", "CUBS"],
  NYY: ["NYY", "YANKEES"],
  NYM: ["NYM", "METS"],
  PHI: ["PHI", "PHILLIES"],
  PIT: ["PIT", "PIRATES"],
  CIN: ["CIN", "REDS"],
  CLE: ["CLE", "IND", "GUARDIANS", "INDIANS"],
  DET: ["DET", "TIGERS"],
  HOU: ["HOU", "ASTROS"],
  KC: ["KC", "KCR", "ROYALS"],
  SD: ["SD", "SDP", "PADRES"],
  SEA: ["SEA", "MARINERS"],
  STL: ["STL", "CARDINALS"],
  TOR: ["TOR", "BLUE JAYS"],
  ARI: ["ARI", "DIAMONDBACKS"],
  COL: ["COL", "ROCKIES"]
};

const metricConfig = {
  hitting: {
    label: "hitting",
    sortMap: {
      homeRuns: "homeRuns",
      hits: "hits",
      rbi: "rbi",
      stolenBases: "stolenBases",
      strikeOuts: "strikeOuts"
    },
    metrics: [
      ["homeRuns", "HR"],
      ["hits", "Hits"],
      ["rbi", "RBI"],
      ["stolenBases", "SB"],
      ["strikeOuts", "SO"]
    ],
    columns: [
      ["name", "Player"],
      ["teams", "Clubs"],
      ["seasonLabel", "Seasons"],
      ["seasonCount", "Count"],
      ["gamesPlayed", "G"],
      ["plateAppearances", "PA"],
      ["atBats", "AB"],
      ["hits", "H"],
      ["homeRuns", "HR"],
      ["stolenBases", "SB"],
      ["rbi", "RBI"],
      ["strikeOuts", "SO"]
    ]
  },
  pitching: {
    label: "pitching",
    sortMap: {
      strikeOuts: "strikeOuts",
      wins: "wins",
      saves: "saves",
      gamesStarted: "gamesStarted",
      inningsPitched: "inningsPitched"
    },
    metrics: [
      ["strikeOuts", "SO"],
      ["wins", "Wins"],
      ["saves", "Saves"],
      ["gamesStarted", "GS"],
      ["inningsPitched", "IP"]
    ],
    columns: [
      ["name", "Player"],
      ["teams", "Clubs"],
      ["seasonLabel", "Seasons"],
      ["seasonCount", "Count"],
      ["gamesPlayed", "G"],
      ["gamesStarted", "GS"],
      ["inningsPitched", "IP"],
      ["wins", "W"],
      ["losses", "L"],
      ["saves", "SV"],
      ["strikeOuts", "SO"]
    ]
  }
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function inningsToOuts(value) {
  const [whole, partial = "0"] = String(value || "0").split(".");
  return (Number(whole) || 0) * 3 + (Number(partial) || 0);
}

function outsToInnings(outs) {
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

function fmtStat(key, value) {
  const numeric = Number(value);
  if (key === "name" || key === "teams" || key === "seasonLabel") return escapeHtml(value || "-");
  if (!Number.isFinite(numeric)) return "-";
  if (key === "inningsPitched") return outsToInnings(numeric);
  return numberFormat.format(Math.round(numeric));
}

function initials(name) {
  return String(name || "").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function baseballReferenceSearchUrl(name) {
  return `https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(name)}`;
}

function yearOptions() {
  const years = [];
  for (let year = lastStartSeason; year >= firstStartSeason; year -= 1) {
    years.push(`<option value="${year}">${year}</option>`);
  }
  return years.join("");
}

function populateControls() {
  const years = yearOptions();
  document.querySelector("#starts-start").innerHTML = years;
  document.querySelector("#starts-end").innerHTML = years;
  document.querySelector("#starts-start").value = activeRange.start;
  document.querySelector("#starts-end").value = activeRange.end;
  document.querySelector("#starts-team").innerHTML = teamOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  document.querySelector("#starts-team").value = activeTeam;
  document.querySelector("#starts-count").innerHTML = Array.from({ length: 20 }, (_, index) => {
    const value = index + 1;
    return `<option value="${value}">${value}</option>`;
  }).join("");
  document.querySelector("#starts-count").value = activeSeasonCount;
  document.querySelector("#starts-season-rule").value = activeSeasonRule;
  updateMetricControls();
}

function updateMetricControls() {
  const config = metricConfig[activeGroup];
  document.querySelector("#starts-stat").innerHTML = config.metrics.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  if (!config.metrics.some(([value]) => value === activeMetric)) activeMetric = config.metrics[0][0];
  document.querySelector("#starts-stat").value = activeMetric;
}

function readControls() {
  activeGroup = document.querySelector("#starts-group").value;
  activeMetric = document.querySelector("#starts-stat").value;
  activeSeasonCount = Number(document.querySelector("#starts-count").value);
  activeSeasonRule = document.querySelector("#starts-season-rule").value;
  activeTeam = document.querySelector("#starts-team").value;
  activeRange = {
    start: Number(document.querySelector("#starts-start").value),
    end: Number(document.querySelector("#starts-end").value)
  };
}

function careerStartBounds() {
  const low = Math.min(activeRange.start, activeRange.end);
  const high = Math.max(activeRange.start, activeRange.end);
  return { low, high };
}

function yearList() {
  const { high } = careerStartBounds();
  const low = firstStartSeason;
  return Array.from({ length: high - low + 1 }, (_, index) => low + index);
}

function metricLabel(metric = activeMetric) {
  return metricConfig[activeGroup].metrics.find(([value]) => value === metric)?.[1] || metric.toUpperCase();
}

function teamLabel() {
  return teamOptions.find(([value]) => value === activeTeam)?.[1] || "All MLB";
}

function questionLabel() {
  const teamText = activeTeam === "all" ? "MLB" : teamLabel();
  const ruleText = activeSeasonRule === "qualified" ? " meaningful" : "";
  return `Most ${metricLabel()} in first ${activeSeasonCount}${ruleText} career season${activeSeasonCount === 1 ? "" : "s"}, ${teamText}`;
}

function searchUrl(year) {
  const config = metricConfig[activeGroup];
  const params = new URLSearchParams({
    stats: "season",
    group: activeGroup,
    season: String(year),
    playerPool: "ALL",
    limit: "5000",
    hydrate: "team",
    sortStat: config.sortMap[activeMetric] || config.sortMap[config.metrics[0][0]]
  });
  return `https://statsapi.mlb.com/api/v1/stats?${params.toString()}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`MLB Stats API returned ${response.status}`);
  return response.json();
}

async function fetchSeason(year) {
  const cacheKey = `${activeGroup}:${year}`;
  if (startsCache.has(cacheKey)) return startsCache.get(cacheKey);
  const data = await fetchJson(searchUrl(year));
  const rows = data.stats?.[0]?.splits || [];
  startsCache.set(cacheKey, rows);
  return rows;
}

async function fetchInBatches(items, mapper, size = 4, onProgress = () => {}) {
  const results = [];
  for (let index = 0; index < items.length; index += size) {
    const batch = items.slice(index, index + size);
    results.push(...(await Promise.all(batch.map(mapper))));
    onProgress(Math.min(items.length, index + size), items.length);
  }
  return results;
}

function splitTeamTokens(split) {
  return [
    split.team?.abbreviation,
    split.team?.teamName,
    split.team?.name,
    split.team?.shortName
  ].filter(Boolean).map((value) => String(value).toUpperCase());
}

function teamMatches(split) {
  if (activeTeam === "all") return true;
  const aliases = teamAliases[activeTeam] || [activeTeam];
  const tokens = splitTeamTokens(split);
  return tokens.some((token) => aliases.some((alias) => {
    const normalizedAlias = String(alias).toUpperCase();
    if (token === normalizedAlias) return true;
    return normalizedAlias.length > 3 && token.includes(normalizedAlias);
  }));
}

function teamAbbr(split) {
  return split.team?.abbreviation || split.team?.teamName || split.team?.name || "MLB";
}

function emptySeason(split) {
  return {
    playerId: String(split.player?.id || split.player?.fullName || ""),
    name: split.player?.fullName || "Unknown Player",
    season: Number(split.season),
    teams: new Set(),
    matchedTeam: false,
    sampleGamesPlayed: 0,
    sampleGamesStarted: 0,
    samplePlateAppearances: 0,
    sampleIpOuts: 0,
    gamesPlayed: 0,
    gamesStarted: 0,
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    homeRuns: 0,
    stolenBases: 0,
    rbi: 0,
    strikeOuts: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    ipOuts: 0
  };
}

function addSplitToSeason(row, split, includeStats) {
  const stat = split.stat || {};
  const isTeamMatch = teamMatches(split);
  if (includeStats) row.teams.add(teamAbbr(split));
  if (isTeamMatch) row.matchedTeam = true;
  row.sampleGamesPlayed += toNumber(stat.gamesPlayed);
  row.sampleGamesStarted += toNumber(stat.gamesStarted);
  row.samplePlateAppearances += toNumber(stat.plateAppearances);
  row.sampleIpOuts += toNumber(stat.outs) || inningsToOuts(stat.inningsPitched);
  if (!includeStats) return;
  row.gamesPlayed += toNumber(stat.gamesPlayed);
  row.gamesStarted += toNumber(stat.gamesStarted);
  row.plateAppearances += toNumber(stat.plateAppearances);
  row.atBats += toNumber(stat.atBats);
  row.hits += toNumber(stat.hits);
  row.homeRuns += toNumber(stat.homeRuns);
  row.stolenBases += toNumber(stat.stolenBases);
  row.rbi += toNumber(stat.rbi);
  row.strikeOuts += toNumber(stat.strikeOuts);
  row.wins += toNumber(stat.wins);
  row.losses += toNumber(stat.losses);
  row.saves += toNumber(stat.saves);
  row.ipOuts += toNumber(stat.outs) || inningsToOuts(stat.inningsPitched);
}

function buildSeasonRows(seasonSplits) {
  const seasonsByPlayer = new Map();
  seasonSplits.flat().forEach((split) => {
    const id = String(split.player?.id || split.player?.fullName || "");
    const season = Number(split.season);
    if (!id || !season) return;
    if (!seasonsByPlayer.has(id)) seasonsByPlayer.set(id, new Map());
    const bySeason = seasonsByPlayer.get(id);
    const row = bySeason.get(season) || emptySeason(split);
    addSplitToSeason(row, split, activeTeam === "all" || teamMatches(split));
    bySeason.set(season, row);
  });
  return seasonsByPlayer;
}

function isCountableCareerStartSeason(season) {
  if (activeSeasonRule !== "qualified") return true;
  if (activeGroup === "pitching") return season.sampleIpOuts >= 60 || season.sampleGamesStarted >= 5;
  return season.samplePlateAppearances >= 100;
}

function emptyAggregate(season) {
  return {
    id: season.playerId,
    name: season.name,
    teams: new Set(),
    seasons: new Set(),
    seasonCount: 0,
    gamesPlayed: 0,
    gamesStarted: 0,
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    homeRuns: 0,
    stolenBases: 0,
    rbi: 0,
    strikeOuts: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    ipOuts: 0
  };
}

function addSeasonToAggregate(row, season) {
  season.teams.forEach((team) => row.teams.add(team));
  row.seasons.add(season.season);
  row.seasonCount += 1;
  row.gamesPlayed += season.gamesPlayed;
  row.gamesStarted += season.gamesStarted;
  row.plateAppearances += season.plateAppearances;
  row.atBats += season.atBats;
  row.hits += season.hits;
  row.homeRuns += season.homeRuns;
  row.stolenBases += season.stolenBases;
  row.rbi += season.rbi;
  row.strikeOuts += season.strikeOuts;
  row.wins += season.wins;
  row.losses += season.losses;
  row.saves += season.saves;
  row.ipOuts += season.ipOuts;
}

function finalizeRow(row) {
  const seasons = Array.from(row.seasons).map(Number).filter(Boolean).sort((a, b) => a - b);
  row.teams = Array.from(row.teams).slice(0, 4).join("/");
  row.seasonLabel = seasons.length
    ? seasons[0] === seasons[seasons.length - 1] ? String(seasons[0]) : `${seasons[0]}-${seasons[seasons.length - 1]}`
    : "-";
  row.inningsPitched = row.ipOuts;
  return row;
}

function aggregateRows(seasonSplits) {
  const { low, high } = careerStartBounds();
  const seasonsByPlayer = buildSeasonRows(seasonSplits);
  const rows = [];
  seasonsByPlayer.forEach((bySeason) => {
    const allSeasons = Array.from(bySeason.values())
      .sort((a, b) => a.season - b.season)
      .filter(isCountableCareerStartSeason);
    const careerStart = allSeasons[0]?.season;
    if (!careerStart || careerStart < low || careerStart > high) return;
    const firstSeasons = allSeasons.slice(0, activeSeasonCount);
    const countedSeasons = activeTeam === "all" ? firstSeasons : firstSeasons.filter((season) => season.matchedTeam);
    if (!countedSeasons.length) return;
    const row = emptyAggregate(countedSeasons[0]);
    countedSeasons.forEach((season) => addSeasonToAggregate(row, season));
    rows.push(finalizeRow(row));
  });
  return rows;
}

function sortRows(rows) {
  return rows.slice().sort((a, b) => {
    const diff = toNumber(b[activeMetric]) - toNumber(a[activeMetric]);
    if (diff) return diff;
    return String(a.name).localeCompare(b.name);
  });
}

function renderHead() {
  const columns = metricConfig[activeGroup].columns;
  document.querySelector("#starts-head").innerHTML = `
    <tr>${columns.map(([, label]) => `<th>${label}</th>`).join("")}</tr>
  `;
}

function renderRows(rows) {
  const columns = metricConfig[activeGroup].columns;
  document.querySelector("#starts-table").innerHTML = rows.slice(0, 50).map((row) => `
    <tr>
      ${columns.map(([key]) => {
        if (key === "name") {
          return `<td><a class="player-link" href="${baseballReferenceSearchUrl(row.name)}" target="_blank" rel="noopener noreferrer"><span class="avatar">${initials(row.name)}</span><span>${escapeHtml(row.name)}</span></a></td>`;
        }
        return `<td>${fmtStat(key, row[key])}</td>`;
      }).join("")}
    </tr>
  `).join("") || `<tr><td colspan="${columns.length}" class="empty-row">No players match this career-start question.</td></tr>`;
}

function startsChartMeta(row) {
  const pieces = [
    row.teams,
    row.seasonLabel,
    `${row.seasonCount} season${row.seasonCount === 1 ? "" : "s"}`
  ].filter(Boolean);
  return pieces.join(" | ");
}

function renderStartsChart(rows) {
  lastRenderedRows = rows;
  const chart = document.querySelector("#starts-bar-chart");
  const title = document.querySelector("#starts-chart-title");
  if (!chart || !title) return;
  title.textContent = `${questionLabel()} leaders`;
  if (!rows.length) {
    chart.innerHTML = `<div class="empty-state">No players match this career-start question.</div>`;
    return;
  }
  const limit = Number(document.querySelector("#starts-chart-size")?.value || 10);
  const visibleRows = rows.slice(0, limit);
  const maxValue = Math.max(...visibleRows.map((row) => Math.abs(toNumber(row[activeMetric]))), 1);
  chart.innerHTML = visibleRows.map((row) => {
    const value = toNumber(row[activeMetric]);
    const percent = Math.max(8, (Math.abs(value) / maxValue) * 100);
    return `
      <div class="bar-row age-bar-row">
        <div class="bar-label">
          <a class="chart-player-link" href="${baseballReferenceSearchUrl(row.name)}" target="_blank" rel="noopener noreferrer">
            <strong>${escapeHtml(row.name)}</strong>
            <span>${escapeHtml(startsChartMeta(row))}</span>
          </a>
        </div>
        <div class="bar-track" aria-hidden="true">
          <div class="bar-fill" style="width:${percent.toFixed(1)}%"></div>
        </div>
        <div class="bar-value">${fmtStat(activeMetric, row[activeMetric])}</div>
      </div>
    `;
  }).join("");
}

function renderSummary(rows, allRows = rows) {
  const leader = rows[0];
  const { low, high } = careerStartBounds();
  const years = low === high ? `careers starting ${low}` : `careers starting ${low}-${high}`;
  document.querySelector("#starts-question").textContent = questionLabel();
  const ruleText = activeSeasonRule === "qualified"
    ? activeGroup === "pitching" ? "20+ IP or 5+ GS seasons" : "100+ PA seasons"
    : "all MLB seasons";
  document.querySelector("#starts-question-note").textContent = `${activeGroup === "pitching" ? "Pitchers" : "Hitters"}, ${teamLabel()}, ${years}, ${ruleText}`;
  document.querySelector("#starts-player-count").textContent = numberFormat.format(rows.length);
  document.querySelector("#starts-leader-name").textContent = leader?.name || "--";
  document.querySelector("#starts-leader-note").textContent = leader ? `${metricLabel()}: ${fmtStat(activeMetric, leader[activeMetric])}` : `${numberFormat.format(allRows.length)} raw players checked`;
}

async function runStartsSearch() {
  readControls();
  const requestId = ++activeRequestId;
  const years = yearList();
  const status = document.querySelector("#starts-status");
  document.querySelector("#starts-progress").textContent = "Loading";
  document.querySelector("#starts-progress-note").textContent = `${years.length} seasons requested`;
  status.textContent = `Loading ${years.length} seasons from MLB Stats API...`;
  renderHead();
  document.querySelector("#starts-table").innerHTML = `<tr><td colspan="${metricConfig[activeGroup].columns.length}" class="empty-row">Loading career-start leaders...</td></tr>`;
  document.querySelector("#starts-bar-chart").innerHTML = `<div class="empty-state">Loading first-seasons leaders...</div>`;

  try {
    const payloads = await fetchInBatches(years, fetchSeason, 4, (done, total) => {
      if (requestId !== activeRequestId) return;
      document.querySelector("#starts-progress").textContent = `${done}/${total}`;
      status.textContent = `Loaded ${done} of ${total} seasons...`;
    });
    if (requestId !== activeRequestId) return;
    const allRows = aggregateRows(payloads);
    const rows = sortRows(allRows);
    renderRows(rows);
    renderStartsChart(rows);
    renderSummary(rows, allRows);
    document.querySelector("#starts-table-title").textContent = `${questionLabel()} leaders`;
    document.querySelector("#starts-progress").textContent = "Done";
    document.querySelector("#starts-progress-note").textContent = `${numberFormat.format(allRows.length)} players checked`;
    status.textContent = `Showing top ${Math.min(50, rows.length)} of ${numberFormat.format(rows.length)} players.`;
  } catch (error) {
    if (requestId !== activeRequestId) return;
    document.querySelector("#starts-progress").textContent = "Error";
    document.querySelector("#starts-progress-note").textContent = "Could not load MLB data";
    status.textContent = "Could not load career-start leaders. Try a smaller season range or try again.";
    document.querySelector("#starts-table").innerHTML = `<tr><td colspan="${metricConfig[activeGroup].columns.length}" class="empty-row">Could not load career-start leaders.</td></tr>`;
    document.querySelector("#starts-bar-chart").innerHTML = `<div class="empty-state">Could not load career-start leaders.</div>`;
  }
}

function applyExample(name) {
  const examples = {
    "athletics-hr-2": { group: "hitting", metric: "homeRuns", seasons: 2, team: "ATH", start: 1901, end: 2026 },
    "redsox-hits-3": { group: "hitting", metric: "hits", seasons: 3, team: "BOS", start: 1901, end: 2026 },
    "mlb-hr-2": { group: "hitting", metric: "homeRuns", seasons: 2, team: "all", start: 1901, end: 2026 },
    "pitcher-so-5": { group: "pitching", metric: "strikeOuts", seasons: 5, team: "all", start: 1901, end: 2026 }
  };
  const example = examples[name];
  if (!example) return;
  activeGroup = example.group;
  activeMetric = example.metric;
  activeSeasonCount = example.seasons;
  activeSeasonRule = "all";
  activeTeam = example.team;
  activeRange = { start: example.start, end: example.end };
  document.querySelector("#starts-group").value = activeGroup;
  updateMetricControls();
  document.querySelector("#starts-stat").value = activeMetric;
  document.querySelector("#starts-count").value = activeSeasonCount;
  document.querySelector("#starts-season-rule").value = activeSeasonRule;
  document.querySelector("#starts-team").value = activeTeam;
  document.querySelector("#starts-start").value = activeRange.start;
  document.querySelector("#starts-end").value = activeRange.end;
  runStartsSearch();
}

function init() {
  populateControls();
  renderHead();
  renderSummary([], []);
  document.querySelector("#starts-group").addEventListener("change", (event) => {
    activeGroup = event.target.value;
    updateMetricControls();
    renderHead();
  });
  document.querySelector("#starts-run").addEventListener("click", runStartsSearch);
  document.querySelector("#starts-chart-size").addEventListener("change", () => renderStartsChart(lastRenderedRows));
  document.querySelectorAll("[data-starts-example]").forEach((button) => {
    button.addEventListener("click", () => applyExample(button.dataset.startsExample));
  });
}

init();
