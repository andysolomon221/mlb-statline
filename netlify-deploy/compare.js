const firstSeason = 1901;
const lastSeason = 2026;
const peopleCache = new Map();
const statsCache = new Map();
const firstSeasonRowsCache = new Map();

let activeGroup = "hitting";
let activeMode = "single";
let activeSeason = "2026";
let activeRange = { start: 2021, end: 2026 };
let activeCareerSeasonRange = { start: 1, end: 4 };
let advancedCareerWindowsOpen = false;
let activePlayerCareerWindows = {
  a: { start: 1, end: 4 },
  b: { start: 1, end: 4 }
};
let playerA = { id: 592450, fullName: "Aaron Judge", position: "OF", mlbDebutDate: "2016-08-13" };
let playerB = { id: 660271, fullName: "Shohei Ohtani", position: "DH", mlbDebutDate: "2018-03-29" };
let candidatesA = [playerA];
let candidatesB = [playerB];
let searchTimer;
let copyStatusTimer;
let cardViewActive = false;
let historyAxis = "season";
let historyMetric = "homeRuns";
let historyRowsA = [];
let historyRowsB = [];
let activeCompareView = "players";
let ybyPlayer = { ...playerA };
let candidatesYby = [ybyPlayer];
let ybyRange = { start: 2022, end: 2026 };

const metricSets = {
  hitting: [
    ["gamesPlayed", "G", false, 0],
    ["plateAppearances", "PA", false, 0],
    ["atBats", "AB", false, 0],
    ["hits", "H", false, 0],
    ["homeRuns", "HR", false, 0],
    ["stolenBases", "SB", false, 0],
    ["rbi", "RBI", false, 0],
    ["baseOnBalls", "BB", false, 0],
    ["strikeOuts", "SO", true, 0],
    ["avg", "AVG", false, 3],
    ["obp", "OBP", false, 3],
    ["slg", "SLG", false, 3],
    ["ops", "OPS", false, 3]
  ],
  pitching: [
    ["gamesPlayed", "G", false, 0],
    ["gamesStarted", "GS", false, 0],
    ["inningsPitched", "IP", false, 1],
    ["wins", "W", false, 0],
    ["saves", "SV", false, 0],
    ["hits", "H", true, 0],
    ["earnedRuns", "ER", true, 0],
    ["baseOnBalls", "BB", true, 0],
    ["strikeOuts", "SO", false, 0],
    ["era", "ERA", true, 2],
    ["whip", "WHIP", true, 2]
  ]
};

const historyDefaultMetric = {
  hitting: "homeRuns",
  pitching: "era"
};

const yearByYearMetricSets = {
  hitting: [
    ["gamesPlayed", "Games", false, 0],
    ["plateAppearances", "PA", false, 0],
    ["hits", "Hits", false, 0],
    ["homeRuns", "Home Runs", false, 0],
    ["rbi", "RBI", false, 0],
    ["stolenBases", "Stolen Bases", false, 0],
    ["avg", "AVG", false, 3],
    ["obp", "OBP", false, 3],
    ["slg", "SLG", false, 3],
    ["ops", "OPS", false, 3],
    ["bbPct", "BB%", false, 1, true],
    ["kPct", "K%", true, 1, true]
  ],
  pitching: [
    ["gamesPlayed", "Games", false, 0],
    ["gamesStarted", "Starts", false, 0],
    ["inningsPitched", "IP", false, 1],
    ["wins", "Wins", false, 0],
    ["saves", "Saves", false, 0],
    ["strikeOuts", "Strikeouts", false, 0],
    ["era", "ERA", true, 2],
    ["whip", "WHIP", true, 2],
    ["kPct", "K%", false, 1, true],
    ["bbPct", "BB%", true, 1, true]
  ]
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

function safeRate(top, bottom) {
  return bottom > 0 ? top / bottom : 0;
}

function inningsToOuts(value) {
  const [whole, partial = "0"] = String(value || "0").split(".");
  return (Number(whole) || 0) * 3 + (Number(partial) || 0);
}

function outsToInnings(outs) {
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

function yearList(start, end) {
  const low = Math.min(Number(start), Number(end));
  const high = Math.max(Number(start), Number(end));
  return Array.from({ length: high - low + 1 }, (_, index) => low + index);
}

function scopeLabel() {
  if (activeMode === "single") return activeSeason;
  if (activeMode === "career") return "Full career";
  if (activeMode === "careerSeasons") {
    if (advancedCareerWindowsOpen) return "Custom windows";
    const range = careerSeasonRange();
    return careerWindowLabel(range).replace("career", "Career");
  }
  return activeRange.start === activeRange.end ? String(activeRange.start) : `${activeRange.start}-${activeRange.end}`;
}

function baseballReferenceSearchUrl(name) {
  return `https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(name)}`;
}

function careerUrl(name) {
  const params = new URLSearchParams();
  params.set("player", name);
  params.set("group", activeGroup);
  return `career.html?${params.toString()}`;
}

function headshotUrl(player) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_320,q_auto:best/v1/people/${player.id}/headshot/67/current`;
}

function compactName(name) {
  return String(name || "").trim();
}

function firstSeasonRowsKey(player) {
  return `${player.id}:${activeGroup}:first-seasons`;
}

function careerSeasonRange() {
  return cleanCareerRange(activeCareerSeasonRange);
}

function cleanCareerRange(range) {
  const cleanStart = Math.max(1, Math.floor(toNumber(range.start)) || 1);
  const cleanEnd = Math.max(1, Math.floor(toNumber(range.end)) || cleanStart);
  const start = Math.min(cleanStart, cleanEnd);
  const end = Math.max(cleanStart, cleanEnd);
  return { start, end };
}

function careerWindowForSide(side) {
  return advancedCareerWindowsOpen && activeMode === "careerSeasons"
    ? cleanCareerRange(activePlayerCareerWindows[side] || activeCareerSeasonRange)
    : careerSeasonRange();
}

function careerWindowLabel(range) {
  return range.start === range.end ? `career season ${range.start}` : `career seasons ${range.start}-${range.end}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request returned ${response.status}`);
  return response.json();
}

function cleanPlayerInput(value) {
  return value.replace(/\s+-\s+[^()]+(?:\s+\([^)]+\))?$/, "").replace(/\s+\([^)]+\)$/, "").trim();
}

function normalizeName(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function playerContextLabel(person) {
  const parts = [person.position || "MLB"];
  if (person.teamName || person.team) {
    parts.push(person.teamName || person.team);
  } else if (person.mlbDebutDate) {
    parts.push(`MLB debut ${String(person.mlbDebutDate).slice(0, 4)}`);
  } else {
    parts.push("No MLB debut listed");
  }
  return parts.filter(Boolean).join(" - ");
}

function displayPlayerOption(person) {
  return `${person.fullName} - ${playerContextLabel(person)}`;
}

function playerSearchRank(person, query) {
  const name = normalizeName(person.fullName);
  const cleanQuery = normalizeName(query);
  const groupMatch = activeGroup === "pitching"
    ? person.position === "P"
    : person.position !== "P";
  let rank = 0;
  if (name === cleanQuery) rank += 100;
  if (person.mlbDebutDate) rank += 40;
  if (groupMatch) rank += 20;
  if (person.teamName || person.team) rank += 10;
  return rank;
}

function rankPeople(people, query) {
  return people.slice().sort((a, b) => playerSearchRank(b, query) - playerSearchRank(a, query));
}

async function searchPeople(query) {
  const clean = query.trim();
  if (!clean) return [];
  const cacheKey = clean.toLowerCase();
  if (peopleCache.has(cacheKey)) return peopleCache.get(cacheKey);
  const data = await fetchJson(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(clean)}`);
  const people = (data.people || []).map((person) => ({
    id: person.id,
    fullName: person.fullName,
    position: person.primaryPosition?.abbreviation || "MLB",
    team: person.currentTeam?.abbreviation || "",
    teamName: person.currentTeam?.name || "",
    mlbDebutDate: person.mlbDebutDate || ""
  }));
  const ranked = rankPeople(people, clean);
  peopleCache.set(cacheKey, ranked);
  return ranked;
}

