const query = new URLSearchParams(window.location.search);
const currentSeason = 2026;
const firstSeason = 1901;
const leagueIds = { al: "103", nl: "104" };
const leagueLabels = { all: "MLB", al: "AL", nl: "NL" };
const staffLabels = { full: "full staff", starters: "starters", relievers: "relievers" };
const numberFormat = new Intl.NumberFormat("en-US");
const cache = new Map();

const teamNamesById = {
  108: "Los Angeles Angels",
  109: "Arizona Diamondbacks",
  110: "Baltimore Orioles",
  111: "Boston Red Sox",
  112: "Chicago Cubs",
  113: "Cincinnati Reds",
  114: "Cleveland Guardians",
  115: "Colorado Rockies",
  116: "Detroit Tigers",
  117: "Houston Astros",
  118: "Kansas City Royals",
  119: "Los Angeles Dodgers",
  120: "Washington Nationals",
  121: "New York Mets",
  133: "Athletics",
  134: "Pittsburgh Pirates",
  135: "San Diego Padres",
  136: "Seattle Mariners",
  137: "San Francisco Giants",
  138: "St. Louis Cardinals",
  139: "Tampa Bay Rays",
  140: "Texas Rangers",
  141: "Toronto Blue Jays",
  142: "Minnesota Twins",
  143: "Philadelphia Phillies",
  144: "Atlanta Braves",
  145: "Chicago White Sox",
  146: "Miami Marlins",
  147: "New York Yankees",
  158: "Milwaukee Brewers"
};

const teamAbbrById = {
  108: "LAA",
  109: "ARI",
  110: "BAL",
  111: "BOS",
  112: "CHC",
  113: "CIN",
  114: "CLE",
  115: "COL",
  116: "DET",
  117: "HOU",
  118: "KC",
  119: "LAD",
  120: "WSH",
  121: "NYM",
  133: "ATH",
  134: "PIT",
  135: "SD",
  136: "SEA",
  137: "SF",
  138: "STL",
  139: "TB",
  140: "TEX",
  141: "TOR",
  142: "MIN",
  143: "PHI",
  144: "ATL",
  145: "CWS",
  146: "MIA",
  147: "NYY",
  158: "MIL"
};

const teamColors = {
  108: "#ba0021",
  109: "#a71930",
  110: "#df4601",
  111: "#bd3039",
  112: "#0e3386",
  113: "#c6011f",
  114: "#e31937",
  115: "#33006f",
  116: "#0c2340",
  117: "#002d62",
  118: "#004687",
  119: "#005a9c",
  120: "#ab0003",
  121: "#002d72",
  133: "#003831",
  134: "#fdb827",
  135: "#2f241d",
  136: "#005c5c",
  137: "#fd5a1e",
  138: "#c41e3a",
  139: "#092c5c",
  140: "#003278",
  141: "#134a8e",
  142: "#002b5c",
  143: "#e81828",
  144: "#13274f",
  145: "#27251f",
  146: "#00a3e0",
  147: "#003087",
  158: "#12284b"
};

