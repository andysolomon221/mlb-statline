const firstSeason = 1901;
const lastSeason = 2026;
const leagueIds = { al: "103", nl: "104" };
const playerCache = new Map();
const standingsCache = new Map();

let activeType = "hitting";
let activeSeason = "2026";
let activeMode = "single";
let activeRange = { start: 2023, end: 2026 };
let activeLeague = "all";
let activeTeamId = "all";
let activeTeamName = "All MLB";
let activePosition = "all";
let activePool = "regular";
let activeCategory = "hr";
let activeSort = { key: "hr", dir: -1 };
let activeRequestId = 0;
let rows = [];
let teams = [];

const numberFormat = new Intl.NumberFormat("en-US");
const categoryConfig = {
  hitting: {
    defaultCategory: "hr",
    categories: [
      ["hr", "HR"],
      ["rbi", "RBI"],
      ["runs", "R"],
      ["sb", "SB"],
      ["avg", "AVG"],
      ["ops", "OPS"]
    ],
    columns: [
      ["runs", "R"],
      ["hr", "HR"],
      ["rbi", "RBI"],
      ["sb", "SB"],
      ["avg", "AVG"],
      ["ops", "OPS"]
    ],
    rateStats: ["avg", "ops"],
    lowerBetter: [],
    qualifier: { regular: 100, deep: 40, all: 0 },
    positions: [
      ["all", "All hitters"],
      ["C", "C"],
      ["1B", "1B"],
      ["2B", "2B"],
      ["3B", "3B"],
      ["SS", "SS"],
      ["OF", "OF"],
      ["DH", "DH"]
    ]
  },
  pitching: {
    defaultCategory: "strikeouts",
    categories: [
      ["wins", "W"],
      ["saves", "SV"],
      ["strikeouts", "SO"],
      ["era", "ERA"],
      ["whip", "WHIP"]
    ],
    columns: [
      ["wins", "W"],
      ["saves", "SV"],
      ["strikeouts", "SO"],
      ["era", "ERA"],
      ["whip", "WHIP"],
      ["innings", "IP"]
    ],
    rateStats: ["era", "whip"],
    lowerBetter: ["era", "whip"],
    qualifier: { regular: 120, deep: 45, all: 0 },
    positions: [
      ["all", "All pitchers"],
      ["SP", "SP"],
      ["RP", "RP"]
    ]
  }
};

function config() {
  return categoryConfig[activeType];
}

function baseballReferenceSearchUrl(name) {
  return `https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(name)}`;
}