function renderCandidates(side, people) {
  const unique = Array.from(new Map(people.map((person) => [Number(person.id), person])).values());
  if (side === "a") candidatesA = unique;
  else candidatesB = unique;
  document.querySelector(`#compare-player-${side}-options`).innerHTML = unique.map((person) => `
    <option value="${escapeHtml(displayPlayerOption(person))}" label="${escapeHtml(person.fullName)}"></option>
  `).join("");
}

function renderYearByYearCandidates(people) {
  const unique = Array.from(new Map(people.map((person) => [Number(person.id), person])).values());
  candidatesYby = unique;
  document.querySelector("#compare-yby-player-options").innerHTML = unique.map((person) => `
    <option value="${escapeHtml(displayPlayerOption(person))}" label="${escapeHtml(person.fullName)}"></option>
  `).join("");
}

async function hydrateYearByYearPlayer() {
  const input = document.querySelector("#compare-yby-player");
  const clean = cleanPlayerInput(input.value);
  const rawValue = input.value.trim();
  let match = candidatesYby.find((person) => normalizeName(displayPlayerOption(person)) === normalizeName(rawValue));
  if (!match) match = rankPeople(candidatesYby.filter((person) => normalizeName(person.fullName) === normalizeName(clean)), clean)[0];
  if (!match) {
    const people = await searchPeople(clean);
    renderYearByYearCandidates(people);
    match = rankPeople(people.filter((person) => normalizeName(person.fullName) === normalizeName(clean)), clean)[0] || people[0];
  }
  if (!match) throw new Error(`Could not find ${clean}`);
  ybyPlayer = match;
  input.value = match.fullName;
}

async function hydratePlayer(side) {
  const input = document.querySelector(`#compare-player-${side}`);
  const clean = cleanPlayerInput(input.value);
  const rawValue = input.value.trim();
  const candidates = side === "a" ? candidatesA : candidatesB;
  let match = candidates.find((person) => normalizeName(displayPlayerOption(person)) === normalizeName(rawValue));
  if (!match) {
    match = rankPeople(candidates.filter((person) => normalizeName(person.fullName) === normalizeName(clean)), clean)[0];
  }
  if (!match) {
    const people = await searchPeople(clean);
    renderCandidates(side, people);
    match = rankPeople(people.filter((person) => normalizeName(person.fullName) === normalizeName(clean)), clean)[0] || people[0];
  }
  if (!match) throw new Error(`Could not find ${clean}`);
  if (side === "a") playerA = match;
  else playerB = match;
  input.value = match.fullName;
}

function mapSeasonStat(stat = {}) {
  const atBats = toNumber(stat.atBats);
  const hits = toNumber(stat.hits);
  const walks = toNumber(stat.baseOnBalls);
  const hbp = toNumber(stat.hitByPitch);
  const sacFlies = toNumber(stat.sacFlies);
  const totalBases = toNumber(stat.totalBases) || Math.round(toNumber(stat.slg) * atBats);
  const ipOuts = toNumber(stat.outs) || inningsToOuts(stat.inningsPitched);
  return {
    gamesPlayed: toNumber(stat.gamesPlayed),
    gamesStarted: toNumber(stat.gamesStarted),
    plateAppearances: toNumber(stat.plateAppearances),
    battersFaced: toNumber(stat.battersFaced),
    atBats,
    hits,
    homeRuns: toNumber(stat.homeRuns),
    stolenBases: toNumber(stat.stolenBases),
    rbi: toNumber(stat.rbi),
    baseOnBalls: walks,
    strikeOuts: toNumber(stat.strikeOuts),
    hitByPitch: hbp,
    sacFlies,
    totalBases,
    wins: toNumber(stat.wins),
    saves: toNumber(stat.saves),
    earnedRuns: toNumber(stat.earnedRuns),
    ipOuts
  };
}