const metricGroups = {
  hitting: [
    { key: "avg", label: "AVG", api: "avg", type: "rate", phrase: "best AVG", valueLabel: "AVG" },
    { key: "ops", label: "OPS", api: "ops", type: "rate", phrase: "best OPS", valueLabel: "OPS" },
    { key: "obp", label: "OBP", api: "obp", type: "rate", phrase: "best OBP", valueLabel: "OBP" },
    { key: "slg", label: "SLG", api: "slg", type: "rate", phrase: "best SLG", valueLabel: "SLG" },
    { key: "runs", label: "R", api: "runs", type: "count", phrase: "most runs", valueLabel: "Runs" },
    { key: "hits", label: "H", api: "hits", type: "count", phrase: "most hits", valueLabel: "Hits" },
    { key: "hr", label: "HR", api: "homeRuns", type: "count", phrase: "most HR", valueLabel: "HR" },
    { key: "rbi", label: "RBI", api: "rbi", type: "count", phrase: "most RBI", valueLabel: "RBI" },
    { key: "bb", label: "BB", api: "baseOnBalls", type: "count", phrase: "most walks", valueLabel: "Walks" },
    { key: "sb", label: "SB", api: "stolenBases", type: "count", phrase: "most steals", valueLabel: "SB" },
    { key: "so", label: "SO", api: "strikeOuts", type: "count", lowerBetter: true, phrase: "fewest strikeouts", valueLabel: "SO" }
  ],
  pitching: [
    { key: "era", label: "ERA", api: "era", type: "rate", lowerBetter: true, phrase: "lowest ERA", valueLabel: "ERA" },
    { key: "whip", label: "WHIP", api: "whip", type: "rate", lowerBetter: true, phrase: "lowest WHIP", valueLabel: "WHIP" },
    { key: "so", label: "SO", api: "strikeOuts", type: "count", phrase: "most strikeouts", valueLabel: "Strikeouts" },
    { key: "ip", label: "IP", api: "inningsPitched", type: "innings", phrase: "most innings", valueLabel: "IP" },
    { key: "h", label: "H Allowed", api: "hits", type: "count", lowerBetter: true, phrase: "fewest hits allowed", valueLabel: "Hits Allowed" },
    { key: "er", label: "ER", api: "earnedRuns", type: "count", lowerBetter: true, phrase: "fewest earned runs allowed", valueLabel: "ER" },
    { key: "hr", label: "HR Allowed", api: "homeRuns", type: "count", lowerBetter: true, phrase: "fewest homers allowed", valueLabel: "HR Allowed" },
    { key: "bb", label: "BB", api: "baseOnBalls", type: "count", lowerBetter: true, phrase: "fewest walks", valueLabel: "Walks" },
    { key: "sv", label: "SV", api: "saves", type: "count", phrase: "most saves", valueLabel: "Saves" }
  ]
};

const tableColumns = {
  hitting: [
    { key: "rank", label: "#" },
    { key: "team", label: "Team" },
    { key: "games", label: "G" },
    { key: "runs", label: "R" },
    { key: "hits", label: "H" },
    { key: "hr", label: "HR" },
    { key: "rbi", label: "RBI" },
    { key: "bb", label: "BB" },
    { key: "so", label: "SO" },
    { key: "avg", label: "AVG" },
    { key: "obp", label: "OBP" },
    { key: "slg", label: "SLG" },
    { key: "ops", label: "OPS" }
  ],
  pitching: [
    { key: "rank", label: "#" },
    { key: "team", label: "Team" },
    { key: "games", label: "G" },
    { key: "ip", label: "IP" },
    { key: "era", label: "ERA" },
    { key: "whip", label: "WHIP" },
    { key: "h", label: "H" },
    { key: "er", label: "ER" },
    { key: "hr", label: "HR" },
    { key: "bb", label: "BB" },
    { key: "so", label: "SO" },
    { key: "sv", label: "SV" }
  ]
};

const els = {
  group: document.getElementById("trend-group"),
  stat: document.getElementById("trend-stat"),
  league: document.getElementById("trend-league"),
  staff: document.getElementById("trend-staff"),
  scope: document.getElementById("trend-scope"),
  season: document.getElementById("trend-season"),
  start: document.getElementById("trend-start"),
  end: document.getElementById("trend-end"),
  size: document.getElementById("trend-size"),
  controls: document.querySelector(".trends-controls-panel"),
  leader: document.getElementById("trend-leader"),
  leaderContext: document.getElementById("trend-leader-context"),
  statValue: document.getElementById("trend-stat-value"),
  statLabel: document.getElementById("trend-stat-label"),
  rangeLabel: document.getElementById("trend-range-label"),
  teamsLoaded: document.getElementById("trend-teams-loaded"),
  headline: document.getElementById("trend-headline"),
  boardTitle: document.getElementById("trend-board-title"),
  boardNote: document.getElementById("trend-board-note"),
  board: document.getElementById("trend-board"),
  tableTitle: document.getElementById("trend-table-title"),
  tableHead: document.getElementById("trend-table-head"),
  tableBody: document.getElementById("trend-table-body"),
  copy: document.getElementById("copy-trend-link"),
  copyStatus: document.getElementById("trend-copy-status")
};