function fmtStat(key, value) {
  if (value === undefined || value === null || value === "") return "-";
  if (["avg", "ops"].includes(key)) return Number(value).toFixed(3).replace(/^0/, "");
  if (["era", "whip"].includes(key)) return Number(value).toFixed(2);
  if (key === "innings") return value;
  return numberFormat.format(Math.round(Number(value) || 0));
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("");
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function inningsToOuts(value) {
  const [whole, fraction = "0"] = String(value || "0").split(".");
  return (Number(whole) || 0) * 3 + (Number(fraction) || 0);
}

function outsToInnings(outs) {
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

function yearList(start, end) {
  const low = Math.min(Number(start), Number(end));
  const high = Math.max(Number(start), Number(end));
  return Array.from({ length: high - low + 1 }, (_, index) => low + index);
}

function currentYears() {
  return activeMode === "single" ? [Number(activeSeason)] : yearList(activeRange.start, activeRange.end);
}

function currentScopeLabel() {
  if (activeMode === "single") return activeSeason;
  return activeRange.start === activeRange.end ? String(activeRange.start) : `${activeRange.start}-${activeRange.end}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`MLB Stats API returned ${response.status}`);
  return response.json();
}

function statsUrl(year) {
  const sortMap = {
    hr: "homeRuns",
    runs: "runs",
    rbi: "rbi",
    sb: "stolenBases",
    avg: "avg",
    ops: "ops",
    wins: "wins",
    saves: "saves",
    strikeouts: "strikeOuts",
    era: "era",
    whip: "whip"
  };
  const params = new URLSearchParams({
    stats: "season",
    group: activeType,
    season: String(year),
    playerPool: "ALL",
    limit: "5000",
    sortStat: sortMap[activeCategory] || sortMap[config().defaultCategory],
    hydrate: "team"
  });
  if (activeLeague !== "all") params.set("leagueIds", leagueIds[activeLeague]);
  if (activeTeamId !== "all") params.set("teamIds", activeTeamId);
  return `https://statsapi.mlb.com/api/v1/stats?${params.toString()}`;
}

async function fetchSeasonPlayers(year) {
  const cacheKey = [activeType, activeLeague, activeTeamId, year].join(":");
  if (playerCache.has(cacheKey)) return playerCache.get(cacheKey);
  const data = await fetchJson(statsUrl(year));
  const players = (data.stats?.[0]?.splits || []).map(mapPlayer).filter((player) => player.qualifier > 0);
  playerCache.set(cacheKey, players);
  return players;
}

function mapPlayer(split) {
  const stat = split.stat || {};
  const common = {
    id: split.player?.id || split.player?.fullName,
    name: split.player?.fullName || "Unknown Player",
    team: split.team?.abbreviation || split.team?.teamName || "MLB",
    teamName: split.team?.teamName || split.team?.name || split.team?.abbreviation || "MLB",
    position: normalizePosition(split.position?.abbreviation || split.position?.type || ""),
    seasons: 1
  };
  if (activeType === "pitching") {
    const outs = inningsToOuts(stat.inningsPitched);
    const gamesStarted = toNumber(stat.gamesStarted);
    const gamesPitched = toNumber(stat.gamesPitched) || toNumber(stat.gamesPlayed);
    return {
      ...common,
      position: gamesStarted >= Math.max(1, gamesPitched / 2) ? "SP" : "RP",
      wins: toNumber(stat.wins),
      saves: toNumber(stat.saves),
      strikeouts: toNumber(stat.strikeOuts),
      era: toNumber(stat.era),
      whip: toNumber(stat.whip),
      hits: toNumber(stat.hits),
      walks: toNumber(stat.baseOnBalls),
      earnedRuns: toNumber(stat.earnedRuns),
      gamesStarted,
      gamesPitched,
      outs,
      innings: outsToInnings(outs),
      qualifier: outs
    };
  }
  return {
    ...common,
    runs: toNumber(stat.runs),
    hr: toNumber(stat.homeRuns),
    rbi: toNumber(stat.rbi),
    sb: toNumber(stat.stolenBases),
    avg: toNumber(stat.avg),
    ops: toNumber(stat.ops),
    hits: toNumber(stat.hits),
    atBats: toNumber(stat.atBats),
    walks: toNumber(stat.baseOnBalls),
    hbp: toNumber(stat.hitByPitch),
    sacFlies: toNumber(stat.sacFlies),
    totalBases: toNumber(stat.totalBases),
    qualifier: toNumber(stat.plateAppearances)
  };
}

function normalizePosition(position) {
  const clean = String(position || "").toUpperCase();
  if (["LF", "CF", "RF", "OF"].includes(clean)) return "OF";
  if (["P", "SP"].includes(clean) || clean.includes("START")) return "SP";
  if (["RP", "CP"].includes(clean) || clean.includes("RELIEF") || clean.includes("CLOSER")) return "RP";
  if (["C", "1B", "2B", "3B", "SS", "DH"].includes(clean)) return clean;
  return clean || "UTIL";
}

async function currentPlayers() {
  const seasons = await Promise.all(currentYears().map(fetchSeasonPlayers));
  if (activeMode === "single") return seasons[0].slice();

  const byPlayer = new Map();
  seasons.flat().forEach((player) => {
    const key = player.id || player.name;
    const existing = byPlayer.get(key) || {
      id: player.id,
      name: player.name,
      teams: new Map(),
      teamNames: new Map(),
      positions: new Map(),
      seasons: 0,
      qualifier: 0,
      runs: 0,
      hr: 0,
      rbi: 0,
      sb: 0,
      hits: 0,
      atBats: 0,
      walks: 0,
      hbp: 0,
      sacFlies: 0,
      totalBases: 0,
      wins: 0,
      saves: 0,
      strikeouts: 0,
      earnedRuns: 0,
      outs: 0
    };
    existing.seasons += 1;
    existing.qualifier += player.qualifier || 0;
    existing.teams.set(player.team, (existing.teams.get(player.team) || 0) + (player.qualifier || 1));
    existing.teamNames.set(player.teamName || player.team, (existing.teamNames.get(player.teamName || player.team) || 0) + (player.qualifier || 1));
    existing.positions.set(player.position, (existing.positions.get(player.position) || 0) + (player.qualifier || 1));
    ["runs", "hr", "rbi", "sb", "hits", "atBats", "walks", "hbp", "sacFlies", "totalBases", "wins", "saves", "strikeouts", "earnedRuns", "outs"].forEach((keyName) => {
      existing[keyName] += player[keyName] || 0;
    });
    byPlayer.set(key, existing);
  });

  return Array.from(byPlayer.values()).map((player) => {
    const team = Array.from(player.teams.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "MLB";
    const teamName = Array.from(player.teamNames.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || team;
    const position = Array.from(player.positions.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "UTIL";
    if (activeType === "pitching") {
      return {
        ...player,
        team,
        teamName,
        position,
        era: player.outs ? (player.earnedRuns * 27) / player.outs : 0,
        whip: player.outs ? ((player.hits + player.walks) * 3) / player.outs : 0,
        innings: outsToInnings(player.outs)
      };
    }
    const obpDenominator = player.atBats + player.walks + player.hbp + player.sacFlies;
    const obp = obpDenominator ? (player.hits + player.walks + player.hbp) / obpDenominator : 0;
    const slg = player.atBats ? player.totalBases / player.atBats : 0;
    return {
      ...player,
      team,
      teamName,
      position,
      avg: player.atBats ? player.hits / player.atBats : 0,
      ops: obp + slg
    };
  });
}

function qualifiedRows() {
  const positionQualifier = activeType === "pitching" && (activePosition === "RP" || activeCategory === "saves")
    ? { regular: 30, deep: 10, all: 0 }
    : config().qualifier;
  const threshold = positionQualifier[activePool] * currentYears().length;
  return rows.filter((player) => player.qualifier >= threshold && (activePosition === "all" || player.position === activePosition));
}

function sortDirection(key = activeCategory) {
  return config().lowerBetter.includes(key) ? 1 : -1;
}

function sortedRows() {
  return qualifiedRows().slice().sort((a, b) => {
    const av = a[activeSort.key];
    const bv = b[activeSort.key];
    if (typeof av === "string") return av.localeCompare(bv) * activeSort.dir;
    return (av - bv) * activeSort.dir;
  });
}

function categoryLabel(key = activeCategory) {
  return config().categories.find(([category]) => category === key)?.[1] || key.toUpperCase();
}

function draftNote(player) {
  if (activeType === "hitting") {
    if (activeCategory === "hr") return `${fmtStat("hr", player.hr)} HR power with ${fmtStat("rbi", player.rbi)} RBI.`;
    if (activeCategory === "rbi") return `${fmtStat("rbi", player.rbi)} RBI profile with ${fmtStat("hr", player.hr)} HR support.`;
    if (activeCategory === "runs") return `${fmtStat("runs", player.runs)} runs with ${fmtStat("ops", player.ops)} OPS context.`;
    if (activeCategory === "sb") return `${fmtStat("sb", player.sb)} steals with ${fmtStat("runs", player.runs)} runs.`;
    if (activeCategory === "avg") return `${fmtStat("avg", player.avg)} average over ${fmtStat("atBats", player.atBats)} AB.`;
    return `${fmtStat("ops", player.ops)} OPS with ${fmtStat("hr", player.hr)} HR.`;
  }
  if (activeCategory === "era") return `${fmtStat("era", player.era)} ERA over ${fmtStat("innings", player.innings)} IP.`;
  if (activeCategory === "whip") return `${fmtStat("whip", player.whip)} WHIP with ${fmtStat("strikeouts", player.strikeouts)} SO.`;
  if (activeCategory === "saves") return `${fmtStat("saves", player.saves)} saves with ${fmtStat("whip", player.whip)} WHIP.`;
  if (activeCategory === "wins") return `${fmtStat("wins", player.wins)} wins with ${fmtStat("era", player.era)} ERA.`;
  return `${fmtStat("strikeouts", player.strikeouts)} strikeouts over ${fmtStat("innings", player.innings)} IP.`;
}

function renderLoading() {
  document.querySelector("#fantasy-chart").innerHTML = `<div class="empty-state">Loading fantasy board...</div>`;
  document.querySelector("#fantasy-table").innerHTML = `<tr><td colspan="9" class="empty-row">Loading fantasy board...</td></tr>`;
  document.querySelector("#fantasy-note-list").innerHTML = `<div class="empty-state">Loading draft notes...</div>`;
}

function renderControls() {
  document.querySelectorAll("[data-fantasy-type]").forEach((button) => {
    button.classList.toggle("active", button.dataset.fantasyType === activeType);
  });
  document.querySelectorAll("[data-fantasy-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.fantasyMode === activeMode);
  });
  document.querySelectorAll("[data-fantasy-league]").forEach((button) => {
    button.classList.toggle("active", button.dataset.fantasyLeague === activeLeague);
  });
  document.querySelectorAll("[data-fantasy-range-start]").forEach((button) => {
    const matches = Number(button.dataset.fantasyRangeStart) === activeRange.start && Number(button.dataset.fantasyRangeEnd) === activeRange.end;
    button.classList.toggle("active", activeMode === "range" && matches);
  });
  document.querySelector("#fantasy-season").value = activeSeason;
  document.querySelector("#fantasy-range-start").value = activeRange.start;
  document.querySelector("#fantasy-range-end").value = activeRange.end;
  document.querySelector("#fantasy-range-start-value").textContent = activeRange.start;
  document.querySelector("#fantasy-range-end-value").textContent = activeRange.end;
  document.querySelector("#fantasy-category").innerHTML = config().categories.map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
  document.querySelector("#fantasy-category").value = activeCategory;
  document.querySelector("#fantasy-position").innerHTML = config().positions.map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
  document.querySelector("#fantasy-position").value = config().positions.some(([key]) => key === activePosition) ? activePosition : "all";
  document.querySelector("#fantasy-pool").value = activePool;
  document.querySelector("#fantasy-scope-title").textContent = activeMode === "single" ? "Single-season fantasy board" : "Multi-year fantasy board";
  document.querySelector("#fantasy-data-note").textContent = `${activeType === "hitting" ? "Hitter" : "Pitcher"} categories load from MLB Stats API for ${currentScopeLabel()}.`;
}

function renderTeamOptions() {
  const select = document.querySelector("#fantasy-team");
  const options = teams
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((team) => `<option value="${team.id}">${team.name}</option>`)
    .join("");
  select.innerHTML = `<option value="all">All teams</option>${options}`;
  const valid = teams.some((team) => String(team.id) === String(activeTeamId));
  if (activeTeamId !== "all" && !valid) {
    activeTeamId = "all";
    activeTeamName = "All MLB";
  }
  select.value = activeTeamId;
}

function renderSummary() {
  const data = sortedRows();
  const leader = data[0];
  document.querySelector("#fantasy-top-player").textContent = leader ? leader.name : "No players";
  document.querySelector("#fantasy-top-note").textContent = leader ? `${leader.team} | ${categoryLabel()} ${fmtStat(activeCategory, leader[activeCategory])}` : "Try another filter";
  document.querySelector("#fantasy-category-card").textContent = categoryLabel();
  document.querySelector("#fantasy-category-note").textContent = activeType === "hitting" ? "Hitter category" : "Pitcher category";
  document.querySelector("#fantasy-scope-card").textContent = currentScopeLabel();
  const positionLabel = config().positions.find(([key]) => key === activePosition)?.[1] || "All positions";
  document.querySelector("#fantasy-scope-note").textContent = `${activeTeamId === "all" ? (activeLeague === "all" ? "All MLB" : activeLeague.toUpperCase()) : activeTeamName} | ${positionLabel}`;
  document.querySelector("#fantasy-pool-card").textContent = numberFormat.format(data.length);
  document.querySelector("#fantasy-pool-note").textContent = `${activePool} pool`;
}

function renderChart() {
  const data = sortedRows().slice(0, 7);
  const values = data.map((player) => Number(player[activeCategory]) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const lowerBetter = config().lowerBetter.includes(activeCategory);
  document.querySelector("#fantasy-chart-title").textContent = `${currentScopeLabel()} ${categoryLabel()} targets`;
  document.querySelector("#fantasy-chart").innerHTML = data.map((player) => {
    const score = lowerBetter ? max + min - player[activeCategory] : player[activeCategory];
    const width = Math.max(8, (score / Math.max(...values.map((value) => lowerBetter ? max + min - value : value), 1)) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label">
          <a class="chart-player-link" href="${baseballReferenceSearchUrl(player.name)}" target="_blank" rel="noopener noreferrer">
            <strong>${player.name}</strong>
          </a>
          <span>${player.team}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
        <div class="bar-value">${fmtStat(activeCategory, player[activeCategory])}</div>
      </div>
    `;
  }).join("") || `<div class="empty-state">No players match this fantasy filter.</div>`;
}

function renderTableHead() {
  document.querySelector("#fantasy-head").innerHTML = `
    <tr>
      <th data-fantasy-sort="name">Player</th>
      <th data-fantasy-sort="team">Club</th>
      ${config().columns.map(([key, label]) => `<th data-fantasy-sort="${key}">${label}</th>`).join("")}
      <th>Draft Note</th>
    </tr>
  `;
  document.querySelectorAll("[data-fantasy-sort]").forEach((heading) => {
    heading.addEventListener("click", () => {
      const key = heading.dataset.fantasySort;
      activeSort = { key, dir: activeSort.key === key ? activeSort.dir * -1 : (config().lowerBetter.includes(key) ? 1 : -1) };
      renderAll();
    });
  });
}

function renderTable() {
  const query = document.querySelector("#fantasy-search").value.trim().toLowerCase();
  const data = sortedRows().filter((player) => `${player.name} ${player.team} ${player.teamName}`.toLowerCase().includes(query));
  document.querySelector("#fantasy-table-title").textContent = `${activeTeamId === "all" ? currentScopeLabel() : `${activeTeamName}, ${currentScopeLabel()}`} fantasy targets`;
  document.querySelector("#fantasy-table").innerHTML = data.map((player) => `
    <tr>
      <td>
        <a class="player-link" href="${baseballReferenceSearchUrl(player.name)}" target="_blank" rel="noopener noreferrer">
          <span class="avatar">${initials(player.name)}</span>
          <span>${player.name}</span>
        </a>
      </td>
      <td>${player.team}</td>
      ${config().columns.map(([key]) => `<td>${fmtStat(key, player[key])}</td>`).join("")}
      <td class="fantasy-note-cell">${draftNote(player)}</td>
    </tr>
  `).join("") || `<tr><td colspan="9" class="empty-row">No players match this fantasy filter.</td></tr>`;
}

function renderNotes() {
  const data = sortedRows().slice(0, 4);
  document.querySelector("#fantasy-note-list").innerHTML = data.map((player) => `
    <article class="fantasy-note-card">
      <strong>${player.name}</strong>
      <span>${player.team} | ${draftNote(player)}</span>
    </article>
  `).join("") || `<div class="empty-state">No draft notes available.</div>`;
}

function renderAll() {
  renderControls();
  renderSummary();
  renderChart();
  renderTableHead();
  renderTable();
  renderNotes();
}

async function updatePlayers() {
  const requestId = ++activeRequestId;
  renderLoading();
  try {
    rows = await currentPlayers();
    if (requestId !== activeRequestId) return;
    activeSort = { key: activeCategory, dir: sortDirection(activeCategory) };
    renderAll();
  } catch (error) {
    if (requestId !== activeRequestId) return;
    document.querySelector("#fantasy-chart").innerHTML = `<div class="empty-state">Could not load MLB fantasy data.</div>`;
    document.querySelector("#fantasy-table").innerHTML = `<tr><td colspan="9" class="empty-row">Could not load MLB fantasy data.</td></tr>`;
    document.querySelector("#fantasy-note-list").innerHTML = `<div class="empty-state">Could not load draft notes.</div>`;
  }
}

function standingsUrl(year) {
  const params = new URLSearchParams({
    leagueId: activeLeague === "all" ? "103,104" : leagueIds[activeLeague],
    season: String(year),
    standingsTypes: "regularSeason"
  });
  return `https://statsapi.mlb.com/api/v1/standings?${params.toString()}`;
}

async function updateTeams() {
  const year = activeMode === "single" ? activeSeason : activeRange.end;
  const cacheKey = `${activeLeague}:${year}`;
  if (standingsCache.has(cacheKey)) {
    teams = standingsCache.get(cacheKey);
    renderTeamOptions();
    return;
  }
  const data = await fetchJson(standingsUrl(year));
  teams = (data.records || []).flatMap((division) => division.teamRecords || []).map((record) => ({
    id: record.team?.id || record.team?.name,
    name: record.team?.name || "Unknown"
  }));
  standingsCache.set(cacheKey, teams);
  renderTeamOptions();
}

function setActiveRange(start, end) {
  activeMode = "range";
  activeRange = {
    start: Math.min(Number(start), Number(end)),
    end: Math.max(Number(start), Number(end))
  };
  renderControls();
  updateTeams().then(updatePlayers);
}

function populateSeasonSelect() {
  const select = document.querySelector("#fantasy-season");
  const options = Array.from({ length: lastSeason - firstSeason + 1 }, (_, index) => {
    const year = lastSeason - index;
    return `<option value="${year}">${year}</option>`;
  }).join("");
  select.innerHTML = options;
  select.value = activeSeason;
}

function bindEvents() {
  document.querySelectorAll("[data-fantasy-type]").forEach((button) => {
    button.addEventListener("click", () => {
      activeType = button.dataset.fantasyType;
      activeCategory = config().defaultCategory;
      activePosition = "all";
      activeSort = { key: activeCategory, dir: sortDirection(activeCategory) };
      renderControls();
      updatePlayers();
    });
  });
  document.querySelector("#fantasy-season").addEventListener("change", (event) => {
    activeSeason = event.target.value;
    activeMode = "single";
    renderControls();
    updateTeams().then(updatePlayers);
  });
  document.querySelectorAll("[data-fantasy-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      activeMode = button.dataset.fantasyMode;
      renderControls();
      updateTeams().then(updatePlayers);
    });
  });
  document.querySelector("#fantasy-range-start").addEventListener("input", (event) => {
    setActiveRange(event.target.value, activeRange.end);
  });
  document.querySelector("#fantasy-range-end").addEventListener("input", (event) => {
    setActiveRange(activeRange.start, event.target.value);
  });
  document.querySelectorAll("[data-fantasy-range-start]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveRange(button.dataset.fantasyRangeStart, button.dataset.fantasyRangeEnd);
    });
  });
  document.querySelectorAll("[data-fantasy-league]").forEach((button) => {
    button.addEventListener("click", () => {
      activeLeague = button.dataset.fantasyLeague;
      activeTeamId = "all";
      activeTeamName = "All MLB";
      renderControls();
      updateTeams().then(updatePlayers);
    });
  });
  document.querySelector("#fantasy-team").addEventListener("change", (event) => {
    activeTeamId = event.target.value;
    activeTeamName = event.target.selectedOptions[0]?.textContent || "All MLB";
    updatePlayers();
  });
  document.querySelector("#fantasy-category").addEventListener("change", (event) => {
    activeCategory = event.target.value;
    activeSort = { key: activeCategory, dir: sortDirection(activeCategory) };
    updatePlayers();
  });
  document.querySelector("#fantasy-position").addEventListener("change", (event) => {
    activePosition = event.target.value;
    renderAll();
  });
  document.querySelector("#fantasy-pool").addEventListener("change", (event) => {
    activePool = event.target.value;
    renderAll();
  });
  document.querySelector("#fantasy-search").addEventListener("input", renderTable);
}

populateSeasonSelect();
renderControls();
bindEvents();
updateTeams().then(updatePlayers);