function combineStats(stats) {
  return stats.reduce((total, stat) => {
    Object.entries(stat).forEach(([key, value]) => {
      total[key] = (total[key] || 0) + toNumber(value);
    });
    return total;
  }, {});
}

function collapseSeasonRows(rows) {
  const bySeason = new Map();
  rows.forEach((row) => {
    if (!bySeason.has(row.season)) bySeason.set(row.season, []);
    bySeason.get(row.season).push(row);
  });
  return Array.from(bySeason.entries()).map(([season, seasonRows]) => {
    const aggregate = seasonRows.find((row) => row.isAggregate);
    if (aggregate) return { season, stat: aggregate.stat };
    return { season, stat: combineStats(seasonRows.map((row) => row.stat)) };
  }).sort((a, b) => a.season - b.season);
}

async function fetchSeasonStat(player, year) {
  const cacheKey = `${player.id}:${activeGroup}:${year}`;
  if (statsCache.has(cacheKey)) return statsCache.get(cacheKey);
  const params = new URLSearchParams({ stats: "season", group: activeGroup, season: String(year) });
  const data = await fetchJson(`https://statsapi.mlb.com/api/v1/people/${player.id}/stats?${params.toString()}`);
  const stat = mapSeasonStat(data.stats?.[0]?.splits?.[0]?.stat || {});
  statsCache.set(cacheKey, stat);
  return stat;
}

function hasUsefulStat(stat) {
  if (activeGroup === "pitching") return toNumber(stat.ipOuts) > 0 || toNumber(stat.gamesPlayed) > 0;
  return toNumber(stat.plateAppearances) > 0 || toNumber(stat.atBats) > 0 || toNumber(stat.gamesPlayed) > 0;
}

function debutYear(player) {
  const year = Number(String(player.mlbDebutDate || "").slice(0, 4));
  return Number.isFinite(year) && year >= firstSeason ? year : firstSeason;
}

async function fetchFirstSeasonRows(player) {
  const cacheKey = firstSeasonRowsKey(player);
  if (firstSeasonRowsCache.has(cacheKey)) return firstSeasonRowsCache.get(cacheKey);
  let rows = [];
  try {
    const params = new URLSearchParams({ stats: "yearByYear", group: activeGroup });
    const data = await fetchJson(`https://statsapi.mlb.com/api/v1/people/${player.id}/stats?${params.toString()}`);
    rows = (data.stats?.[0]?.splits || [])
      .map((split) => ({ season: Number(split.season), stat: mapSeasonStat(split.stat || {}), isAggregate: !split.team }))
      .filter((row) => Number.isFinite(row.season) && hasUsefulStat(row.stat))
      .sort((a, b) => a.season - b.season);
    rows = collapseSeasonRows(rows);
  } catch (error) {
    rows = [];
  }
  if (!rows.length) {
    const start = debutYear(player);
    for (const year of yearList(start, lastSeason)) {
      const stat = await fetchSeasonStat(player, year);
      if (hasUsefulStat(stat)) rows.push({ season: year, stat });
      if (rows.length === 20) break;
    }
  }
  firstSeasonRowsCache.set(cacheKey, rows);
  return rows;
}

async function playerStats(player, side) {
  const range = activeMode === "careerSeasons" ? careerWindowForSide(side) : careerSeasonRange();
  const stats = activeMode === "career"
    ? (await fetchFirstSeasonRows(player)).map((row) => row.stat)
    : activeMode === "careerSeasons"
      ? (await fetchFirstSeasonRows(player)).slice(range.start - 1, range.end).map((row) => row.stat)
      : await Promise.all((activeMode === "single" ? [Number(activeSeason)] : yearList(activeRange.start, activeRange.end)).map((year) => fetchSeasonStat(player, year)));
  return finalizeStats(combineStats(stats));
}

function finalizeStats(stat) {
  if (activeGroup === "pitching") {
    stat.inningsPitched = stat.ipOuts / 3;
    stat.era = stat.ipOuts ? (stat.earnedRuns * 27) / stat.ipOuts : 0;
    stat.whip = stat.ipOuts ? ((stat.baseOnBalls + stat.hits) * 3) / stat.ipOuts : 0;
    stat.kPct = safeRate(stat.strikeOuts, stat.battersFaced);
    stat.bbPct = safeRate(stat.baseOnBalls, stat.battersFaced);
    return stat;
  }
  const obpDenominator = stat.atBats + stat.baseOnBalls + stat.hitByPitch + stat.sacFlies;
  stat.avg = safeRate(stat.hits, stat.atBats);
  stat.obp = safeRate(stat.hits + stat.baseOnBalls + stat.hitByPitch, obpDenominator);
  stat.slg = safeRate(stat.totalBases, stat.atBats);
  stat.ops = stat.obp + stat.slg;
  stat.kPct = safeRate(stat.strikeOuts, stat.plateAppearances);
  stat.bbPct = safeRate(stat.baseOnBalls, stat.plateAppearances);
  return stat;
}

function playerScopeLine(player, side) {
  if (activeMode === "career") {
    const rows = firstSeasonRowsCache.get(firstSeasonRowsKey(player)) || [];
    const years = rows.map((row) => row.season).filter(Boolean);
    const seasonText = years.length ? `${years[0]}-${years[years.length - 1]}` : "all MLB seasons";
    return `Full career (${seasonText})`;
  }
  if (activeMode !== "careerSeasons") return `${scopeLabel()} ${activeGroup === "hitting" ? "batting" : "pitching"} line`;
  const range = careerWindowForSide(side);
  const rows = (firstSeasonRowsCache.get(firstSeasonRowsKey(player)) || []).slice(range.start - 1, range.end);
  const years = rows.map((row) => row.season).filter(Boolean);
  if (!years.length) return "Each player's matching career seasons";
  const seasonText = years.length === 1 ? years[0] : `${years[0]}-${years[years.length - 1]}`;
  return `${careerWindowLabel(range)} (${seasonText})`;
}