const state = {
  group: validGroup(query.get("group")) || "hitting",
  stat: query.get("stat") || "avg",
  league: validLeague(query.get("league")) || "al",
  staff: validStaff(query.get("staff")) || "full",
  scope: validScope(query.get("scope")) || "last30",
  season: clampSeason(query.get("season")) || currentSeason,
  start: cleanIsoDate(query.get("start"), shiftDate(todayIso(), -29)),
  end: cleanIsoDate(query.get("end"), todayIso()),
  size: validSize(query.get("size")) || 10,
  sortKey: query.get("sort") || null,
  sortDirection: query.get("dir") === "asc" ? "asc" : "desc"
};

let copyTimer = 0;

function validGroup(value) {
  return value === "pitching" || value === "hitting" ? value : "";
}

function validLeague(value) {
  return ["all", "al", "nl"].includes(value) ? value : "";
}

function validStaff(value) {
  return ["full", "starters", "relievers"].includes(value) ? value : "";
}

function validScope(value) {
  return ["last7", "last14", "last30", "season", "custom"].includes(value) ? value : "";
}

function validSize(value) {
  const size = Number(value);
  return [10, 15, 30].includes(size) ? size : 0;
}

function clampSeason(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(currentSeason, Math.max(firstSeason, Math.round(number)));
}

function todayIso() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function shiftDate(iso, days) {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function cleanIsoDate(value, fallback) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value;
  return fallback;
}

