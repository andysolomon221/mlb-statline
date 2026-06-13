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
    return stat;
  }
  const obpDenominator = stat.atBats + stat.baseOnBalls + stat.hitByPitch + stat.sacFlies;
  stat.avg = safeRate(stat.hits, stat.atBats);
  stat.obp = safeRate(stat.hits + stat.baseOnBalls + stat.hitByPitch, obpDenominator);
  stat.slg = safeRate(stat.totalBases, stat.atBats);
  stat.ops = stat.obp + stat.slg;
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

function mobileSummaryMetrics() {
  return activeGroup === "pitching"
    ? [["inningsPitched", "IP", 1], ["era", "ERA", 2], ["whip", "WHIP", 2], ["strikeOuts", "SO", 0], ["wins", "W", 0], ["saves", "SV", 0]]
    : [["plateAppearances", "PA", 0], ["hits", "H", 0], ["homeRuns", "HR", 0], ["rbi", "RBI", 0], ["avg", "AVG", 3], ["ops", "OPS", 3]];
}

function renderMobileCompareStack(statsA, statsB) {
  const cards = [[playerA, statsA], [playerB, statsB]];
  document.querySelector("#compare-mobile-stack").innerHTML = cards.map(([player, stats]) => `
    <article class="compare-mobile-card">
      <span>${escapeHtml(player.position || "MLB")}</span>
      <strong>${escapeHtml(player.fullName)}</strong>
      <small>${escapeHtml(playerScopeLine(player, player === playerA ? "a" : "b"))}</small>
      <div class="compare-mobile-stat-grid">
        ${mobileSummaryMetrics().map(([key, label, digits]) => `
          <div>
            <span>${label}</span>
            <strong>${formatValue(key, stats[key] || 0, digits)}</strong>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
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
    ? advancedCareerWindowsOpen ? "Custom career windows" : "Each player's own matching career seasons"
    : `${activeGroup === "hitting" ? "Batting" : "Pitching"} comparison`;
  document.querySelector("#compare-table-title").textContent = `${playerA.fullName} vs ${playerB.fullName}`;
  document.querySelector("#compare-player-grid").innerHTML = [playerA, playerB].map((player) => `
    <article class="fantasy-note-card">
      <span>${player.position || "MLB"}</span>
      <strong><a class="summary-link" href="${baseballReferenceSearchUrl(player.fullName)}" target="_blank" rel="noopener noreferrer">${escapeHtml(player.fullName)}</a></strong>
      <small>${escapeHtml(playerScopeLine(player, player === playerA ? "a" : "b"))}</small>
    </article>
  `).join("");
  renderMobileCompareStack(statsA, statsB);
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
    const [statsA, statsB] = await Promise.all([playerStats(playerA, "a"), playerStats(playerB, "b")]);
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
  if (requestedPlayerA) document.querySelector("#compare-player-a").value = requestedPlayerA;
  if (requestedPlayerB) document.querySelector("#compare-player-b").value = requestedPlayerB;
}

function initializeComparePage() {
  populateYears();
  applyUrlParams();
  updateModeControls();
  bindEvents();
  runComparison();
}

initializeComparePage();