function formatValue(key, value, digits) {
  if (key === "inningsPitched") return outsToInnings(Math.round(toNumber(value) * 3));
  if (digits > 0) return toNumber(value).toFixed(digits).replace(/^0/, "");
  return new Intl.NumberFormat("en-US").format(Math.round(toNumber(value)));
}

function metricDefinition(key) {
  return metricSets[activeGroup].find(([metricKey]) => metricKey === key) || metricSets[activeGroup][0];
}

function finalizedSeasonRows(rows) {
  return rows.map((row, index) => ({
    season: row.season,
    careerYear: index + 1,
    stat: finalizeStats({ ...row.stat })
  }));
}

function historySeries(rows) {
  return rows.map((row) => ({
    x: historyAxis === "career" ? row.careerYear : row.season,
    season: row.season,
    value: toNumber(row.stat[historyMetric])
  }));
}

function renderHistoryMetricOptions() {
  const select = document.querySelector("#compare-history-metric");
  if (!metricSets[activeGroup].some(([key]) => key === historyMetric)) {
    historyMetric = historyDefaultMetric[activeGroup];
  }
  select.innerHTML = metricSets[activeGroup].map(([key, label]) => `
    <option value="${escapeHtml(key)}">${escapeHtml(label)}</option>
  `).join("");
  select.value = historyMetric;
}