function isoToMlbDate(value) {
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

function formatShortDate(value) {
  const [year, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}/${year}`;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function inningsToOuts(value) {
  if (!value || value === "-.--") return 0;
  const [whole, fraction = "0"] = String(value).split(".");
  return Number(whole) * 3 + Number(fraction || 0);
}

function outsToInnings(outs) {
  const safeOuts = Math.max(0, Number(outs) || 0);
  return `${Math.floor(safeOuts / 3)}.${safeOuts % 3}`;
}

function formatRate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return ".000";
  const fixed = number.toFixed(3);
  if (number >= 1) return fixed;
  return fixed.replace(/^0/, "");
}

function formatValue(row, metric) {
  const value = row[metric.key];
  if (metric.type === "rate") return formatRate(value);
  if (metric.type === "innings") return outsToInnings(row.ipOuts);
  return numberFormat.format(Number(value) || 0);
}

function displayCell(row, key) {
  if (key === "rank") return row.rank;
  if (key === "team") return `<strong>${row.name}</strong><small>${row.abbr}</small>`;
  if (["avg", "obp", "slg", "ops", "era", "whip"].includes(key)) return formatRate(row[key]);
  if (key === "ip") return outsToInnings(row.ipOuts);
  return numberFormat.format(Number(row[key]) || 0);
}

function metricFor(group = state.group, key = state.stat) {
  const metrics = metricGroups[group] || metricGroups.hitting;
  return metrics.find((metric) => metric.key === key) || metrics[0];
}

function populateSeasons() {
  const fragment = document.createDocumentFragment();
  for (let season = currentSeason; season >= firstSeason; season -= 1) {
    const option = document.createElement("option");
    option.value = String(season);
    option.textContent = String(season);
    fragment.appendChild(option);
  }
  els.season.appendChild(fragment);
}

function populateStats() {
  const selected = metricFor(state.group, state.stat);
  els.stat.innerHTML = "";
  metricGroups[state.group].forEach((metric) => {
    const option = document.createElement("option");
    option.value = metric.key;
    option.textContent = metric.label;
    els.stat.appendChild(option);
  });
  state.stat = selected.key;
}

function syncControls() {
  populateStats();
  els.group.value = state.group;
  els.stat.value = state.stat;
  els.league.value = state.league;
  els.staff.value = state.staff;
  els.scope.value = state.scope;
  els.season.value = String(state.season);
  els.start.value = state.start;
  els.end.value = state.end;
  els.start.min = `${firstSeason}-01-01`;
  els.start.max = todayIso();
  els.end.min = `${firstSeason}-01-01`;
  els.end.max = todayIso();
  els.size.value = String(state.size);
  els.controls.dataset.scope = state.scope;
  els.controls.dataset.group = state.group;
}

function currentRange() {
  if (state.scope === "season") {
    return {
      label: `the ${state.season} season`,
      start: `${state.season}-01-01`,
      end: `${state.season}-12-31`
    };
  }
  if (state.scope === "custom") {
    const start = state.start <= state.end ? state.start : state.end;
    const end = state.end >= state.start ? state.end : state.start;
    return {
      label: `${formatShortDate(start)} to ${formatShortDate(end)}`,
      start,
      end
    };
  }
  const days = state.scope === "last7" ? 7 : state.scope === "last14" ? 14 : 30;
  const end = state.end || todayIso();
  const start = shiftDate(end, -(days - 1));
  return {
    label: `last ${days} days`,
    start,
    end
  };
}

function apiUrl() {
  const range = currentRange();
  const params = new URLSearchParams({
    season: state.scope === "season" ? String(state.season) : range.end.slice(0, 4),
    group: state.group,
    stats: state.scope === "season" ? "season" : "byDateRange",
    sportIds: "1"
  });
  if (state.scope !== "season") {
    params.set("startDate", isoToMlbDate(range.start));
    params.set("endDate", isoToMlbDate(range.end));
  }
  if (state.league !== "all") params.set("leagueIds", leagueIds[state.league]);
  return `https://statsapi.mlb.com/api/v1/teams/stats?${params.toString()}`;
}

function playerApiUrl() {
  const range = currentRange();
  const params = new URLSearchParams({
    season: state.scope === "season" ? String(state.season) : range.end.slice(0, 4),
    group: "pitching",
    stats: state.scope === "season" ? "season" : "byDateRange",
    playerPool: "ALL",
    sportIds: "1",
    hydrate: "team",
    limit: "5000",
    sortStat: "inningsPitched"
  });
  if (state.scope !== "season") {
    params.set("startDate", isoToMlbDate(range.start));
    params.set("endDate", isoToMlbDate(range.end));
  }
  if (state.league !== "all") params.set("leagueIds", leagueIds[state.league]);
  return `https://statsapi.mlb.com/api/v1/stats?${params.toString()}`;
}

async function fetchRows() {
  if (state.group === "pitching" && state.staff !== "full") return fetchPitcherRoleRows();
  const url = apiUrl();
  if (cache.has(url)) return cache.get(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`MLB team stats returned ${response.status}`);
  const data = await response.json();
  const rows = (data.stats?.[0]?.splits || []).map(mapSplit).filter((row) => row.name);
  cache.set(url, rows);
  return rows;
}

async function fetchPitcherRoleRows() {
  const url = `${playerApiUrl()}&staff=${state.staff}`;
  if (cache.has(url)) return cache.get(url);
  const response = await fetch(playerApiUrl());
  if (!response.ok) throw new Error(`MLB player stats returned ${response.status}`);
  const data = await response.json();
  const teams = new Map();
  (data.stats?.[0]?.splits || []).forEach((split) => {
    const stat = split.stat || {};
    const team = split.team || (Array.isArray(split.player?.currentTeam) ? split.player.currentTeam[0] : split.player?.currentTeam);
    const teamId = Number(team?.id) || 0;
    const starts = toNumber(stat.gamesStarted);
    const gamesPitched = toNumber(stat.gamesPitched || stat.gamesPlayed);
    const reliefGames = Math.max(0, gamesPitched - starts);
    const roleGames = state.staff === "starters" ? starts : reliefGames;
    if (!teamId || roleGames <= 0) return;
    const existing = teams.get(teamId) || {
      id: teamId,
      name: teamNamesById[teamId] || team?.name || "Unknown",
      abbr: teamAbbrById[teamId] || "",
      color: teamColors[teamId] || "#12355b",
      games: 0,
      ipOuts: 0,
      h: 0,
      er: 0,
      hr: 0,
      bb: 0,
      so: 0,
      sv: 0
    };
    existing.games += roleGames;
    existing.ipOuts += toNumber(stat.outs) || inningsToOuts(stat.inningsPitched);
    existing.h += toNumber(stat.hits);
    existing.er += toNumber(stat.earnedRuns);
    existing.hr += toNumber(stat.homeRuns);
    existing.bb += toNumber(stat.baseOnBalls);
    existing.so += toNumber(stat.strikeOuts);
    existing.sv += toNumber(stat.saves);
    teams.set(teamId, existing);
  });
  const rows = Array.from(teams.values()).map((team) => {
    const innings = team.ipOuts / 3;
    return {
      ...team,
      era: innings ? (team.er * 9) / innings : 0,
      whip: innings ? (team.h + team.bb) / innings : 0
    };
  });
  cache.set(url, rows);
  return rows;
}

function mapSplit(split) {
  const id = Number(split.team?.id) || 0;
  const stat = split.stat || {};
  const common = {
    id,
    name: teamNamesById[id] || split.team?.name || "Unknown",
    abbr: teamAbbrById[id] || split.team?.abbreviation || "",
    color: teamColors[id] || "#12355b",
    games: toNumber(stat.gamesPlayed)
  };
  if (state.group === "pitching") {
    return {
      ...common,
      ipOuts: toNumber(stat.outs) || inningsToOuts(stat.inningsPitched),
      ip: inningsToOuts(stat.inningsPitched),
      era: toNumber(stat.era),
      whip: toNumber(stat.whip),
      h: toNumber(stat.hits),
      er: toNumber(stat.earnedRuns),
      hr: toNumber(stat.homeRuns),
      bb: toNumber(stat.baseOnBalls),
      so: toNumber(stat.strikeOuts),
      sv: toNumber(stat.saves)
    };
  }
  return {
    ...common,
    runs: toNumber(stat.runs),
    hits: toNumber(stat.hits),
    hr: toNumber(stat.homeRuns),
    rbi: toNumber(stat.rbi),
    bb: toNumber(stat.baseOnBalls),
    so: toNumber(stat.strikeOuts),
    sb: toNumber(stat.stolenBases),
    avg: toNumber(stat.avg),
    obp: toNumber(stat.obp),
    slg: toNumber(stat.slg),
    ops: toNumber(stat.ops)
  };
}

function sortRows(rows, metric = metricFor()) {
  const direction = metric.lowerBetter ? 1 : -1;
  return rows
    .slice()
    .sort((a, b) => {
      const delta = ((Number(a[metric.key]) || 0) - (Number(b[metric.key]) || 0)) * direction;
      if (delta !== 0) return delta;
      return a.name.localeCompare(b.name);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function sortedForTable(rows) {
  const columns = tableColumns[state.group];
  const key = state.sortKey || state.stat;
  const column = columns.find((item) => item.key === key);
  const metric = metricFor(state.group, key);
  if (!column || key === "rank") return rows.slice();
  if (key === "team") {
    return rows.slice().sort((a, b) => (state.sortDirection === "asc" ? 1 : -1) * a.name.localeCompare(b.name));
  }
  const direction = state.sortDirection === "asc" ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const aValue = key === "ip" ? a.ipOuts : Number(a[key]) || 0;
    const bValue = key === "ip" ? b.ipOuts : Number(b[key]) || 0;
    const delta = (aValue - bValue) * direction;
    if (delta !== 0) return delta;
    return a.name.localeCompare(b.name);
  }).map((row, index) => ({ ...row, rank: index + 1, trendRank: row.rank }));
}

function barPercent(row, rows, metric) {
  if (!rows.length) return 0;
  const values = rows.map((item) => Number(item[metric.key]) || 0);
  const value = Number(row[metric.key]) || 0;
  if (metric.lowerBetter) {
    const max = Math.max(...values);
    const min = Math.min(...values);
    if (max === min) return 100;
    return 38 + ((max - value) / Math.max(1, max - min)) * 62;
  }
  const max = Math.max(...values);
  return max ? Math.max(8, (value / max) * 100) : 0;
}

function updateUrl() {
  const params = new URLSearchParams({
    group: state.group,
    stat: state.stat,
    league: state.league,
    scope: state.scope,
    size: String(state.size)
  });
  if (state.group === "pitching" && state.staff !== "full") params.set("staff", state.staff);
  if (state.scope === "season") params.set("season", String(state.season));
  if (state.scope === "custom") {
    params.set("start", currentRange().start);
    params.set("end", currentRange().end);
  }
  if (state.sortKey && state.sortKey !== state.stat) {
    params.set("sort", state.sortKey);
    params.set("dir", state.sortDirection);
  }
  history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
}

function buildHeadline(leader, metric, range) {
  if (!leader) return "No team data found for that trend.";
  const league = state.league === "all" ? "MLB" : `the ${leagueLabels[state.league]}`;
  const staffLeague = state.league === "all" ? "MLB" : leagueLabels[state.league];
  const staff = state.group === "pitching" && state.staff !== "full" ? ` among ${staffLeague} ${staffLabels[state.staff]}` : ` in ${league}`;
  const rangeText = range.label.startsWith("last ") ? `the ${range.label}` : range.label;
  return `The ${leader.name} have the ${metric.phrase}${staff} over ${rangeText}.`;
}

function gameLabel(short = false) {
  if (state.group === "pitching" && state.staff === "starters") return short ? "GS" : "starts";
  if (state.group === "pitching" && state.staff === "relievers") return short ? "RP" : "relief apps";
  return short ? "G" : "games";
}

function renderBoard(rows, metric) {
  const boardRows = rows.slice(0, state.size);
  const maxStat = rows.length ? formatValue(rows[0], metric) : "-";
  const staffText = state.group === "pitching" && state.staff !== "full" ? ` ${staffLabels[state.staff]}` : "";
  els.boardTitle.textContent = `${state.size >= rows.length ? "All Teams" : `Top ${state.size}`}: ${leagueLabels[state.league]} team${staffText} ${metric.label}`;
  els.boardNote.textContent = `${boardRows.length} of ${rows.length} teams shown`;
  els.board.innerHTML = boardRows.map((row) => {
    const pct = barPercent(row, rows, metric);
    return `
      <div class="trend-row">
          <span class="trend-rank">${row.rank}</span>
        <div class="trend-team">
          <strong>${row.name}</strong>
          <small>${row.abbr} | ${row.games} ${gameLabel(true)}</small>
        </div>
        <div class="trend-bar-track" aria-hidden="true">
          <span class="trend-bar-fill" style="width: ${pct}%; --team-color: ${row.color};"></span>
        </div>
        <strong class="trend-value">${formatValue(row, metric)}</strong>
      </div>
    `;
  }).join("");
  if (!boardRows.length) {
    els.board.innerHTML = `<p class="empty-note">No team data found for this selection.</p>`;
  }
  return maxStat;
}

function renderTable(rows) {
  const columns = tableColumns[state.group];
  const tableRows = sortedForTable(rows);
  els.tableHead.innerHTML = `<tr>${columns.map((column) => {
    const active = (state.sortKey || state.stat) === column.key;
    const arrow = active ? (state.sortDirection === "asc" ? " ↑" : " ↓") : "";
    const label = column.key === "games" ? gameLabel(true) : column.label;
    return `<th scope="col"><button type="button" data-sort="${column.key}">${label}${arrow}</button></th>`;
  }).join("")}</tr>`;
  els.tableBody.innerHTML = tableRows.map((row) => (
    `<tr>${columns.map((column) => `<td>${displayCell(row, column.key)}</td>`).join("")}</tr>`
  )).join("");
  if (!tableRows.length) {
    els.tableBody.innerHTML = `<tr><td colspan="${columns.length}">No team data found for this selection.</td></tr>`;
  }
}

async function render() {
  syncControls();
  updateUrl();
  const range = currentRange();
  const metric = metricFor();
  els.headline.textContent = "Loading team trend...";
  els.board.innerHTML = `<p class="empty-note">Loading team leaders...</p>`;
  try {
    const rows = sortRows(await fetchRows(), metric);
    const leader = rows[0];
    const leaderValue = leader ? formatValue(leader, metric) : "-";
    els.leader.textContent = leader?.name || "-";
    els.leaderContext.textContent = leader ? `${leader.abbr} | ${leader.games} ${gameLabel()}` : "No teams found";
    els.statValue.textContent = leaderValue;
    els.statLabel.textContent = metric.valueLabel;
    els.rangeLabel.textContent = range.label;
    els.teamsLoaded.textContent = `${rows.length} teams loaded`;
    els.headline.textContent = buildHeadline(leader, metric, range);
    const staffText = state.group === "pitching" && state.staff !== "full" ? ` ${staffLabels[state.staff]}` : "";
    els.tableTitle.textContent = `${leagueLabels[state.league]} team ${state.group === "hitting" ? "batting" : `pitching${staffText}`} trends`;
    renderBoard(rows, metric);
    renderTable(rows);
  } catch (error) {
    console.error(error);
    els.leader.textContent = "-";
    els.statValue.textContent = "-";
    els.headline.textContent = "Could not load that trend right now.";
    els.board.innerHTML = `<p class="empty-note">MLB team stats did not load. Try a different range or refresh.</p>`;
    els.tableBody.innerHTML = `<tr><td>MLB team stats did not load.</td></tr>`;
  }
}

function setRecentScopeDays(days) {
  state.end = todayIso();
  state.start = shiftDate(state.end, -(days - 1));
}

function handleControlChange(event) {
  const id = event.target.id;
  if (id === "trend-group") {
    state.group = event.target.value;
    state.stat = state.group === "pitching" ? "era" : "avg";
    state.sortKey = null;
    state.sortDirection = metricFor().lowerBetter ? "asc" : "desc";
  }
  if (id === "trend-stat") {
    state.stat = event.target.value;
    state.sortKey = null;
    state.sortDirection = metricFor().lowerBetter ? "asc" : "desc";
  }
  if (id === "trend-league") state.league = event.target.value;
  if (id === "trend-staff") state.staff = validStaff(event.target.value) || "full";
  if (id === "trend-scope") {
    state.scope = event.target.value;
    if (state.scope === "last7") setRecentScopeDays(7);
    if (state.scope === "last14") setRecentScopeDays(14);
    if (state.scope === "last30") setRecentScopeDays(30);
  }
  if (id === "trend-season") state.season = clampSeason(event.target.value) || currentSeason;
  if (id === "trend-start") {
    state.start = cleanIsoDate(event.target.value, state.start);
    state.scope = "custom";
  }
  if (id === "trend-end") {
    state.end = cleanIsoDate(event.target.value, state.end);
    state.scope = "custom";
  }
  if (id === "trend-size") state.size = validSize(event.target.value) || 10;
  render();
}

function handleTableSort(event) {
  const button = event.target.closest("button[data-sort]");
  if (!button) return;
  const key = button.dataset.sort;
  if (key === "rank") {
    state.sortKey = state.stat;
    state.sortDirection = metricFor().lowerBetter ? "asc" : "desc";
  } else if (state.sortKey === key) {
    state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
  } else {
    state.sortKey = key;
    const selectedMetric = metricFor(state.group, key);
    state.sortDirection = selectedMetric.lowerBetter ? "asc" : "desc";
  }
  render();
}

async function copyLink() {
  updateUrl();
  try {
    await navigator.clipboard.writeText(window.location.href);
    els.copyStatus.textContent = "Copied";
  } catch {
    els.copyStatus.textContent = "Copy failed";
  }
  window.clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => {
    els.copyStatus.textContent = "";
  }, 1800);
}

function init() {
  populateSeasons();
  if (state.scope === "last7") setRecentScopeDays(7);
  if (state.scope === "last14") setRecentScopeDays(14);
  if (state.scope === "last30") setRecentScopeDays(30);
  const selectedMetric = metricFor();
  state.stat = selectedMetric.key;
  state.sortDirection = selectedMetric.lowerBetter ? "asc" : "desc";
  [els.group, els.stat, els.league, els.staff, els.scope, els.season, els.start, els.end, els.size].forEach((element) => {
    element.addEventListener("change", handleControlChange);
  });
  els.tableHead.addEventListener("click", handleTableSort);
  els.copy.addEventListener("click", copyLink);
  render();
}

init();
