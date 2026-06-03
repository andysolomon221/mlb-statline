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
let playerA = { id: 592450, fullName: "Aaron Judge", position: "OF", mlbDebutDate: "2016-08-13" };
let playerB = { id: 660271, fullName: "Shohei Ohtani", position: "DH", mlbDebutDate: "2018-03-29" };
let candidatesA = [playerA];
let candidatesB = [playerB];
let searchTimer;

const metricSets = {
  hitting: [
    ["gamesPlayed", "G", false, 0],
    ["plateAppearances", "PA", false, 0],
    ["atBats", "AB", false, 0],
    ["hits", "H", false, 0],
    ["homeRuns", "HR", false, 0],
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
  if (activeMode === "careerSeasons") {
    const range = careerSeasonRange();
    return range.start === range.end ? `Career season ${range.start}` : `Career seasons ${range.start}-${range.end}`;
  }
  return activeRange.start === activeRange.end ? String(activeRange.start) : `${activeRange.start}-${activeRange.end}`;
}

function baseballReferenceSearchUrl(name) {
  return `https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(name)}`;
}

function firstSeasonRowsKey(player) {
  return `${player.id}:${activeGroup}:first-seasons`;
}

function careerSeasonRange() {
  const cleanStart = Math.max(1, Math.floor(toNumber(activeCareerSeasonRange.start)) || 1);
  const cleanEnd = Math.max(1, Math.floor(toNumber(activeCareerSeasonRange.end)) || cleanStart);
  const start = Math.min(cleanStart, cleanEnd);
  const end = Math.max(cleanStart, cleanEnd);
  return { start, end };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request returned ${response.status}`);
  return response.json();
}

function cleanPlayerInput(value) {
  return value.replace(/\s+-\s+[^()]+(?:\s+\([^)]+\))?$/, "").replace(/\s+\([^)]+\)$/, "").trim();
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
  peopleCache.set(cacheKey, people);
  return people;
}

function renderCandidates(side, people) {
  const unique = Array.from(new Map(people.map((person) => [Number(person.id), person])).values());
  if (side === "a") candidatesA = unique;
  else candidatesB = unique;
  document.querySelector(`#compare-player-${side}-options`).innerHTML = unique.map((person) => `
    <option value="${escapeHtml(displayPlayerOption(person))}" label="${escapeHtml(person.fullName)}"></option>
  `).join("");
}

async function hydratePlayer(side) {
  const input = document.querySelector(`#compare-player-${side}`);
  const clean = cleanPlayerInput(input.value);
  const candidates = side === "a" ? candidatesA : candidatesB;
  let match = candidates.find((person) => person.fullName.toLowerCase() === clean.toLowerCase());
  if (!match) {
    const people = await searchPeople(clean);
    renderCandidates(side, people);
    match = people[0];
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
    atBats,
    hits,
    homeRuns: toNumber(stat.homeRuns),
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
      .map((split) => ({ season: Number(split.season), stat: mapSeasonStat(split.stat || {}) }))
      .filter((row) => Number.isFinite(row.season) && hasUsefulStat(row.stat))
      .sort((a, b) => a.season - b.season);
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

async function playerStats(player) {
  const range = careerSeasonRange();
  const stats = activeMode === "careerSeasons"
    ? (await fetchFirstSeasonRows(player)).slice(range.start - 1, range.end).map((row) => row.stat)
    : await Promise.all((activeMode === "single" ? [Number(activeSeason)] : yearList(activeRange.start, activeRange.end)).map((year) => fetchSeasonStat(player, year)));
  return finalizeStats(stats.reduce((total, stat) => {
    Object.entries(stat).forEach(([key, value]) => {
      total[key] = (total[key] || 0) + toNumber(value);
    });
    return total;
  }, {}));
}

function finalizeStats(stat) {
  if (activeGroup === "pitching") {
    stat.inningsPitched = stat.ipOuts / 3;
    stat.era = stat.ipOuts ? (stat.earnedRuns * 27) / stat.ipOuts : 0;
    stat.whip = stat.ipOuts ? ((stat.baseOnBalls + stat.hits) * 3) / stat.ipOuts : 0;
    return stat;
  }
  const obpDenominator = stat.atBats + stat.baseOnBalls + stat.hitByPitch + stat.sacFlies;
  stat.avg = safeRate(stat.hits, stat.atBats);
  stat.obp = safeRate(stat.hits + stat.baseOnBalls + stat.hitByPitch, obpDenominator);
  stat.slg = safeRate(stat.totalBases, stat.atBats);
  stat.ops = stat.obp + stat.slg;
  return stat;
}

function playerScopeLine(player) {
  if (activeMode !== "careerSeasons") return `${scopeLabel()} ${activeGroup === "hitting" ? "batting" : "pitching"} line`;
  const range = careerSeasonRange();
  const rows = (firstSeasonRowsCache.get(firstSeasonRowsKey(player)) || []).slice(range.start - 1, range.end);
  const years = rows.map((row) => row.season).filter(Boolean);
  if (!years.length) return "Each player's matching career seasons";
  const seasonText = years.length === 1 ? years[0] : `${years[0]}-${years[years.length - 1]}`;
  const careerText = range.start === range.end ? `career season ${range.start}` : `career seasons ${range.start}-${range.end}`;
  return `${careerText} (${seasonText})`;
}

function formatValue(key, value, digits) {
  if (key === "inningsPitched") return outsToInnings(Math.round(toNumber(value) * 3));
  if (digits > 0) return toNumber(value).toFixed(digits).replace(/^0/, "");
  return new Intl.NumberFormat("en-US").format(Math.round(toNumber(value)));
}

function renderComparison(statsA, statsB) {
  const metrics = metricSets[activeGroup];
  document.querySelector("#compare-head-a").textContent = playerA.fullName;
  document.querySelector("#compare-head-b").textContent = playerB.fullName;
  document.querySelector("#compare-player-a-card").textContent = playerA.fullName;
  document.querySelector("#compare-player-b-card").textContent = playerB.fullName;
  document.querySelector("#compare-player-a-note").textContent = playerA.position || "Player";
  document.querySelector("#compare-player-b-note").textContent = playerB.position || "Player";
  document.querySelector("#compare-scope-card").textContent = scopeLabel();
  document.querySelector("#compare-scope-note").textContent = activeMode === "careerSeasons"
    ? `Each player's own matching career seasons`
    : `${activeGroup === "hitting" ? "Batting" : "Pitching"} comparison`;
  document.querySelector("#compare-table-title").textContent = `${playerA.fullName} vs ${playerB.fullName}`;
  document.querySelector("#compare-player-grid").innerHTML = [playerA, playerB].map((player) => `
    <article class="fantasy-note-card">
      <span>${player.position || "MLB"}</span>
      <strong><a class="summary-link" href="${baseballReferenceSearchUrl(player.fullName)}" target="_blank" rel="noopener noreferrer">${escapeHtml(player.fullName)}</a></strong>
      <small>${escapeHtml(playerScopeLine(player))}</small>
    </article>
  `).join("");
  document.querySelector("#compare-table").innerHTML = metrics.map(([key, label, lowerBetter, digits]) => {
    const valueA = statsA[key] || 0;
    const valueB = statsB[key] || 0;
    const tied = Math.abs(valueA - valueB) < .0005;
    const aWins = !tied && (lowerBetter ? valueA < valueB : valueA > valueB);
    const edge = tied ? "Push" : (aWins ? playerA.fullName : playerB.fullName);
    return `
      <tr>
        <td>${label}</td>
        <td class="${aWins ? "compare-edge" : ""}">${formatValue(key, valueA, digits)}</td>
        <td class="${!aWins && !tied ? "compare-edge" : ""}">${formatValue(key, valueB, digits)}</td>
        <td>${escapeHtml(edge)}</td>
      </tr>
    `;
  }).join("");
}

async function runComparison() {
  document.querySelector("#compare-status").textContent = "Loading comparison...";
  document.querySelector("#compare-status-card").textContent = "Loading";
  try {
    await Promise.all([hydratePlayer("a"), hydratePlayer("b")]);
    const [statsA, statsB] = await Promise.all([playerStats(playerA), playerStats(playerB)]);
    renderComparison(statsA, statsB);
    document.querySelector("#compare-status").textContent = "Comparison loaded";
    document.querySelector("#compare-status-card").textContent = "Loaded";
  } catch (error) {
    document.querySelector("#compare-status").textContent = "Could not load comparison";
    document.querySelector("#compare-status-card").textContent = "Error";
    document.querySelector("#compare-table").innerHTML = `<tr><td colspan="4" class="empty-row">Could not load those players. Try another name or season.</td></tr>`;
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
  document.querySelector("#compare-season").value = activeSeason;
  document.querySelector("#compare-range-start").value = activeRange.start;
  document.querySelector("#compare-range-end").value = activeRange.end;
}

function updateModeControls() {
  document.querySelectorAll("[data-compare-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.compareMode === activeMode);
  });
  document.querySelector(".compare-controls-panel").setAttribute("data-active-mode", activeMode);
  document.querySelector("#compare-range-start-value").textContent = activeRange.start;
  document.querySelector("#compare-range-end-value").textContent = activeRange.end;
  document.querySelector("#compare-career-season-start-value").textContent = careerSeasonRange().start;
  document.querySelector("#compare-career-season-end-value").textContent = careerSeasonRange().end;
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

function bindEvents() {
  bindAutocomplete("a");
  bindAutocomplete("b");
  document.querySelector("#run-comparison").addEventListener("click", runComparison);
  document.querySelector("#compare-group").addEventListener("change", (event) => {
    activeGroup = event.target.value;
    runComparison();
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
      updateModeControls();
      runComparison();
    });
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
    activeMode = "careerSeasons";
    updateModeControls();
    runComparison();
  });
  document.querySelector("#compare-career-season-end").addEventListener("change", (event) => {
    activeCareerSeasonRange.end = Number(event.target.value);
    activeMode = "careerSeasons";
    updateModeControls();
    runComparison();
  });
}

populateYears();
updateModeControls();
bindEvents();
runComparison();