function renderHistoryComparison() {
  const svg = document.querySelector("#compare-history-chart");
  const rowsA = historySeries(historyRowsA);
  const rowsB = historySeries(historyRowsB);
  const [metricKey, metricLabel, , digits] = metricDefinition(historyMetric);
  const allPoints = [...rowsA, ...rowsB];
  if (!allPoints.length) {
    svg.innerHTML = '<text x="50%" y="50%" text-anchor="middle">No year-by-year data available.</text>';
    document.querySelector("#compare-history-table").innerHTML = '<tr><td colspan="3" class="empty-row">No year-by-year data available.</td></tr>';
    return;
  }

  const width = 960;
  const height = 430;
  const margin = { top: 26, right: 30, bottom: 54, left: 72 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xValues = allPoints.map((point) => point.x);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const maxValue = Math.max(...allPoints.map((point) => point.value), 1);
  const minValue = metricKey === "era" || metricKey === "whip" ? Math.min(...allPoints.map((point) => point.value), 0) : 0;
  const valueSpan = Math.max(maxValue - minValue, 1);
  const xPosition = (value) => margin.left + (maxX === minX ? plotWidth / 2 : ((value - minX) / (maxX - minX)) * plotWidth);
  const yPosition = (value) => margin.top + plotHeight - ((value - minValue) / valueSpan) * plotHeight;
  const linePath = (points) => points.map((point, index) => `${index ? "L" : "M"}${xPosition(point.x).toFixed(1)},${yPosition(point.value).toFixed(1)}`).join(" ");
  const tickCount = 5;
  const yTicks = Array.from({ length: tickCount }, (_, index) => minValue + (valueSpan * index) / (tickCount - 1));
  const uniqueX = [...new Set(xValues)].sort((a, b) => a - b);
  const xStep = Math.max(1, Math.ceil(uniqueX.length / 8));
  const xTicks = uniqueX.filter((value, index) => index % xStep === 0 || index === uniqueX.length - 1);
  const pointMarkup = (points, className, playerName) => points.map((point) => `
    <circle class="${className}" cx="${xPosition(point.x).toFixed(1)}" cy="${yPosition(point.value).toFixed(1)}" r="5" tabindex="0">
      <title>${escapeHtml(playerName)} — ${historyAxis === "career" ? `career year ${point.x} (${point.season})` : point.season}: ${escapeHtml(formatValue(metricKey, point.value, digits))} ${escapeHtml(metricLabel)}</title>
    </circle>
  `).join("");

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = `
    <title id="compare-history-chart-title">${escapeHtml(metricLabel)} by ${historyAxis === "career" ? "career year" : "season"} for ${escapeHtml(playerA.fullName)} and ${escapeHtml(playerB.fullName)}</title>
    <desc id="compare-history-chart-desc">A line chart comparing each player's ${escapeHtml(metricLabel)} in every MLB season with available data.</desc>
    ${yTicks.map((value) => `<g class="compare-chart-grid"><line x1="${margin.left}" x2="${width - margin.right}" y1="${yPosition(value)}" y2="${yPosition(value)}"></line><text x="${margin.left - 12}" y="${yPosition(value) + 5}" text-anchor="end">${escapeHtml(formatValue(metricKey, value, digits))}</text></g>`).join("")}
    ${xTicks.map((value) => `<text class="compare-chart-x-label" x="${xPosition(value)}" y="${height - 20}" text-anchor="middle">${value}</text>`).join("")}
    <path class="compare-history-line compare-history-line-a" d="${linePath(rowsA)}"></path>
    <path class="compare-history-line compare-history-line-b" d="${linePath(rowsB)}"></path>
    ${pointMarkup(rowsA, "compare-history-point compare-history-point-a", playerA.fullName)}
    ${pointMarkup(rowsB, "compare-history-point compare-history-point-b", playerB.fullName)}
  `;

  document.querySelector("#compare-history-title").textContent = `${metricLabel} by ${historyAxis === "career" ? "career year" : "season"}`;
  document.querySelector("#compare-history-note").textContent = historyAxis === "career"
    ? "Each player's first MLB season is aligned as Career Year 1."
    : "Every dot represents one MLB season with available data.";
  document.querySelector("#compare-history-legend").innerHTML = `
    <span><i class="compare-legend-a"></i>${escapeHtml(playerA.fullName)}</span>
    <span><i class="compare-legend-b"></i>${escapeHtml(playerB.fullName)}</span>
  `;

  const byXA = new Map(rowsA.map((row) => [row.x, row]));
  const byXB = new Map(rowsB.map((row) => [row.x, row]));
  const tableX = [...new Set([...byXA.keys(), ...byXB.keys()])].sort((a, b) => a - b);
  document.querySelector("#compare-history-axis-heading").textContent = historyAxis === "career" ? "Career year" : "Season";
  document.querySelector("#compare-history-player-a-heading").textContent = playerA.fullName;
  document.querySelector("#compare-history-player-b-heading").textContent = playerB.fullName;
  document.querySelector("#compare-history-table").innerHTML = tableX.map((x) => {
    const a = byXA.get(x);
    const b = byXB.get(x);
    const axisLabel = historyAxis === "career" ? `${x}` : x;
    const seasonDetail = historyAxis === "career" ? `<small>${a?.season || "—"} / ${b?.season || "—"}</small>` : "";
    return `<tr><th scope="row">${axisLabel}${seasonDetail}</th><td>${a ? formatValue(metricKey, a.value, digits) : "—"}</td><td>${b ? formatValue(metricKey, b.value, digits) : "—"}</td></tr>`;
  }).join("");
}

function formatYearByYearValue(key, value, digits, isPercent) {
  if (isPercent) return `${(toNumber(value) * 100).toFixed(digits)}%`;
  return formatValue(key, value, digits);
}

function setCompareView(view, { run = true } = {}) {
  activeCompareView = view === "yearByYear" ? "yearByYear" : "players";
  document.querySelectorAll("[data-compare-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.compareView === activeCompareView);
  });
  document.querySelectorAll(".compare-player-view").forEach((section) => {
    section.hidden = activeCompareView !== "players";
  });
  document.querySelector(".compare-yby-controls").hidden = activeCompareView !== "yearByYear";
  document.querySelector(".compare-yby-results").hidden = activeCompareView !== "yearByYear";
  document.querySelector("#compare-mode-explainer").innerHTML = activeCompareView === "yearByYear"
    ? "<strong>Year over Year:</strong> Compare one player across separate season columns. Choose the player and the first and last seasons below."
    : "<strong>Player vs Player:</strong> Compare two players using one shared season, combined year range, or career scope. To see one player in separate season columns, choose <strong>Year over Year</strong>.";
  const params = new URLSearchParams(window.location.search);
  if (activeCompareView === "yearByYear") params.set("compareView", "yearByYear");
  else params.delete("compareView");
  if (history.replaceState) history.replaceState(null, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}`);
  if (!run) return;
  if (activeCompareView === "yearByYear") runYearByYearComparison();
  else runComparison();
}

function renderYearByYearBoard(rows) {
  const years = yearList(ybyRange.start, ybyRange.end);
  const rowsBySeason = new Map(rows.map((row) => [row.season, row]));
  const metrics = yearByYearMetricSets[activeGroup];
  document.querySelector("#compare-yby-title").textContent = `${ybyPlayer.fullName} year over year`;
  document.querySelector("#compare-yby-note").textContent = `${years[0]}-${years[years.length - 1]} ${activeGroup === "hitting" ? "batting" : "pitching"} comparison`;

  const header = `
    <div class="compare-yby-corner">
      <img src="${headshotUrl(ybyPlayer)}" alt="" />
      <strong>${escapeHtml(ybyPlayer.fullName)}</strong>
      <small>${escapeHtml(ybyPlayer.position || "MLB")}</small>
    </div>
    ${years.map((year) => `
      <div class="compare-yby-season-head">
        <img src="${headshotUrl(ybyPlayer)}" alt="" loading="lazy" />
        <strong>${year}</strong>
        <small>${rowsBySeason.has(year) ? "Season" : "No data"}</small>
      </div>
    `).join("")}
  `;

  const metricRows = metrics.map(([key, label, lowerBetter, digits, isPercent = false]) => {
    const available = years.map((year) => rowsBySeason.get(year)?.stat[key]).filter((value) => value !== undefined);
    const minimum = available.length ? Math.min(...available) : 0;
    const maximum = available.length ? Math.max(...available) : 0;
    const span = maximum - minimum;
    return `
      <div class="compare-yby-stat-label">${escapeHtml(label)}</div>
      ${years.map((year) => {
        const seasonRow = rowsBySeason.get(year);
        if (!seasonRow) return '<div class="compare-yby-cell compare-yby-empty"><span>—</span></div>';
        const value = toNumber(seasonRow.stat[key]);
        const score = span ? (lowerBetter ? (maximum - value) / span : (value - minimum) / span) : .5;
        const width = 28 + score * 72;
        const tone = score >= .72 ? "high" : score <= .28 ? "low" : "mid";
        return `
          <div class="compare-yby-cell compare-yby-${tone}">
            <div class="compare-yby-track"><span style="width:${width.toFixed(1)}%"></span></div>
            <strong>${escapeHtml(formatYearByYearValue(key, value, digits, isPercent))}</strong>
          </div>
        `;
      }).join("")}
    `;
  }).join("");

  const board = document.querySelector("#compare-yby-board");
  board.style.setProperty("--compare-season-columns", years.length);
  board.innerHTML = `<div class="compare-yby-grid">${header}${metricRows}</div>`;
}

async function runYearByYearComparison() {
  const status = document.querySelector("#compare-yby-status");
  status.textContent = "Loading seasons...";
  try {
    await hydrateYearByYearPlayer();
    let start = Number(document.querySelector("#compare-yby-start").value);
    let end = Number(document.querySelector("#compare-yby-end").value);
    if (start > end) [start, end] = [end, start];
    if (end - start > 7) start = end - 7;
    ybyRange = { start, end };
    document.querySelector("#compare-yby-start").value = start;
    document.querySelector("#compare-yby-end").value = end;
    const rawRows = await fetchFirstSeasonRows(ybyPlayer);
    const allRows = finalizedSeasonRows(rawRows);
    let rows = allRows.filter((row) => row.season >= start && row.season <= end);
    if (!rows.length && allRows.length) {
      end = allRows[allRows.length - 1].season;
      start = Math.max(allRows[0].season, end - 4);
      ybyRange = { start, end };
      document.querySelector("#compare-yby-start").value = start;
      document.querySelector("#compare-yby-end").value = end;
      rows = allRows.filter((row) => row.season >= start && row.season <= end);
    }
    renderYearByYearBoard(rows);
    status.textContent = rows.length ? "Comparison loaded" : "No seasons found";
  } catch (error) {
    status.textContent = "Could not load player";
    document.querySelector("#compare-yby-board").innerHTML = '<p class="empty-note">Could not load that player. Try another name or season range.</p>';
  }
}

function mobileSummaryMetrics() {
  return activeGroup === "pitching"
    ? [["inningsPitched", "IP", 1], ["era", "ERA", 2], ["whip", "WHIP", 2], ["strikeOuts", "SO", 0], ["wins", "W", 0], ["saves", "SV", 0]]
    : [["plateAppearances", "PA", 0], ["hits", "H", 0], ["homeRuns", "HR", 0], ["rbi", "RBI", 0], ["avg", "AVG", 3], ["ops", "OPS", 3]];
}

function comparisonRows(statsA, statsB) {
  return metricSets[activeGroup].map(([key, label, lowerBetter, digits]) => {
    const valueA = statsA[key] || 0;
    const valueB = statsB[key] || 0;
    const tied = Math.abs(valueA - valueB) < .0005;
    const aWins = !tied && (lowerBetter ? valueA < valueB : valueA > valueB);
    const bWins = !tied && !aWins;
    return {
      key,
      label,
      digits,
      lowerBetter,
      valueA,
      valueB,
      tied,
      aWins,
      bWins,
      winner: tied ? "Push" : (aWins ? playerA.fullName : playerB.fullName)
    };
  });
}

function renderComparePlayerPanel(player, side) {
  return `
    <article class="compare-portrait-card">
      <div class="compare-headshot-frame">
        <img src="${headshotUrl(player)}" alt="${escapeHtml(player.fullName)}" loading="lazy" />
      </div>
      <a class="summary-link" href="${escapeHtml(careerUrl(player.fullName))}">${escapeHtml(player.fullName)}</a>
      <small>${escapeHtml(playerScopeLine(player, side))}</small>
    </article>
  `;
}

function renderComparison(statsA, statsB) {
  const rows = comparisonRows(statsA, statsB);
  document.querySelector("#compare-player-a-card").textContent = playerA.fullName;
  document.querySelector("#compare-player-b-card").textContent = playerB.fullName;
  document.querySelector("#compare-player-a-note").textContent = playerA.position || "Player";
  document.querySelector("#compare-player-b-note").textContent = playerB.position || "Player";
  document.querySelector("#compare-scope-card").textContent = scopeLabel();
  document.querySelector("#compare-scope-note").textContent = activeMode === "careerSeasons"
    ? advancedCareerWindowsOpen ? "Custom career windows" : "Each player's own matching career seasons"
    : `${activeGroup === "hitting" ? "Batting" : "Pitching"} comparison`;
  document.querySelector("#compare-table-title").textContent = `${playerA.fullName} vs ${playerB.fullName}`;
  document.querySelector("#compare-player-grid").innerHTML = `
    ${renderComparePlayerPanel(playerA, "a")}
    <div class="compare-vs-mark">
      <img src="statline-logo.png" alt="Stat Line Baseball" />
      <span>${escapeHtml(scopeLabel())}</span>
      <strong>${activeGroup === "hitting" ? "Batting" : "Pitching"}</strong>
    </div>
    ${renderComparePlayerPanel(playerB, "b")}
  `;
  document.querySelector("#compare-table").innerHTML = `
    <tr class="compare-section-row"><td colspan="3">Overall Stats</td></tr>
    ${rows.map((row) => {
    return `
      <tr>
        <td class="compare-value-cell ${row.aWins ? "compare-edge" : ""}">${formatValue(row.key, row.valueA, row.digits)}</td>
        <th scope="row">${escapeHtml(row.label)}</th>
        <td class="compare-value-cell ${row.bWins ? "compare-edge" : ""}">${formatValue(row.key, row.valueB, row.digits)}</td>
      </tr>
    `;
    }).join("")}
  `;
}

async function runComparison() {
  document.querySelector("#compare-status").textContent = "Loading comparison...";
  document.querySelector("#compare-status-card").textContent = "Loading";
  try {
    await Promise.all([hydratePlayer("a"), hydratePlayer("b")]);
    updateShareUrl();
    const [statsA, statsB, rawHistoryA, rawHistoryB] = await Promise.all([
      playerStats(playerA, "a"),
      playerStats(playerB, "b"),
      fetchFirstSeasonRows(playerA),
      fetchFirstSeasonRows(playerB)
    ]);
    historyRowsA = finalizedSeasonRows(rawHistoryA);
    historyRowsB = finalizedSeasonRows(rawHistoryB);
    renderComparison(statsA, statsB);
    renderHistoryMetricOptions();
    renderHistoryComparison();
    document.querySelector("#compare-status").textContent = "Comparison loaded";
    document.querySelector("#compare-status-card").textContent = "Loaded";
  } catch (error) {
    document.querySelector("#compare-status").textContent = "Could not load comparison";
    document.querySelector("#compare-status-card").textContent = "Error";
    document.querySelector("#compare-table").innerHTML = `<tr><td colspan="4" class="empty-row">Could not load those players. Try another name or season.</td></tr>`;
  }
}

function compareShareParams() {
  const params = new URLSearchParams();
  params.set("group", activeGroup);
  params.set("mode", activeMode);
  params.set("a", compactName(playerA.fullName));
  params.set("aId", playerA.id);
  params.set("b", compactName(playerB.fullName));
  params.set("bId", playerB.id);
  params.set("season", activeSeason);
  params.set("start", activeRange.start);
  params.set("end", activeRange.end);
  params.set("csStart", careerSeasonRange().start);
  params.set("csEnd", careerSeasonRange().end);
  if (advancedCareerWindowsOpen) {
    params.set("advanced", "1");
    params.set("aStart", cleanCareerRange(activePlayerCareerWindows.a).start);
    params.set("aEnd", cleanCareerRange(activePlayerCareerWindows.a).end);
    params.set("bStart", cleanCareerRange(activePlayerCareerWindows.b).start);
    params.set("bEnd", cleanCareerRange(activePlayerCareerWindows.b).end);
  }
  if (cardViewActive) params.set("view", "card");
  return params;
}

function shareUrl() {
  const url = new URL(window.location.href);
  url.search = compareShareParams().toString();
  return url.toString();
}

function updateShareUrl() {
  if (!history.replaceState) return;
  history.replaceState(null, "", shareUrl());
}

function renderCardViewState() {
  document.body.classList.toggle("compare-card-view", cardViewActive);
  const button = document.querySelector("#compare-card-view-toggle");
  if (button) button.textContent = cardViewActive ? "Show Criteria" : "Screenshot View";
}

function setCardView(nextValue) {
  cardViewActive = Boolean(nextValue);
  renderCardViewState();
  updateShareUrl();
  if (cardViewActive) {
    document.querySelector(".compare-versus-card")?.scrollIntoView({ block: "start" });
  }
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function showCopyStatus(message) {
  const status = document.querySelector("#compare-copy-status");
  if (!status) return;
  clearTimeout(copyStatusTimer);
  status.textContent = message;
  copyStatusTimer = setTimeout(() => { status.textContent = ""; }, 2200);
}

async function copyCompareLink() {
  try {
    await Promise.all([hydratePlayer("a"), hydratePlayer("b")]);
    const url = shareUrl();
    updateShareUrl();
    await copyText(url);
    showCopyStatus("Copied");
  } catch (error) {
    showCopyStatus("Could not copy");
  }
}

function populateYears() {
  const options = Array.from({ length: lastSeason - firstSeason + 1 }, (_, index) => {
    const year = lastSeason - index;
    return `<option value="${year}">${year}</option>`;
  }).join("");
  document.querySelector("#compare-season").innerHTML = options;
  document.querySelector("#compare-range-start").innerHTML = options;
  document.querySelector("#compare-range-end").innerHTML = options;
  document.querySelector("#compare-yby-start").innerHTML = options;
  document.querySelector("#compare-yby-end").innerHTML = options;
  document.querySelector("#compare-season").value = activeSeason;
  document.querySelector("#compare-range-start").value = activeRange.start;
  document.querySelector("#compare-range-end").value = activeRange.end;
  document.querySelector("#compare-yby-start").value = ybyRange.start;
  document.querySelector("#compare-yby-end").value = ybyRange.end;
}

function updateModeControls() {
  document.querySelectorAll("[data-compare-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.compareMode === activeMode);
  });
  document.querySelector(".compare-controls-panel").setAttribute("data-active-mode", activeMode);
  document.querySelector(".compare-controls-panel").toggleAttribute("data-advanced-career-windows", advancedCareerWindowsOpen);
  document.querySelector("#compare-advanced-toggle").setAttribute("aria-expanded", String(advancedCareerWindowsOpen));
  document.querySelector("#compare-advanced-panel").hidden = !advancedCareerWindowsOpen;
  document.querySelector("#compare-range-start-value").textContent = activeRange.start;
  document.querySelector("#compare-range-end-value").textContent = activeRange.end;
  document.querySelector("#compare-career-season-start-value").textContent = careerSeasonRange().start;
  document.querySelector("#compare-career-season-end-value").textContent = careerSeasonRange().end;
  ["a", "b"].forEach((side) => {
    const range = cleanCareerRange(activePlayerCareerWindows[side]);
    document.querySelector(`#compare-player-${side}-career-start-value`).textContent = range.start;
    document.querySelector(`#compare-player-${side}-career-end-value`).textContent = range.end;
    document.querySelector(`#compare-player-${side}-career-start`).value = range.start;
    document.querySelector(`#compare-player-${side}-career-end`).value = range.end;
  });
}

