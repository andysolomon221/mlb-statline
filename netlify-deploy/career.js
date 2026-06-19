const firstCareerSeason = 1901;
const lastCareerSeason = 2026;
const peopleCache = new Map();
const careerCache = new Map();

let selectedPlayer = { id: 592450, fullName: "Aaron Judge", position: "OF", mlbDebutDate: "2016-08-13" };
let activeGroup = "hitting";
let activeSort = "season";
let playerCandidates = [selectedPlayer];
let searchTimer;

const careerColumns = {
  hitting: [
    ["season", "Year"],
    ["team", "Team"],
    ["gamesPlayed", "G"],
    ["plateAppearances", "PA"],
    ["atBats", "AB"],
    ["hits", "H"],
    ["homeRuns", "HR"],
    ["stolenBases", "SB"],
    ["rbi", "RBI"],
    ["strikeOuts", "SO"],
    ["avg", "AVG"],
    ["obp", "OBP"],
    ["slg", "SLG"],
    ["ops", "OPS"]
  ],
  pitching: [
    ["season", "Year"],
    ["team", "Team"],
    ["gamesPlayed", "G"],
    ["gamesStarted", "GS"],
    ["inningsPitched", "IP"],
    ["wins", "W"],
    ["losses", "L"],
    ["saves", "SV"],
    ["blownSaves", "BS"],
    ["hits", "H"],
    ["earnedRuns", "ER"],
    ["baseOnBalls", "BB"],
    ["strikeOuts", "SO"],
    ["era", "ERA"],
    ["whip", "WHIP"]
  ]
};

const rateStats = new Set(["avg", "obp", "slg", "ops", "era", "whip"]);
const lowerBetter = new Set(["era", "whip", "hits", "earnedRuns", "baseOnBalls"]);

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

function baseballReferenceSearchUrl(name) {
  return `https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(name)}`;
}