function bindAutocomplete(side) {
  const input = document.querySelector(`#compare-player-${side}`);
  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const query = cleanPlayerInput(input.value);
    if (query.length < 2) return;
    searchTimer = setTimeout(async () => {
      renderCandidates(side, await searchPeople(query));
    }, 180);
  });
}

function bindYearByYearAutocomplete() {
  const input = document.querySelector("#compare-yby-player");
  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const query = cleanPlayerInput(input.value);
    if (query.length < 2) return;
    searchTimer = setTimeout(async () => {
      renderYearByYearCandidates(await searchPeople(query));
    }, 180);
  });
}

function bindEvents() {
  bindAutocomplete("a");
  bindAutocomplete("b");
  bindYearByYearAutocomplete();
  document.querySelectorAll("[data-compare-view]").forEach((button) => {
    button.addEventListener("click", () => setCompareView(button.dataset.compareView));
  });
  document.querySelector("#run-yby-comparison").addEventListener("click", runYearByYearComparison);
  document.querySelector("#compare-yby-start").addEventListener("change", runYearByYearComparison);
  document.querySelector("#compare-yby-end").addEventListener("change", runYearByYearComparison);
  document.querySelector("#run-comparison").addEventListener("click", runComparison);
  document.querySelector("#copy-compare-link").addEventListener("click", copyCompareLink);
  document.querySelector("#compare-card-view-toggle").addEventListener("click", () => {
    setCardView(!cardViewActive);
  });
  document.querySelector("#compare-history-metric").addEventListener("change", (event) => {
    historyMetric = event.target.value;
    renderHistoryComparison();
  });
  document.querySelectorAll("[data-history-axis]").forEach((button) => {
    button.addEventListener("click", () => {
      historyAxis = button.dataset.historyAxis;
      document.querySelectorAll("[data-history-axis]").forEach((axisButton) => axisButton.classList.toggle("active", axisButton === button));
      renderHistoryComparison();
    });
  });
  document.querySelector("#compare-group").addEventListener("change", (event) => {
    activeGroup = event.target.value;
    historyMetric = historyDefaultMetric[activeGroup];
    if (activeCompareView === "yearByYear") runYearByYearComparison();
    else runComparison();
  });
  document.querySelector("#compare-season").addEventListener("change", (event) => {
    activeSeason = event.target.value;
    activeMode = "single";
    updateModeControls();
    runComparison();
  });
  document.querySelectorAll("[data-compare-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      activeMode = button.dataset.compareMode;
      if (activeMode !== "careerSeasons") advancedCareerWindowsOpen = false;
      updateModeControls();
      runComparison();
    });
  });
  document.querySelector("#compare-advanced-toggle").addEventListener("click", () => {
    advancedCareerWindowsOpen = !advancedCareerWindowsOpen;
    activeMode = "careerSeasons";
    updateModeControls();
    runComparison();
  });
  document.querySelector("#compare-range-start").addEventListener("change", (event) => {
    activeRange.start = Number(event.target.value);
    updateModeControls();
    if (activeMode === "range") runComparison();
  });
  document.querySelector("#compare-range-end").addEventListener("change", (event) => {
    activeRange.end = Number(event.target.value);
    updateModeControls();
    if (activeMode === "range") runComparison();
  });
  document.querySelector("#compare-career-season-start").addEventListener("change", (event) => {
    activeCareerSeasonRange.start = Number(event.target.value);
    if (!advancedCareerWindowsOpen) {
      activePlayerCareerWindows.a.start = Number(event.target.value);
      activePlayerCareerWindows.b.start = Number(event.target.value);
    }
    activeMode = "careerSeasons";
    updateModeControls();
    runComparison();
  });
  document.querySelector("#compare-career-season-end").addEventListener("change", (event) => {
    activeCareerSeasonRange.end = Number(event.target.value);
    if (!advancedCareerWindowsOpen) {
      activePlayerCareerWindows.a.end = Number(event.target.value);
      activePlayerCareerWindows.b.end = Number(event.target.value);
    }
    activeMode = "careerSeasons";
    updateModeControls();
    runComparison();
  });
  ["a", "b"].forEach((side) => {
    document.querySelector(`#compare-player-${side}-career-start`).addEventListener("change", (event) => {
      activePlayerCareerWindows[side].start = Number(event.target.value);
      advancedCareerWindowsOpen = true;
      activeMode = "careerSeasons";
      updateModeControls();
      runComparison();
    });
    document.querySelector(`#compare-player-${side}-career-end`).addEventListener("change", (event) => {
      activePlayerCareerWindows[side].end = Number(event.target.value);
      advancedCareerWindowsOpen = true;
      activeMode = "careerSeasons";
      updateModeControls();
      runComparison();
    });
  });
}

function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  activeCompareView = params.get("compareView") === "yearByYear" ? "yearByYear" : "players";
  cardViewActive = params.get("view") === "card";
  const requestedGroup = params.get("group");
  if (requestedGroup === "hitting" || requestedGroup === "pitching") {
    activeGroup = requestedGroup;
    document.querySelector("#compare-group").value = activeGroup;
  }

  const requestedMode = params.get("mode");
  if (["single", "range", "career", "careerSeasons"].includes(requestedMode)) {
    activeMode = requestedMode;
  }

  const requestedPlayerA = params.get("playerA") || params.get("a");
  const requestedPlayerB = params.get("playerB") || params.get("b");
  const requestedPlayerAId = params.get("aId");
  const requestedPlayerBId = params.get("bId");
  if (requestedPlayerA) {
    document.querySelector("#compare-player-a").value = requestedPlayerA;
    if (requestedPlayerAId) {
      playerA = { ...playerA, id: Number(requestedPlayerAId), fullName: requestedPlayerA };
      candidatesA = [playerA];
    }
  }
  if (requestedPlayerB) {
    document.querySelector("#compare-player-b").value = requestedPlayerB;
    if (requestedPlayerBId) {
      playerB = { ...playerB, id: Number(requestedPlayerBId), fullName: requestedPlayerB };
      candidatesB = [playerB];
    }
  }
  if (params.get("season")) activeSeason = params.get("season");
  if (params.get("start")) activeRange.start = Number(params.get("start"));
  if (params.get("end")) activeRange.end = Number(params.get("end"));
  if (params.get("csStart")) activeCareerSeasonRange.start = Number(params.get("csStart"));
  if (params.get("csEnd")) activeCareerSeasonRange.end = Number(params.get("csEnd"));
  if (params.get("advanced") === "1") advancedCareerWindowsOpen = true;
  ["a", "b"].forEach((side) => {
    const start = params.get(`${side}Start`);
    const end = params.get(`${side}End`);
    if (start) activePlayerCareerWindows[side].start = Number(start);
    if (end) activePlayerCareerWindows[side].end = Number(end);
  });
  document.querySelector("#compare-season").value = activeSeason;
  document.querySelector("#compare-range-start").value = activeRange.start;
  document.querySelector("#compare-range-end").value = activeRange.end;
  document.querySelector("#compare-career-season-start").value = activeCareerSeasonRange.start;
  document.querySelector("#compare-career-season-end").value = activeCareerSeasonRange.end;
}

function initializeComparePage() {
  populateYears();
  applyUrlParams();
  updateModeControls();
  renderCardViewState();
  bindEvents();
  setCompareView(activeCompareView, { run: false });
  if (activeCompareView === "yearByYear") runYearByYearComparison();
  else runComparison();
}

initializeComparePage();