function cleanPlayerInput(value) {
  return String(value || "").replace(/\s+-\s+[^()]+(?:\s+\([^)]+\))?$/, "").replace(/\s+\([^)]+\)$/, "").trim();
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
  return people.slice().sort((a, b) => {
    const rankDiff = playerSearchRank(b, query) - playerSearchRank(a, query);
    if (rankDiff) return rankDiff;
    return String(a.birthDate || "").localeCompare(String(b.birthDate || ""));
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request returned ${response.status}`);
  return response.json();
}

async function searchPeople(query) {
  const clean = cleanPlayerInput(query);
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
    birthDate: person.birthDate || "",
    mlbDebutDate: person.mlbDebutDate || ""
  }));
  const ranked = rankPeople(people, clean);
  peopleCache.set(cacheKey, ranked);
  return ranked;
}

function renderCandidates(people) {
  playerCandidates = Array.from(new Map(people.map((person) => [Number(person.id), person])).values());
  document.querySelector("#career-player-options").innerHTML = playerCandidates.map((person) => `
    <option value="${escapeHtml(displayPlayerOption(person))}" label="${escapeHtml(person.fullName)}"></option>
  `).join("");
}

async function hydrateSelectedPlayer() {
  const input = document.querySelector("#career-player-query");
  const rawValue = input.value.trim();
  const clean = cleanPlayerInput(input.value);
  let match = playerCandidates.find((person) => normalizeName(displayPlayerOption(person)) === normalizeName(rawValue));
  if (!match) {
    const exactCandidates = rankPeople(playerCandidates.filter((person) => normalizeName(person.fullName) === normalizeName(clean)), clean);
    match = exactCandidates.length > 1 ? await bestCareerCandidate(exactCandidates) : exactCandidates[0];
  }
  if (!match) {
    const people = await searchPeople(clean);
    renderCandidates(people);
    const exactCandidates = people.filter((person) => normalizeName(person.fullName) === normalizeName(clean));
    match = exactCandidates.length > 1 ? await bestCareerCandidate(exactCandidates) : people[0];
  }
  if (!match) throw new Error(`Could not find ${clean}`);
  selectedPlayer = match;
  input.value = match.fullName;
  document.querySelector("#career-reference-link").href = baseballReferenceSearchUrl(match.fullName);
}

function mapSeasonRow(split) {
  const stat = split.stat || {};
  const atBats = toNumber(stat.atBats);
  const hits = toNumber(stat.hits);
  const walks = toNumber(stat.baseOnBalls);
  const hbp = toNumber(stat.hitByPitch);
  const sacFlies = toNumber(stat.sacFlies);
  const totalBases = toNumber(stat.totalBases) || Math.round(toNumber(stat.slg) * atBats);
  const ipOuts = toNumber(stat.outs) || inningsToOuts(stat.inningsPitched);
  return {
    season: Number(split.season) || 0,
    team: split.team?.abbreviation || split.team?.teamName || split.team?.name || "MLB",
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
    avg: toNumber(stat.avg),
    obp: toNumber(stat.obp),
    slg: toNumber(stat.slg),
    ops: toNumber(stat.ops),
    inningsPitched: stat.inningsPitched || outsToInnings(ipOuts),
    wins: toNumber(stat.wins),
    losses: toNumber(stat.losses),
    saves: toNumber(stat.saves),
    blownSaves: toNumber(stat.blownSaves),
    earnedRuns: toNumber(stat.earnedRuns),
    era: toNumber(stat.era),
    whip: toNumber(stat.whip),
    ipOuts
  };
}

function combineRows(rows) {
  const teamList = Array.from(new Set(rows.flatMap((row) => row.teamList || [row.team]).filter(Boolean)));
  const combined = rows.reduce((acc, row) => {
    ["gamesPlayed", "gamesStarted", "plateAppearances", "atBats", "hits", "homeRuns", "stolenBases", "rbi", "baseOnBalls", "strikeOuts", "hitByPitch", "sacFlies", "totalBases", "wins", "losses", "saves", "blownSaves", "earnedRuns", "ipOuts"].forEach((key) => {
      acc[key] += toNumber(row[key]);
    });
    return acc;
  }, {
    season: rows[0]?.season || 0,
    team: teamList.length ? teamList.join("/") : "MLB",
    teamList,
    multiTeam: teamList.length > 1,
    gamesPlayed: 0,
    gamesStarted: 0,
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    homeRuns: 0,
    stolenBases: 0,
    rbi: 0,
    baseOnBalls: 0,
    strikeOuts: 0,
    hitByPitch: 0,
    sacFlies: 0,
    totalBases: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    blownSaves: 0,
    earnedRuns: 0,
    ipOuts: 0
  });
  combined.avg = safeRate(combined.hits, combined.atBats);
  combined.obp = safeRate(combined.hits + combined.baseOnBalls + combined.hitByPitch, combined.atBats + combined.baseOnBalls + combined.hitByPitch + combined.sacFlies);
  combined.slg = safeRate(combined.totalBases, combined.atBats);
  combined.ops = combined.obp + combined.slg;
  combined.era = combined.ipOuts ? (combined.earnedRuns * 27) / combined.ipOuts : 0;
  combined.whip = combined.ipOuts ? ((combined.baseOnBalls + combined.hits) * 3) / combined.ipOuts : 0;
  combined.inningsPitched = outsToInnings(combined.ipOuts);
  return combined;
}

function collapseCareerRows(rows) {
  const bySeason = new Map();
  rows.forEach((row) => {
    if (!bySeason.has(row.season)) bySeason.set(row.season, []);
    bySeason.get(row.season).push(row);
  });
  return Array.from(bySeason.values()).map((seasonRows) => {
    const teamRows = seasonRows.filter((row) => !row.isAggregate);
    const teamList = Array.from(new Set(teamRows.map((row) => row.team).filter(Boolean)));
    if (seasonRows.length === 1 && !seasonRows[0].isAggregate) {
      return { ...seasonRows[0], teamList, multiTeam: false };
    }
    const aggregate = seasonRows.find((row) => row.isAggregate);
    if (aggregate) {
      return {
        ...aggregate,
        team: teamList.length > 1 ? teamList.join("/") : (teamList[0] || aggregate.team),
        teamList: teamList.length ? teamList : [aggregate.team].filter(Boolean),
        multiTeam: teamList.length > 1
      };
    }
    return combineRows(seasonRows);
  }).sort((a, b) => a.season - b.season);
}

function hasUsefulRow(row) {
  if (row.season < firstCareerSeason || row.season > lastCareerSeason) return false;
  if (activeGroup === "pitching") return row.ipOuts > 0 || row.gamesPlayed > 0;
  return row.plateAppearances > 0 || row.atBats > 0 || row.gamesPlayed > 0;
}

async function fetchCareerRowsFor(player, group = activeGroup) {
  const cacheKey = `${player.id}:${group}`;
  if (careerCache.has(cacheKey)) return careerCache.get(cacheKey);
  const params = new URLSearchParams({ stats: "yearByYear", group, sportId: "1", hydrate: "team" });
  const data = await fetchJson(`https://statsapi.mlb.com/api/v1/people/${player.id}/stats?${params.toString()}`);
  const rows = collapseCareerRows((data.stats?.[0]?.splits || [])
    .map((split) => ({ ...mapSeasonRow(split), isAggregate: !split.team }))
    .filter(hasUsefulRow)
    .sort((a, b) => a.season - b.season));
  careerCache.set(cacheKey, rows);
  return rows;
}

async function bestCareerCandidate(people) {
  const scored = await Promise.all(people.map(async (person) => {
    try {
      const rows = await fetchCareerRowsFor(person);
      const totals = careerTotals(rows);
      const volume = activeGroup === "pitching" ? totals.ipOuts : totals.plateAppearances;
      return { person, score: rows.length * 10000 + volume };
    } catch (error) {
      return { person, score: 0 };
    }
  }));
  scored.sort((a, b) => b.score - a.score || playerSearchRank(b.person, b.person.fullName) - playerSearchRank(a.person, a.person.fullName));
  return scored[0]?.person;
}

async function fetchCareerRows() {
  return fetchCareerRowsFor(selectedPlayer);
}

function careerTotals(rows) {
  const totals = rows.reduce((acc, row) => {
    ["gamesPlayed", "gamesStarted", "plateAppearances", "atBats", "hits", "homeRuns", "stolenBases", "rbi", "baseOnBalls", "strikeOuts", "hitByPitch", "sacFlies", "totalBases", "wins", "losses", "saves", "blownSaves", "earnedRuns", "ipOuts"].forEach((key) => {
      acc[key] += toNumber(row[key]);
    });
    return acc;
  }, {
    gamesPlayed: 0,
    gamesStarted: 0,
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    homeRuns: 0,
    stolenBases: 0,
    rbi: 0,
    baseOnBalls: 0,
    strikeOuts: 0,
    hitByPitch: 0,
    sacFlies: 0,
    totalBases: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    blownSaves: 0,
    earnedRuns: 0,
    ipOuts: 0
  });
  totals.avg = safeRate(totals.hits, totals.atBats);
  totals.obp = safeRate(totals.hits + totals.baseOnBalls + totals.hitByPitch, totals.atBats + totals.baseOnBalls + totals.hitByPitch + totals.sacFlies);
  totals.slg = safeRate(totals.totalBases, totals.atBats);
  totals.ops = totals.obp + totals.slg;
  totals.era = totals.ipOuts ? (totals.earnedRuns * 27) / totals.ipOuts : 0;
  totals.whip = totals.ipOuts ? ((totals.baseOnBalls + totals.hits) * 3) / totals.ipOuts : 0;
  totals.inningsPitched = outsToInnings(totals.ipOuts);
  return totals;
}

function fmt(key, value) {
  if (key === "team") return escapeHtml(value || "");
  if (key === "season") return String(value || "");
  if (key === "inningsPitched") return escapeHtml(value || "0.0");
  if (["avg", "obp", "slg", "ops"].includes(key)) return toNumber(value).toFixed(3).replace(/^0/, "");
  if (["era", "whip"].includes(key)) return toNumber(value).toFixed(2);
  return Math.round(toNumber(value)).toLocaleString("en-US");
}

function sortedRows(rows) {
  const sort = activeSort;
  const direction = sort === "season" ? 1 : lowerBetter.has(sort) ? 1 : -1;
  return rows.slice().sort((a, b) => {
    if (sort === "team") return String(a.team).localeCompare(String(b.team));
    return (toNumber(a[sort]) - toNumber(b[sort])) * direction;
  });
}

function updateSortOptions() {
  const sort = document.querySelector("#career-sort");
  const options = activeGroup === "pitching"
    ? [["season", "Season"], ["era", "ERA"], ["whip", "WHIP"], ["strikeOuts", "SO"], ["wins", "W"], ["saves", "SV"], ["blownSaves", "BS"]]
    : [["season", "Season"], ["ops", "OPS"], ["homeRuns", "HR"], ["stolenBases", "SB"], ["hits", "H"], ["rbi", "RBI"], ["strikeOuts", "SO"], ["avg", "AVG"]];
  sort.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  if (!options.some(([value]) => value === activeSort)) activeSort = "season";
  sort.value = activeSort;
}

function renderHead() {
  document.querySelector("#career-head").innerHTML = `
    <tr>
      ${careerColumns[activeGroup].map(([key, label]) => `<th data-career-sort="${key}">${label}</th>`).join("")}
    </tr>
  `;
  document.querySelectorAll("th[data-career-sort]").forEach((heading) => {
    heading.addEventListener("click", () => {
      activeSort = heading.dataset.careerSort;
      document.querySelector("#career-sort").value = activeSort;
      renderCareer();
    });
  });
}

function renderSummary(rows) {
  const totals = careerTotals(rows);
  const first = rows[0]?.season || "--";
  const last = rows[rows.length - 1]?.season || "--";
  document.querySelector("#career-player-name").textContent = selectedPlayer.fullName;
  document.querySelector("#career-player-note").textContent = selectedPlayer.position ? `${selectedPlayer.position} career log` : "Career log";
  document.querySelector("#career-season-count").textContent = rows.length ? String(rows.length) : "--";
  document.querySelector("#career-season-note").textContent = rows.length ? `${first}-${last}` : "No seasons found";
  if (activeGroup === "pitching") {
    document.querySelector("#career-total-label").textContent = "Career SO";
    document.querySelector("#career-total-primary").textContent = fmt("strikeOuts", totals.strikeOuts);
    document.querySelector("#career-total-note").textContent = `${fmt("inningsPitched", totals.inningsPitched)} IP`;
    document.querySelector("#career-rate-label").textContent = "Career ERA";
    document.querySelector("#career-rate-primary").textContent = fmt("era", totals.era);
    document.querySelector("#career-rate-note").textContent = `${fmt("whip", totals.whip)} WHIP`;
  } else {
    document.querySelector("#career-total-label").textContent = "Career HR";
    document.querySelector("#career-total-primary").textContent = fmt("homeRuns", totals.homeRuns);
    document.querySelector("#career-total-note").textContent = `${fmt("stolenBases", totals.stolenBases)} SB`;
    document.querySelector("#career-rate-label").textContent = "Career OPS";
    document.querySelector("#career-rate-primary").textContent = fmt("ops", totals.ops);
    document.querySelector("#career-rate-note").textContent = `${fmt("hits", totals.hits)} hits`;
  }
}

function renderTeamTimeline(rows) {
  const timeline = [];
  rows.forEach((row) => {
    const teams = row.teamList?.length ? row.teamList : [row.team];
    teams.filter(Boolean).forEach((team) => {
      const previous = timeline[timeline.length - 1];
      if (previous && previous.team === team && row.season <= previous.end + 1) {
        previous.end = Math.max(previous.end, row.season);
      } else {
        timeline.push({ team, start: row.season, end: row.season });
      }
    });
  });
  document.querySelector("#career-team-timeline").innerHTML = timeline.length ? timeline.map((item) => {
    const years = item.start === item.end ? item.start : `${item.start}-${item.end}`;
    return `<span class="career-team-chip"><strong>${escapeHtml(item.team)}</strong><small>${years}</small></span>`;
  }).join("") : `<span class="career-team-chip"><strong>No teams found</strong><small>Try another player</small></span>`;
}

function renderRows(rows) {
  const visible = sortedRows(rows);
  const totals = careerTotals(rows);
  document.querySelector("#career-table").innerHTML = visible.map((row) => `
    <tr>
      ${careerColumns[activeGroup].map(([key]) => `<td>${fmt(key, row[key])}</td>`).join("")}
    </tr>
  `).join("") + (rows.length ? `
    <tr class="total-row">
      ${careerColumns[activeGroup].map(([key]) => {
        if (key === "season") return `<td>Career</td>`;
        if (key === "team") return `<td>MLB</td>`;
        return `<td>${fmt(key, totals[key])}</td>`;
      }).join("")}
    </tr>
  ` : `<tr><td colspan="${careerColumns[activeGroup].length}" class="empty-row">No career seasons found for this player and stat type.</td></tr>`);
}

async function renderCareer() {
  renderHead();
  updateSortOptions();
  document.querySelector("#career-status").textContent = "Loading career data...";
  document.querySelector("#career-table-title").textContent = activeGroup === "pitching" ? "Pitching seasons" : "Batting seasons";
  document.querySelector("#career-table").innerHTML = `<tr><td colspan="${careerColumns[activeGroup].length}" class="empty-row">Loading career data...</td></tr>`;
  try {
    const rows = await fetchCareerRows();
    renderSummary(rows);
    renderTeamTimeline(rows);
    renderRows(rows);
    document.querySelector("#career-status").textContent = rows.length ? `${rows.length} seasons loaded` : "No seasons found";
  } catch (error) {
    document.querySelector("#career-status").textContent = "Could not load career data";
    document.querySelector("#career-team-timeline").innerHTML = `<span class="career-team-chip"><strong>No teams found</strong><small>Try another player</small></span>`;
    document.querySelector("#career-table").innerHTML = `<tr><td colspan="${careerColumns[activeGroup].length}" class="empty-row">Could not load career data. Try another player or stat type.</td></tr>`;
  }
}

async function submitCareerSearch() {
  try {
    await hydrateSelectedPlayer();
    await renderCareer();
  } catch (error) {
    document.querySelector("#career-status").textContent = "Could not find player";
    document.querySelector("#career-table").innerHTML = `<tr><td colspan="${careerColumns[activeGroup].length}" class="empty-row">Could not find that player. Try another name.</td></tr>`;
  }
}

function bindEvents() {
  const input = document.querySelector("#career-player-query");
  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      const people = await searchPeople(input.value);
      renderCandidates(people);
    }, 250);
  });
  input.addEventListener("change", submitCareerSearch);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitCareerSearch();
    }
  });
  document.querySelector("#career-player-submit").addEventListener("click", submitCareerSearch);
  document.querySelector("#career-group").addEventListener("change", (event) => {
    activeGroup = event.target.value;
    activeSort = "season";
    renderCareer();
  });
  document.querySelector("#career-sort").addEventListener("change", (event) => {
    activeSort = event.target.value;
    renderCareer();
  });
}

async function initializeCareerPage() {
  renderCandidates([selectedPlayer]);
  document.querySelector("#career-reference-link").href = baseballReferenceSearchUrl(selectedPlayer.fullName);
  bindEvents();
  const params = new URLSearchParams(window.location.search);
  const requestedGroup = params.get("group");
  if (["hitting", "pitching"].includes(requestedGroup)) {
    activeGroup = requestedGroup;
    document.querySelector("#career-group").value = activeGroup;
    activeSort = "season";
  }
  const requestedPlayer = params.get("player");
  if (requestedPlayer) {
    document.querySelector("#career-player-query").value = requestedPlayer;
    await submitCareerSearch();
    return;
  }
  renderCareer();
}

initializeCareerPage();
