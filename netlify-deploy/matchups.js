const firstSeason = 1901;
const lastSeason = 2026;
const peopleCache = new Map();
const statsCache = new Map();
const headToHeadCache = new Map();
const rosterCache = new Map();
const vsTeamCache = new Map();
const scheduleCache = new Map();

const teams = [
  ["ARI", "Arizona Diamondbacks", 109],
  ["ATL", "Atlanta Braves", 144],
  ["BAL", "Baltimore Orioles", 110],
  ["BOS", "Boston Red Sox", 111],
  ["CHC", "Chicago Cubs", 112],
  ["CWS", "Chicago White Sox", 145],
  ["CIN", "Cincinnati Reds", 113],
  ["CLE", "Cleveland Guardians", 114],
  ["COL", "Colorado Rockies", 115],
  ["DET", "Detroit Tigers", 116],
  ["HOU", "Houston Astros", 117],
  ["KC", "Kansas City Royals", 118],
  ["LAA", "Los Angeles Angels", 108],
  ["LAD", "Los Angeles Dodgers", 119],
  ["MIA", "Miami Marlins", 146],
  ["MIL", "Milwaukee Brewers", 158],
  ["MIN", "Minnesota Twins", 142],
  ["NYM", "New York Mets", 121],
  ["NYY", "New York Yankees", 147],
  ["ATH", "Athletics", 133],
  ["PHI", "Philadelphia Phillies", 143],
  ["PIT", "Pittsburgh Pirates", 134],
  ["SD", "San Diego Padres", 135],
  ["SF", "San Francisco Giants", 137],
  ["SEA", "Seattle Mariners", 136],
  ["STL", "St. Louis Cardinals", 138],
  ["TB", "Tampa Bay Rays", 139],
  ["TEX", "Texas Rangers", 140],
  ["TOR", "Toronto Blue Jays", 141],
  ["WSH", "Washington Nationals", 120]
];

const teamNameByAbbr = new Map(teams.map(([abbr, name]) => [abbr, name]));
const teamById = new Map(teams.map(([abbr, name, id]) => [String(id), { abbr, name, id }]));

const parks = [
  ["neutral", "Neutral park", 100, "Baseline run environment"],
  ["ARI", "Chase Field", 101, "Slightly hitter-friendly"],
  ["ATL", "Truist Park", 100, "Mostly neutral"],
  ["BAL", "Oriole Park at Camden Yards", 96, "Leans pitcher-friendly after the left-field changes"],
  ["BOS", "Fenway Park", 104, "Boosts doubles and run scoring"],
  ["CHC", "Wrigley Field", 101, "Can swing with weather and wind"],
  ["CWS", "Rate Field", 102, "Leans power-friendly"],
  ["CIN", "Great American Ball Park", 108, "One of the better home-run environments"],
  ["CLE", "Progressive Field", 98, "Slightly pitcher-friendly"],
  ["COL", "Coors Field", 116, "The biggest run-scoring boost"],
  ["DET", "Comerica Park", 98, "Suppresses some home-run power"],
  ["HOU", "Daikin Park", 101, "Short left field helps right-handed power"],
  ["KC", "Kauffman Stadium", 99, "Large outfield, modest run environment"],
  ["LAA", "Angel Stadium", 99, "Near neutral with a slight pitcher lean"],
  ["LAD", "Dodger Stadium", 97, "Pitcher-friendly run environment"],
  ["MIA", "loanDepot park", 96, "Pitcher-friendly"],
  ["MIL", "American Family Field", 102, "Slight power boost"],
  ["MIN", "Target Field", 99, "Mostly neutral"],
  ["NYM", "Citi Field", 96, "Pitcher-friendly"],
  ["NYY", "Yankee Stadium", 103, "Boosts left-handed home-run power"],
  ["ATH", "Sutter Health Park", 101, "Temporary park context, treat as approximate"],
  ["PHI", "Citizens Bank Park", 104, "Power-friendly"],
  ["PIT", "PNC Park", 97, "Pitcher-friendly"],
  ["SD", "Petco Park", 95, "Pitcher-friendly"],
  ["SF", "Oracle Park", 94, "Suppresses home runs"],
  ["SEA", "T-Mobile Park", 96, "Pitcher-friendly"],
  ["STL", "Busch Stadium", 98, "Slightly pitcher-friendly"],
  ["TB", "George M. Steinbrenner Field", 101, "Temporary park context, treat as approximate"],
  ["TEX", "Globe Life Field", 99, "Mostly neutral"],
  ["TOR", "Rogers Centre", 101, "Slightly hitter-friendly"],
  ["WSH", "Nationals Park", 100, "Mostly neutral"]
];

let activeSeason = "2026";
let activeRosterType = "active";
let activeViewMode = "season";
let activeMatchupTool = "team-pitcher";
let batter = { id: 605141, fullName: "Mookie Betts", position: "SS" };
let pitcher = { id: 694973, fullName: "Paul Skenes", position: "P" };
let teamOffenseRows = [];
let activeTeamOffenseSort = { key: "ab", dir: -1 };
let activeTeamPitcherView = "history";
let activeDecisionMetric = "ops";
let batterCandidates = [];
let pitcherCandidates = [];
let matchupSearchTimer;
let activeGameDayDate = localDateValue();
let matchupWorkspaceOpen = true;
let gameDayOpen = false;
let matchupCopyStatusTimer;

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fmt(value, digits = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return number.toFixed(digits).replace(/^0/, "");
}

function num(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function baseballReferenceSearchUrl(name) {
  return `https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(name)}`;
}

function compactName(name) {
  return String(name || "").trim();
}

function teamByAbbr(abbr) {
  const row = teams.find(([teamAbbr]) => teamAbbr === abbr) || teams[0];
  return { abbr: row[0], name: row[1], id: row[2] };
}

function teamFromScheduleTeam(team) {
  const id = String(team?.id || "");
  const known = teamById.get(id);
  if (known) return known;
  const abbreviation = team?.abbreviation || team?.teamCode?.toUpperCase() || "";
  const byAbbr = teams.find(([abbr]) => abbr === abbreviation);
  if (byAbbr) return { abbr: byAbbr[0], name: byAbbr[1], id: byAbbr[2] };
  return { abbr: abbreviation || id, name: team?.name || team?.teamName || "Team", id: team?.id || id };
}

function probablePitcherFromSchedule(person, team) {
  if (!person?.id) return null;
  return {
    id: person.id,
    fullName: person.fullName || "Probable starter",
    position: "P",
    team: team.abbr,
    teamName: team.name
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request returned ${response.status}`);
  return response.json();
}

async function scheduleGames(date) {
  if (scheduleCache.has(date)) return scheduleCache.get(date);
  const params = new URLSearchParams({ sportId: "1", date, hydrate: "probablePitcher" });
  const data = await fetchJson(`https://statsapi.mlb.com/api/v1/schedule?${params.toString()}`);
  const games = data.dates?.[0]?.games || [];
  scheduleCache.set(date, games);
  return games;
}

function displayPlayerOption(person) {
  const teamName = person.teamName || teamNameByAbbr.get(person.team) || "";
  const parts = [person.position || "MLB"];
  if (teamName || person.team) {
    parts.push(teamName || person.team);
  } else if (person.mlbDebutDate) {
    parts.push(`MLB debut ${String(person.mlbDebutDate).slice(0, 4)}`);
  } else {
    parts.push("No MLB debut listed");
  }
  return `${person.fullName} - ${parts.filter(Boolean).join(" - ")}`;
}

function cleanPlayerInput(value) {
  return value.replace(/\s+-\s+[^()]+(?:\s+\([^)]+\))?$/, "").replace(/\s+\([^)]+\)$/, "").trim();
}

async function searchPeople(query, group) {
  const clean = query.trim();
  if (!clean) return [];
  const cacheKey = `${group}:${clean.toLowerCase()}`;
  if (peopleCache.has(cacheKey)) return peopleCache.get(cacheKey);
  const data = await fetchJson(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(clean)}`);
  const people = (data.people || [])
    .map((person) => ({
      id: person.id,
      fullName: person.fullName,
      position: person.primaryPosition?.abbreviation || "MLB",
      team: person.currentTeam?.abbreviation || "",
      teamName: person.currentTeam?.name || "",
      mlbDebutDate: person.mlbDebutDate || "",
      batSide: person.batSide?.code || "",
      pitchHand: person.pitchHand?.code || ""
    }))
    .filter((person) => group === "pitching"
      ? ["P", "TWP"].includes(person.position) || person.id === 660271
      : person.position !== "P" || person.id === 660271);
  peopleCache.set(cacheKey, people);
  return people;
}

async function personDetails(id) {
  const data = await fetchJson(`https://statsapi.mlb.com/api/v1/people/${id}`);
  const person = data.people?.[0] || {};
  return {
    batSide: person.batSide?.code || "",
    pitchHand: person.pitchHand?.code || "",
    position: person.primaryPosition?.abbreviation || ""
  };
}

async function playerStats(player, group) {
  const cacheKey = `${player.id}:${group}:${activeSeason}`;
  if (statsCache.has(cacheKey)) return statsCache.get(cacheKey);
  const details = await personDetails(player.id);
  const seasonParams = new URLSearchParams({ stats: "season", group, season: activeSeason });
  const splitParams = new URLSearchParams({ stats: "statSplits", group, season: activeSeason, sitCodes: "vl,vr" });
  const [seasonData, splitData] = await Promise.all([
    fetchJson(`https://statsapi.mlb.com/api/v1/people/${player.id}/stats?${seasonParams.toString()}`),
    fetchJson(`https://statsapi.mlb.com/api/v1/people/${player.id}/stats?${splitParams.toString()}`)
  ]);
  const season = seasonData.stats?.[0]?.splits?.[0]?.stat || {};
  const splits = splitData.stats?.[0]?.splits || [];
  const payload = {
    ...player,
    ...details,
    season,
    splits: Object.fromEntries(splits.map((split) => [split.split?.code || split.split?.abbreviation, split.stat || {}]))
  };
  statsCache.set(cacheKey, payload);
  return payload;
}

async function headToHeadStats(batterPlayer, pitcherPlayer) {
  const cacheKey = `${batterPlayer.id}:${pitcherPlayer.id}`;
  if (headToHeadCache.has(cacheKey)) return headToHeadCache.get(cacheKey);
  const params = new URLSearchParams({
    stats: "vsPlayer",
    group: "hitting",
    opposingPlayerId: pitcherPlayer.id,
    sportId: 1
  });
  const data = await fetchJson(`https://statsapi.mlb.com/api/v1/people/${batterPlayer.id}/stats?${params.toString()}`);
  const matchesSelectedPair = (split) => (
    Number(split.batter?.id) === Number(batterPlayer.id)
    && Number(split.pitcher?.id) === Number(pitcherPlayer.id)
  );
  const detailRows = (data.stats || [])
    .find((entry) => entry.type?.displayName === "vsPlayer")
    ?.splits
    ?.filter(matchesSelectedPair) || [];
  const totalRows = (data.stats || [])
    .find((entry) => entry.type?.displayName === "vsPlayerTotal")
    ?.splits
    ?.filter(matchesSelectedPair) || [];
  const sourceRows = detailRows.length ? detailRows : totalRows;
  const rows = sourceRows.map((split) => ({
    season: split.season || "Career",
    team: split.team?.name || "",
    opponent: split.opponent?.name || "",
    stat: split.stat || {}
  }));
  headToHeadCache.set(cacheKey, rows);
  return rows;
}

async function vsTeamStats(player, group, opponentTeamId) {
  const cacheKey = `${player.id}:${group}:${opponentTeamId}`;
  if (vsTeamCache.has(cacheKey)) return vsTeamCache.get(cacheKey);
  const params = new URLSearchParams({
    stats: "vsTeam",
    group,
    opposingTeamId: opponentTeamId,
    sportId: 1
  });
  const data = await fetchJson(`https://statsapi.mlb.com/api/v1/people/${player.id}/stats?${params.toString()}`);
  const total = (data.stats || []).find((entry) => entry.type?.displayName === "vsTeamTotal")?.splits?.[0] || null;
  const rows = ((data.stats || []).find((entry) => entry.type?.displayName === "vsTeam")?.splits || []).map((split) => ({
    season: split.season || "Career",
    team: split.team?.name || "",
    opponent: split.opponent?.name || "",
    stat: split.stat || {}
  }));
  const payload = { total, rows };
  vsTeamCache.set(cacheKey, payload);
  return payload;
}

function selectedBattingTeam() {
  const abbr = document.querySelector("#matchup-batting-team")?.value || "LAD";
  return teams.find(([teamAbbr]) => teamAbbr === abbr) || teams.find(([teamAbbr]) => teamAbbr === "LAD");
}

async function teamRosterPlayers(teamAbbr) {
  const [, , teamId] = teams.find(([abbr]) => abbr === teamAbbr) || [];
  if (!teamId) return [];
  const cacheKey = `${teamId}:${activeSeason}:${activeRosterType}`;
  if (rosterCache.has(cacheKey)) return rosterCache.get(cacheKey);
  const params = new URLSearchParams({ rosterType: activeRosterType, season: activeSeason });
  const data = await fetchJson(`https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?${params.toString()}`);
  const players = (data.roster || [])
    .map((row) => ({
      id: row.person?.id,
      fullName: row.person?.fullName || "Unknown player",
      position: row.position?.abbreviation || "MLB",
      team: teamAbbr,
      teamName: teamNameByAbbr.get(teamAbbr) || ""
    }))
    .filter((player) => player.id);
  rosterCache.set(cacheKey, players);
  return players;
}

async function teamRosterHitters(teamAbbr) {
  const players = await teamRosterPlayers(teamAbbr);
  return players.filter((player) => player.position !== "P" || player.id === 660271);
}

async function teamRosterPitchers(teamAbbr) {
  const players = await teamRosterPlayers(teamAbbr);
  return players.filter((player) => player.position === "P" || player.position === "TWP" || player.id === 660271);
}

function uniquePeople(people) {
  return Array.from(new Map(people.filter((person) => person.id).map((person) => [Number(person.id), person])).values());
}

function teamMatches(query) {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];
  return teams.filter(([abbr, name]) => abbr.toLowerCase().includes(clean) || name.toLowerCase().includes(clean)).slice(0, 3);
}

function renderAutocompleteOptions(listId, people) {
  document.querySelector(listId).innerHTML = uniquePeople(people).map((person) => `
    <option value="${escapeHtml(displayPlayerOption(person))}" label="${escapeHtml(person.fullName)}"></option>
  `).join("");
}

function renderBrowseSelect(selectId, people, selected) {
  const rows = uniquePeople(people.length ? people : [selected]);
  document.querySelector(selectId).innerHTML = rows.map((person) => `
    <option value="${person.id}">${displayPlayerOption(person)}</option>
  `).join("");
  document.querySelector(selectId).value = String(selected.id);
}

function setPlayerInput(role, player) {
  const input = document.querySelector(role === "batter" ? "#batter-autocomplete" : "#pitcher-autocomplete");
  input.value = displayPlayerOption(player);
}

async function autocompleteCandidates(query, role) {
  const group = role === "pitcher" ? "pitching" : "hitting";
  const currentTeam = role === "pitcher" ? document.querySelector("#matchup-pitching-team").value : document.querySelector("#matchup-batting-team").value;
  const currentRoster = role === "pitcher" ? await teamRosterPitchers(currentTeam) : await teamRosterHitters(currentTeam);
  const matchedTeamRosters = await Promise.all(teamMatches(query).map(([abbr]) => role === "pitcher" ? teamRosterPitchers(abbr) : teamRosterHitters(abbr)));
  const searched = query.trim().length >= 2 ? await searchPeople(query, group) : [];
  return uniquePeople([...currentRoster, ...matchedTeamRosters.flat(), ...searched]);
}

async function handleAutocompleteInput(role) {
  const input = document.querySelector(role === "batter" ? "#batter-autocomplete" : "#pitcher-autocomplete");
  const listId = role === "batter" ? "#batter-options" : "#pitcher-options";
  const candidates = await autocompleteCandidates(input.value, role);
  if (role === "batter") batterCandidates = candidates;
  else pitcherCandidates = candidates;
  renderAutocompleteOptions(listId, candidates);
}

function chooseAutocompletePlayer(role) {
  const input = document.querySelector(role === "batter" ? "#batter-autocomplete" : "#pitcher-autocomplete");
  const candidates = role === "batter" ? batterCandidates : pitcherCandidates;
  const cleanValue = cleanPlayerInput(input.value).toLowerCase();
  const selected = candidates.find((person) => person.fullName.toLowerCase() === cleanValue || displayPlayerOption(person).toLowerCase() === input.value.trim().toLowerCase());
  if (!selected) return;
  if (role === "batter") batter = selected;
  else pitcher = selected;
  setPlayerInput(role, selected);
  analyzeMatchup();
}

async function resolveTypedPlayer(role) {
  const input = document.querySelector(role === "batter" ? "#batter-autocomplete" : "#pitcher-autocomplete");
  const current = role === "batter" ? batter : pitcher;
  const cleanValue = cleanPlayerInput(input.value);
  if (!cleanValue || cleanValue.toLowerCase() === current.fullName.toLowerCase()) return current;
  const candidates = role === "batter" ? batterCandidates : pitcherCandidates;
  let selected = candidates.find((person) => person.fullName.toLowerCase() === cleanValue.toLowerCase() || displayPlayerOption(person).toLowerCase() === input.value.trim().toLowerCase());
  if (!selected) {
    const searched = await searchPeople(cleanValue, role === "pitcher" ? "pitching" : "hitting");
    selected = searched[0];
  }
  if (!selected) return current;
  if (role === "batter") {
    batter = selected;
    batterCandidates = uniquePeople([selected, ...batterCandidates]);
  } else {
    pitcher = selected;
    pitcherCandidates = uniquePeople([selected, ...pitcherCandidates]);
  }
  setPlayerInput(role, selected);
  return selected;
}

function splitForHand(stats, hand) {
  if (hand === "L") return stats.splits.vl || {};
  if (hand === "R") return stats.splits.vr || {};
  return {};
}

function parkContext() {
  const selected = document.querySelector("#matchup-park")?.value || "neutral";
  return parks.find(([abbr]) => abbr === selected) || parks[0];
}

function gameTimeLabel(game) {
  if (!game.gameDate) return game.status?.detailedState || "Scheduled";
  const date = new Date(game.gameDate);
  if (Number.isNaN(date.getTime())) return game.status?.detailedState || "Scheduled";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function renderGameDay(games) {
  const grid = document.querySelector("#game-day-grid");
  if (!grid) return;
  if (!games.length) {
    grid.innerHTML = `<div class="empty-state">No MLB games found for this date.</div>`;
    return;
  }
  grid.innerHTML = games.map((game) => {
    const awayTeam = teamFromScheduleTeam(game.teams?.away?.team);
    const homeTeam = teamFromScheduleTeam(game.teams?.home?.team);
    const awayPitcher = game.teams?.away?.probablePitcher?.fullName || "TBA";
    const homePitcher = game.teams?.home?.probablePitcher?.fullName || "TBA";
    const venue = game.venue?.name || "Ballpark";
    return `
      <article class="game-day-card">
        <div class="game-day-card-head">
          <span>${escapeHtml(gameTimeLabel(game))}</span>
          <strong>${escapeHtml(awayTeam.abbr)} @ ${escapeHtml(homeTeam.abbr)}</strong>
          <small>${escapeHtml(venue)}</small>
        </div>
        <div class="game-day-probables">
          <span>${escapeHtml(awayTeam.abbr)} starter: ${escapeHtml(awayPitcher)}</span>
          <span>${escapeHtml(homeTeam.abbr)} starter: ${escapeHtml(homePitcher)}</span>
        </div>
        <div class="game-day-actions">
          <button type="button" data-game-pick="${game.gamePk}" data-batting-side="away">${escapeHtml(awayTeam.abbr)} hitters vs ${escapeHtml(homeTeam.abbr)} starter</button>
          <button type="button" data-game-pick="${game.gamePk}" data-batting-side="home">${escapeHtml(homeTeam.abbr)} hitters vs ${escapeHtml(awayTeam.abbr)} starter</button>
        </div>
      </article>
    `;
  }).join("");
  grid.querySelectorAll("[data-game-pick]").forEach((button) => {
    button.addEventListener("click", () => applyGameDayMatchup(Number(button.dataset.gamePick), button.dataset.battingSide));
  });
}

function setGameDayOpen(isOpen) {
  gameDayOpen = isOpen;
  document.querySelector("#game-day-grid")?.toggleAttribute("hidden", !isOpen);
  const button = document.querySelector("#game-day-toggle");
  if (button) button.textContent = isOpen ? "Hide games" : "Show games";
}

function setMatchupWorkspaceOpen(isOpen) {
  matchupWorkspaceOpen = isOpen;
  document.querySelector(".matchup-controls-panel")?.toggleAttribute("hidden", !isOpen);
  if (isOpen) syncViewModePanels();
  else document.querySelectorAll(".matchup-workspace:not(.matchup-controls-panel)").forEach((section) => section.hidden = true);
}

function matchupShareParams() {
  const params = new URLSearchParams();
  params.set("tool", activeMatchupTool);
  params.set("season", activeSeason);
  params.set("batTeam", document.querySelector("#matchup-batting-team")?.value || "LAD");
  params.set("pitTeam", document.querySelector("#matchup-pitching-team")?.value || "PIT");
  params.set("park", document.querySelector("#matchup-park")?.value || "neutral");
  params.set("roster", activeRosterType);
  if (activeMatchupTool === "team-pitcher") {
    params.set("teamView", activeTeamPitcherView);
    params.set("decisionMetric", activeDecisionMetric);
  }
  if (activeMatchupTool === "batter-pitcher") {
    params.set("view", activeViewMode);
    params.set("batter", compactName(batter.fullName));
    params.set("batterId", batter.id);
  }
  params.set("pitcher", compactName(pitcher.fullName));
  params.set("pitcherId", pitcher.id);
  if (activeMatchupTool === "player-team") {
    const playerTeamType = document.querySelector("#player-team-type")?.value || "batter";
    params.set("playerTeamType", playerTeamType);
    params.set("opponent", document.querySelector("#player-team-opponent")?.value || "PIT");
    if (playerTeamType === "batter") {
      params.set("batter", compactName(batter.fullName));
      params.set("batterId", batter.id);
    }
  }
  return params;
}

function matchupShareUrl() {
  const url = new URL(window.location.href);
  url.search = matchupShareParams().toString();
  return url.toString();
}

function updateMatchupShareUrl() {
  if (!history.replaceState) return;
  history.replaceState(null, "", matchupShareUrl());
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

function showMatchupCopyStatus(message) {
  const status = document.querySelector("#matchup-copy-status");
  if (!status) return;
  clearTimeout(matchupCopyStatusTimer);
  status.textContent = message;
  matchupCopyStatusTimer = setTimeout(() => { status.textContent = ""; }, 2200);
}

async function copyMatchupLink() {
  try {
    await Promise.all([
      activeMatchupTool === "team-pitcher" ? Promise.resolve() : resolveTypedPlayer("batter"),
      resolveTypedPlayer("pitcher")
    ]);
    const url = matchupShareUrl();
    updateMatchupShareUrl();
    await copyText(url);
    showMatchupCopyStatus("Copied");
  } catch (error) {
    showMatchupCopyStatus("Could not copy");
  }
}

async function loadGameDay() {
  const grid = document.querySelector("#game-day-grid");
  if (grid) grid.innerHTML = `<div class="empty-state">Loading games...</div>`;
  try {
    renderGameDay(await scheduleGames(activeGameDayDate));
  } catch (error) {
    if (grid) grid.innerHTML = `<div class="empty-state">Could not load games for this date.</div>`;
  }
}

async function applyGameDayMatchup(gamePk, battingSide) {
  const games = await scheduleGames(activeGameDayDate);
  const game = games.find((row) => Number(row.gamePk) === Number(gamePk));
  if (!game) return;
  const awayTeam = teamFromScheduleTeam(game.teams?.away?.team);
  const homeTeam = teamFromScheduleTeam(game.teams?.home?.team);
  const battingTeam = battingSide === "home" ? homeTeam : awayTeam;
  const pitchingTeam = battingSide === "home" ? awayTeam : homeTeam;
  const probable = battingSide === "home"
    ? probablePitcherFromSchedule(game.teams?.away?.probablePitcher, pitchingTeam)
    : probablePitcherFromSchedule(game.teams?.home?.probablePitcher, pitchingTeam);

  activeMatchupTool = "team-pitcher";
  setMatchupWorkspaceOpen(true);
  activeSeason = activeGameDayDate.slice(0, 4);
  document.querySelector("#matchup-season").value = activeSeason;
  document.querySelector("#matchup-batting-team").value = battingTeam.abbr;
  document.querySelector("#matchup-pitching-team").value = pitchingTeam.abbr;
  document.querySelector("#matchup-park").value = parks.some(([abbr]) => abbr === homeTeam.abbr) ? homeTeam.abbr : "neutral";
  if (probable) pitcher = probable;
  await populateTeamPlayerDropdowns({ selectFirst: !probable });
  if (probable) {
    pitcherCandidates = uniquePeople([probable, ...pitcherCandidates]);
    setPlayerInput("pitcher", probable);
  }
  await analyzeMatchup();
  document.querySelector(".matchup-controls-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hitterSummary(stats, pitcherHand) {
  const split = splitForHand(stats, pitcherHand);
  return {
    seasonOps: num(stats.season.ops),
    splitOps: num(split.ops || stats.season.ops),
    avg: split.avg || stats.season.avg,
    ops: split.ops || stats.season.ops,
    hr: split.homeRuns || stats.season.homeRuns || 0,
    rbi: split.rbi || stats.season.rbi || 0
  };
}

function pitcherSummary(stats, batterSide) {
  const split = splitForHand(stats, batterSide);
  return {
    seasonEra: num(stats.season.era),
    seasonWhip: num(stats.season.whip),
    splitOps: num(split.ops || stats.season.ops),
    era: split.era || stats.season.era,
    whip: split.whip || stats.season.whip,
    so: split.strikeOuts || stats.season.strikeOuts || 0,
    ip: split.inningsPitched || stats.season.inningsPitched || "0.0"
  };
}

function battingSideLabel(side) {
  if (side === "L") return "left-handed hitters";
  if (side === "R") return "right-handed hitters";
  if (side === "S") return "switch-hitters";
  return "hitters from this side";
}

function edgeLabel(hitter, pitcherProfile) {
  const hitterScore = hitter.splitOps * 100;
  const pitcherScore = (1 - Math.min(pitcherProfile.splitOps || 0.7, 1)) * 100;
  const diff = hitterScore - pitcherScore;
  if (diff > 18) return ["Batter edge", "The hitter's split profile is meaningfully stronger than the pitcher's allowed profile."];
  if (diff < -18) return ["Pitcher edge", "The pitcher suppresses this side well enough to tilt the matchup."];
  return ["Balanced", "The handedness split reads close, so recent form and game context matter more."];
}

function aggregateHeadToHead(rows) {
  const totals = rows.reduce((acc, row) => {
    const stat = row.stat || {};
    acc.pa += num(stat.plateAppearances);
    acc.ab += num(stat.atBats);
    acc.h += num(stat.hits);
    acc.hr += num(stat.homeRuns);
    acc.rbi += num(stat.rbi);
    acc.bb += num(stat.baseOnBalls);
    acc.so += num(stat.strikeOuts);
    acc.tb += num(stat.totalBases);
    return acc;
  }, { pa: 0, ab: 0, h: 0, hr: 0, rbi: 0, bb: 0, so: 0, tb: 0 });
  const avg = totals.ab ? totals.h / totals.ab : 0;
  const obpDenominator = totals.ab + totals.bb;
  const obp = obpDenominator ? (totals.h + totals.bb) / obpDenominator : 0;
  const slg = totals.ab ? totals.tb / totals.ab : 0;
  return {
    ...totals,
    avg,
    obp,
    slg,
    ops: obp + slg
  };
}

function formatHeadToHeadLine(rows, batterName, pitcherName, scopeLabel) {
  if (!rows.length) return `${batterName} has no recorded MLB plate appearances against ${pitcherName} ${scopeLabel}.`;
  const total = aggregateHeadToHead(rows);
  return `${batterName} is ${total.h}-for-${total.ab} with ${total.hr} HR, ${total.bb} BB, and ${total.so} SO against ${pitcherName} ${scopeLabel} across ${total.pa} recorded plate appearances.`;
}

function headToHeadBreakdown(rows) {
  if (!rows.length) return "No recorded head-to-head history.";
  return rows
    .slice()
    .sort((a, b) => Number(a.season) - Number(b.season))
    .map((row) => {
      const stat = row.stat || {};
      return `${row.season}: ${stat.hits || 0}-${stat.atBats || 0}, ${stat.homeRuns || 0} HR, ${stat.baseOnBalls || 0} BB, ${stat.strikeOuts || 0} SO`;
    })
    .join(" | ");
}

function teamOffenseValue(row, key) {
  const total = aggregateHeadToHead(row.headToHead);
  if (key === "name") return row.fullName;
  if (key === "position") return row.position || "";
  if (key === "seasons") return row.headToHead.map((split) => split.season).join(", ");
  return total[key] || 0;
}

function sortedTeamOffenseRows(rows) {
  const { key, dir } = activeTeamOffenseSort;
  return rows.slice().sort((a, b) => {
    const aValue = teamOffenseValue(a, key);
    const bValue = teamOffenseValue(b, key);
    if (typeof aValue === "string" || typeof bValue === "string") {
      return String(aValue).localeCompare(String(bValue)) * dir;
    }
    return (aValue - bValue) * dir || a.fullName.localeCompare(b.fullName);
  });
}

function decisionLensLabel(score) {
  if (score >= 16) return ["Hitter lean", "Split favors hitter."];
  if (score <= -16) return ["Pitcher lean", "Split favors pitcher."];
  return ["Watch list", "Close split read."];
}

const decisionMetrics = {
  ops: { label: "OPS", hitterKey: "ops", pitcherKey: "ops", lowerBetter: false, digits: 3 },
  hr: { label: "HR", hitterKey: "homeRuns", pitcherKey: "homeRuns", lowerBetter: false, digits: 0 },
  so: { label: "SO", hitterKey: "strikeOuts", pitcherKey: "strikeOuts", lowerBetter: true, digits: 0 },
  bb: { label: "BB", hitterKey: "baseOnBalls", pitcherKey: "baseOnBalls", lowerBetter: false, digits: 0 },
  avg: { label: "AVG", hitterKey: "avg", pitcherKey: "avg", lowerBetter: false, digits: 3 }
};

function splitStatValue(stat, key) {
  return num(stat?.[key]);
}

function formatDecisionValue(metric, value) {
  return metric.digits > 0 ? fmt(value, metric.digits) : new Intl.NumberFormat("en-US").format(Math.round(num(value)));
}

function decisionScore(hitterValue, pitcherValue, metric, parkFactor) {
  const diff = metric.lowerBetter ? pitcherValue - hitterValue : hitterValue - pitcherValue;
  const multiplier = metric.digits > 0 ? 100 : metric.key === "hr" ? 8 : 5;
  return diff * multiplier + (parkFactor - 100) * .6;
}

function renderTeamDecisionLens(rows, pitcherStats) {
  const [, parkName, parkFactor, parkNote] = parkContext();
  const pitcherHand = pitcherStats.pitchHand || pitcher.pitchHand || "";
  const metric = { key: activeDecisionMetric, ...(decisionMetrics[activeDecisionMetric] || decisionMetrics.ops) };
  const cards = rows.map((row) => {
    const hitterSplit = splitForHand(row.profile, pitcherHand);
    const pitcherSplit = splitForHand(pitcherStats, row.profile.batSide);
    const hitterValue = splitStatValue(hitterSplit, metric.hitterKey) || splitStatValue(row.profile.season, metric.hitterKey);
    const pitcherValue = splitStatValue(pitcherSplit, metric.pitcherKey) || splitStatValue(pitcherStats.season, metric.pitcherKey);
    const score = decisionScore(hitterValue, pitcherValue, metric, parkFactor);
    const [label, note] = decisionLensLabel(score);
    return { ...row, hitterValue, pitcherValue, score, label, note };
  }).sort((a, b) => b.score - a.score);

  document.querySelector("#team-decision-lens").innerHTML = `
    <div class="team-decision-toolbar">
      <label>
        <span>Split Stat</span>
        <select id="team-decision-metric" aria-label="Decision lens split stat">
          ${Object.entries(decisionMetrics).map(([key, option]) => `<option value="${key}"${key === activeDecisionMetric ? " selected" : ""}>${option.label}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="team-decision-summary">
      <article>
        <span>Pitcher</span>
        <strong>${escapeHtml(pitcherStats.fullName || pitcher.fullName)}</strong>
        <small>Throws ${escapeHtml(pitcherHand || "?")} | ${activeSeason}</small>
      </article>
      <article>
        <span>Park</span>
        <strong>${escapeHtml(parkName)}</strong>
        <small>Factor ${parkFactor}: ${escapeHtml(parkNote)}</small>
      </article>
      <article>
        <span>Lens</span>
        <strong>${escapeHtml(metric.label)} Splits</strong>
        <small>Vs handedness, with park context. Not a betting recommendation.</small>
      </article>
    </div>
    <div class="table-wrap team-decision-table-wrap">
      <table class="team-offense-table team-decision-table">
        <thead>
          <tr>
            <th>Hitter</th>
            <th>Bat</th>
            <th>Hitter ${escapeHtml(metric.label)}</th>
            <th>P Allows ${escapeHtml(metric.label)}</th>
            <th>Read</th>
          </tr>
        </thead>
        <tbody>
          ${cards.map((card) => `
            <tr>
              <td><a class="summary-link" href="${baseballReferenceSearchUrl(card.fullName)}" target="_blank" rel="noopener noreferrer">${escapeHtml(card.fullName)}</a><small>${escapeHtml(card.position || "-")}</small></td>
              <td>${escapeHtml(card.profile.batSide || "?")}</td>
              <td>${formatDecisionValue(metric, card.hitterValue)}</td>
              <td>${formatDecisionValue(metric, card.pitcherValue)}</td>
              <td><strong>${escapeHtml(card.label)}</strong><small>${escapeHtml(card.note)}</small></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div class="team-decision-mobile-list">
      ${cards.map((card) => `
        <article class="team-decision-mobile-card">
          <div class="team-decision-mobile-player">
            <a class="summary-link" href="${baseballReferenceSearchUrl(card.fullName)}" target="_blank" rel="noopener noreferrer">${escapeHtml(card.fullName)}</a>
            <small>${escapeHtml(card.position || "-")}</small>
          </div>
          <div class="team-decision-mobile-stats">
            <span><small>Bat</small><strong>${escapeHtml(card.profile.batSide || "?")}</strong></span>
            <span><small>Hitter</small><strong>${formatDecisionValue(metric, card.hitterValue)}</strong></span>
            <span><small>Pitcher</small><strong>${formatDecisionValue(metric, card.pitcherValue)}</strong></span>
          </div>
          <div class="team-decision-mobile-read">
            <span>Read</span>
            <strong>${escapeHtml(card.label)}</strong>
          </div>
        </article>
      `).join("")}
    </div>
  `;
  document.querySelector("#team-decision-metric")?.addEventListener("change", (event) => {
    activeDecisionMetric = event.target.value;
    updateMatchupShareUrl();
    renderTeamDecisionLens(rows, pitcherStats);
  });
}

async function updateTeamDecisionLens(rows) {
  const lens = document.querySelector("#team-decision-lens");
  if (!lens) return;
  lens.innerHTML = `<div class="empty-state">Loading split context...</div>`;
  try {
    const pitcherStats = await playerStats(pitcher, "pitching");
    const enrichedRows = await Promise.all(rows.map(async (row) => ({
      ...row,
      profile: await playerStats(row, "hitting")
    })));
    renderTeamDecisionLens(enrichedRows, pitcherStats);
  } catch (error) {
    lens.innerHTML = `<div class="empty-state">Could not load split context for this roster.</div>`;
  }
}

function syncTeamPitcherView() {
  const isLens = activeTeamPitcherView === "lens";
  document.querySelector("#team-offense-history")?.toggleAttribute("hidden", isLens);
  document.querySelector("#team-decision-lens")?.toggleAttribute("hidden", !isLens);
  document.querySelectorAll("[data-team-pitcher-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.teamPitcherView === activeTeamPitcherView);
  });
}

function updateTeamOffenseHeaders() {
  document.querySelectorAll("[data-team-sort]").forEach((button) => {
    const isActive = button.dataset.teamSort === activeTeamOffenseSort.key;
    const arrow = activeTeamOffenseSort.dir === 1 ? " ↑" : " ↓";
    button.textContent = `${button.dataset.label}${isActive ? arrow : ""}`;
    button.setAttribute("aria-sort", isActive ? (activeTeamOffenseSort.dir === 1 ? "ascending" : "descending") : "none");
  });
}

function renderTeamOffense(rows, teamName, pitcherName) {
  teamOffenseRows = rows;
  document.querySelector("#team-offense-title").textContent = `${teamName} career offense vs ${pitcherName}`;
  document.querySelector("#team-offense-status").textContent = `${rows.length} ${activeRosterType === "40Man" ? "40-man" : "active"} hitters loaded`;
  updateTeamOffenseHeaders();
  document.querySelector("#team-offense-table").innerHTML = sortedTeamOffenseRows(rows).map((row) => {
    const total = aggregateHeadToHead(row.headToHead);
    return `
      <tr>
        <td><a class="summary-link" href="${baseballReferenceSearchUrl(row.fullName)}" target="_blank" rel="noopener noreferrer">${row.fullName}</a></td>
        <td>${row.position || "-"}</td>
        <td>${total.ab}</td>
        <td>${total.h}</td>
        <td>${total.hr}</td>
        <td>${total.rbi}</td>
        <td>${total.bb}</td>
        <td>${total.so}</td>
        <td>${row.headToHead.length ? fmt(total.avg) : "-"}</td>
        <td>${row.headToHead.length ? fmt(total.ops) : "-"}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="10" class="empty-row">No active hitters found for this team.</td></tr>`;
}

function statLine(stat = {}, keys = []) {
  return keys.map(([key, label, formatter]) => `${label} ${formatter ? formatter(stat[key]) : (stat[key] ?? "-")}`).join(" | ");
}

function rateStats(stat) {
  const ab = num(stat.atBats);
  const h = num(stat.hits);
  const bb = num(stat.baseOnBalls);
  const hbp = num(stat.hitByPitch);
  const sf = num(stat.sacFlies);
  const tb = num(stat.totalBases);
  const avg = ab ? h / ab : 0;
  const obpDenominator = ab + bb + hbp + sf;
  const obp = obpDenominator ? (h + bb + hbp) / obpDenominator : 0;
  const slg = ab ? tb / ab : 0;
  return {
    avg: fmt(avg),
    obp: fmt(obp),
    slg: fmt(slg),
    ops: fmt(obp + slg)
  };
}

function aggregatePlayerTeamRows(rows) {
  const bySeasonTeam = new Map();
  rows.forEach((row) => {
    const key = `${row.season || "Career"}:${row.team || ""}`;
    const existing = bySeasonTeam.get(key) || {
      season: row.season || "Career",
      team: row.team || "",
      opponent: row.opponent || "",
      stat: {
        gamesPlayed: 0,
        plateAppearances: 0,
        atBats: 0,
        hits: 0,
        homeRuns: 0,
        rbi: 0,
        baseOnBalls: 0,
        strikeOuts: 0,
        hitByPitch: 0,
        sacFlies: 0,
        totalBases: 0
      }
    };
    const stat = row.stat || {};
    ["gamesPlayed", "plateAppearances", "atBats", "hits", "homeRuns", "rbi", "baseOnBalls", "strikeOuts", "hitByPitch", "sacFlies", "totalBases"].forEach((keyName) => {
      existing.stat[keyName] += num(stat[keyName]);
    });
    bySeasonTeam.set(key, existing);
  });
  return Array.from(bySeasonTeam.values()).map((row) => ({
    ...row,
    stat: {
      ...row.stat,
      ...rateStats(row.stat)
    }
  }));
}

function renderPlayerTeamTable(type, rows) {
  const seasonRows = aggregatePlayerTeamRows(rows);
  const columns = type === "pitcher"
    ? [
        ["season", "Season"],
        ["team", "Team"],
        ["plateAppearances", "BF"],
        ["atBats", "AB"],
        ["hits", "H"],
        ["homeRuns", "HR"],
        ["baseOnBalls", "BB"],
        ["strikeOuts", "SO"],
        ["avg", "AVG"],
        ["ops", "OPS"]
      ]
    : [
        ["season", "Season"],
        ["team", "Team"],
        ["plateAppearances", "PA"],
        ["atBats", "AB"],
        ["hits", "H"],
        ["homeRuns", "HR"],
        ["rbi", "RBI"],
        ["baseOnBalls", "BB"],
        ["strikeOuts", "SO"],
        ["avg", "AVG"],
        ["ops", "OPS"]
      ];
  document.querySelector("#player-team-head").innerHTML = `<tr>${columns.map(([, label]) => `<th>${label}</th>`).join("")}</tr>`;
  document.querySelector("#player-team-table").innerHTML = seasonRows.length
    ? seasonRows
        .slice()
        .sort((a, b) => Number(b.season) - Number(a.season))
        .map((row) => `
          <tr>
            ${columns.map(([key]) => {
              const value = key === "season" ? row.season : key === "team" ? row.team : row.stat?.[key];
              return `<td>${value ?? "-"}</td>`;
            }).join("")}
          </tr>
        `).join("")
    : `<tr><td colspan="${columns.length}" class="empty-row">No season-by-season history found for this player against that team.</td></tr>`;
  return seasonRows;
}

async function updatePlayerVsTeam() {
  const type = document.querySelector("#player-team-type")?.value || "batter";
  const opponent = teamByAbbr(document.querySelector("#player-team-opponent")?.value || (type === "pitcher" ? selectedBattingTeam()[0] : document.querySelector("#matchup-pitching-team").value));
  const player = type === "pitcher" ? pitcher : batter;
  const group = type === "pitcher" ? "pitching" : "hitting";
  document.querySelector("#player-team-title").textContent = `${player.fullName} vs ${opponent.name}`;
  document.querySelector("#player-team-status").textContent = "Loading...";
  document.querySelector("#player-team-grid").innerHTML = `<div class="empty-state">Loading player-vs-team history...</div>`;
  document.querySelector("#player-team-table").innerHTML = `<tr><td class="empty-row">Loading player-vs-team history...</td></tr>`;
  try {
    const [profile, history] = await Promise.all([
      playerStats(player, group),
      vsTeamStats(player, group, opponent.id)
    ]);
    const totalStat = history.total?.stat || {};
    const opponentLabel = history.total?.opponent?.name || opponent.name;
    const playerTeam = "Career regular season";
    const totalNote = type === "pitcher"
      ? statLine(totalStat, [
          ["plateAppearances", "BF"],
          ["hits", "H"],
          ["homeRuns", "HR"],
          ["baseOnBalls", "BB"],
          ["strikeOuts", "SO"],
          ["avg", "AVG"],
          ["ops", "OPS"]
        ])
      : statLine(totalStat, [
          ["plateAppearances", "PA"],
          ["hits", "H"],
          ["homeRuns", "HR"],
          ["rbi", "RBI"],
          ["baseOnBalls", "BB"],
          ["strikeOuts", "SO"],
          ["avg", "AVG"],
          ["ops", "OPS"]
        ]);
    const hasSeasonLine = type === "pitcher"
      ? Boolean(profile.season.era || profile.season.whip || num(profile.season.strikeOuts))
      : Boolean(profile.season.avg || profile.season.ops || num(profile.season.homeRuns));
    const seasonLine = hasSeasonLine
      ? (type === "pitcher"
          ? `Season: ERA ${profile.season.era || "-"} | WHIP ${profile.season.whip || "-"} | SO ${profile.season.strikeOuts || 0}`
          : `Season: AVG ${profile.season.avg || "-"} | OPS ${profile.season.ops || "-"} | HR ${profile.season.homeRuns || 0}`)
      : "Career regular-season view";
    const seasonRows = aggregatePlayerTeamRows(history.rows);

    document.querySelector("#player-team-grid").innerHTML = `
      <article class="fantasy-note-card">
        <strong><a class="summary-link" href="${baseballReferenceSearchUrl(player.fullName)}" target="_blank" rel="noopener noreferrer">${player.fullName}</a></strong>
        <span>${seasonLine}</span>
        <span>${playerTeam}</span>
      </article>
      <article class="fantasy-note-card">
        <strong>${opponentLabel}</strong>
        <span>${type === "pitcher" ? "Opponent hitters faced" : "Opponent pitching faced"}</span>
        <span>Career regular season vs team</span>
      </article>
      <article class="fantasy-note-card">
        <strong>Career vs Team</strong>
        <span>${history.total ? totalNote : "No recorded team history"}</span>
        <span>${seasonRows.length ? `${seasonRows.length} season rows` : "No season rows available"}</span>
      </article>
    `;
    renderPlayerTeamTable(type, history.rows);
    document.querySelector("#player-team-status").textContent = history.total ? "Loaded" : "No history found";
  } catch (error) {
    document.querySelector("#player-team-status").textContent = "Could not load";
    document.querySelector("#player-team-grid").innerHTML = `<div class="empty-state">Could not load this player-vs-team view.</div>`;
    document.querySelector("#player-team-table").innerHTML = `<tr><td class="empty-row">Could not load player-vs-team history.</td></tr>`;
  }
}

async function updateTeamOffense() {
  const [teamAbbr, teamName] = selectedBattingTeam();
  document.querySelector("#team-offense-title").textContent = `${teamName} career offense vs ${pitcher.fullName}`;
  document.querySelector("#team-offense-status").textContent = "Loading offense...";
  document.querySelector("#team-offense-table").innerHTML = `<tr><td colspan="10" class="empty-row">Loading team offense...</td></tr>`;
  try {
    const hitters = await teamRosterHitters(teamAbbr);
    const rows = await Promise.all(hitters.map(async (hitter) => ({
      ...hitter,
      headToHead: await headToHeadStats(hitter, pitcher)
    })));
    renderTeamOffense(rows, teamName, pitcher.fullName);
    syncTeamPitcherView();
    if (activeTeamPitcherView === "lens") await updateTeamDecisionLens(rows);
  } catch (error) {
    document.querySelector("#team-offense-status").textContent = "Could not load offense";
    document.querySelector("#team-offense-table").innerHTML = `<tr><td colspan="10" class="empty-row">Could not load this team's head-to-head history.</td></tr>`;
  }
}

async function populateTeamPlayerDropdowns({ selectFirst = false, selectFirstRoles = [] } = {}) {
  const battingTeam = document.querySelector("#matchup-batting-team")?.value || "LAD";
  const pitchingTeam = document.querySelector("#matchup-pitching-team")?.value || "PIT";
  const [hitters, pitchers] = await Promise.all([
    teamRosterHitters(battingTeam),
    teamRosterPitchers(pitchingTeam)
  ]);
  const shouldSelectBatter = selectFirst === true || selectFirstRoles.includes("batter");
  const shouldSelectPitcher = selectFirst === true || selectFirstRoles.includes("pitcher");
  if (shouldSelectBatter && hitters.length) batter = hitters[0];
  if (shouldSelectPitcher && pitchers.length) pitcher = pitchers[0];
  batterCandidates = uniquePeople([batter, ...hitters]);
  pitcherCandidates = uniquePeople([pitcher, ...pitchers]);
  renderAutocompleteOptions("#batter-options", batterCandidates);
  renderAutocompleteOptions("#pitcher-options", pitcherCandidates);
  renderBrowseSelect("#browse-batter-select", hitters, batter);
  renderBrowseSelect("#browse-pitcher-select", pitchers, pitcher);
  setPlayerInput("batter", batter);
  setPlayerInput("pitcher", pitcher);
}

function renderMatchup(payload) {
  if (activeViewMode === "career") {
    renderCareerOnlyMatchup(payload);
    return;
  }
  const hitter = hitterSummary(payload.batter, payload.pitcher.pitchHand);
  const pitcherProfile = pitcherSummary(payload.pitcher, payload.batter.batSide);
  const [edge, edgeNote] = edgeLabel(hitter, pitcherProfile);
  const [, parkName, parkFactor, parkNote] = parkContext();
  const careerH2h = aggregateHeadToHead(payload.headToHead || []);
  const sideLabel = battingSideLabel(payload.batter.batSide);
  const battingTeam = document.querySelector("#matchup-batting-team").selectedOptions[0]?.textContent || "Batting team";
  const pitchingTeam = document.querySelector("#matchup-pitching-team").selectedOptions[0]?.textContent || "Pitching team";

  document.querySelector("#matchup-batter-card").textContent = payload.batter.fullName;
  document.querySelector("#matchup-pitcher-card").textContent = payload.pitcher.fullName;
  document.querySelector("#matchup-edge-card").textContent = edge;
  document.querySelector("#matchup-edge-note").textContent = edgeNote;
  document.querySelector("#matchup-context-card").textContent = activeSeason;
  document.querySelector("#matchup-context-note").textContent = `${parkName} | Park ${parkFactor}`;
  document.querySelector("#matchup-title").textContent = `${payload.batter.fullName} vs ${payload.pitcher.fullName}`;
  document.querySelector("#matchup-batter-note").textContent = `${battingTeam} | bats ${payload.batter.batSide || "?"}`;
  document.querySelector("#matchup-pitcher-note").textContent = `${pitchingTeam} | throws ${payload.pitcher.pitchHand || "?"}`;

  document.querySelector("#matchup-read").innerHTML = `
    <p><strong>${edge}.</strong> ${edgeNote}</p>
    <p><strong>Career head-to-head:</strong> ${formatHeadToHeadLine(payload.headToHead || [], payload.batter.fullName, payload.pitcher.fullName, "for his career")}</p>
    <p>${payload.batter.fullName} is carrying a ${fmt(payload.batter.season.ops)} season OPS, with a ${fmt(hitter.splitOps)} OPS in the relevant handedness split.</p>
    <p>${payload.pitcher.fullName} owns a ${fmt(payload.pitcher.season.era, 2)} ERA and ${fmt(payload.pitcher.season.whip, 2)} WHIP this season, and ${sideLabel} have a ${fmt(pitcherProfile.splitOps)} OPS against him.</p>
    <p>${parkName} checks in around a ${parkFactor} park factor. ${parkNote}.</p>
    <p class="data-note">This is a matchup read, not an official projection or betting recommendation.</p>
  `;

  document.querySelector("#matchup-card-grid").innerHTML = `
    <article class="fantasy-note-card">
      <strong><a class="summary-link" href="${baseballReferenceSearchUrl(payload.batter.fullName)}" target="_blank" rel="noopener noreferrer">${payload.batter.fullName}</a></strong>
      <span>Season: AVG ${payload.batter.season.avg || "-"} | OPS ${payload.batter.season.ops || "-"} | HR ${payload.batter.season.homeRuns || 0}</span>
      <span>Split: AVG ${hitter.avg || "-"} | OPS ${hitter.ops || "-"} | HR ${hitter.hr}</span>
    </article>
    <article class="fantasy-note-card">
      <strong><a class="summary-link" href="${baseballReferenceSearchUrl(payload.pitcher.fullName)}" target="_blank" rel="noopener noreferrer">${payload.pitcher.fullName}</a></strong>
      <span>Season: ERA ${payload.pitcher.season.era || "-"} | WHIP ${payload.pitcher.season.whip || "-"} | SO ${payload.pitcher.season.strikeOuts || 0}</span>
      <span>Split: ERA ${pitcherProfile.era || "-"} | WHIP ${pitcherProfile.whip || "-"} | OPS ${fmt(pitcherProfile.splitOps)}</span>
    </article>
    <article class="fantasy-note-card">
      <strong>${parkName}</strong>
      <span>Park factor ${parkFactor}, where 100 is neutral.</span>
      <span>${parkNote}.</span>
    </article>
    <article class="fantasy-note-card">
      <strong>Career head-to-head</strong>
      <span>${payload.headToHead?.length ? `${careerH2h.h}-${careerH2h.ab} | AVG ${fmt(careerH2h.avg)} | OPS ${fmt(careerH2h.ops)}` : "No recorded matchups"}</span>
      <span>${headToHeadBreakdown(payload.headToHead || [])}</span>
    </article>
  `;
}

function renderCareerOnlyMatchup(payload) {
  const careerH2h = aggregateHeadToHead(payload.headToHead || []);
  const battingTeam = document.querySelector("#matchup-batting-team").selectedOptions[0]?.textContent || "Batting team";
  const pitchingTeam = document.querySelector("#matchup-pitching-team").selectedOptions[0]?.textContent || "Pitching team";

  document.querySelector("#matchup-batter-card").textContent = payload.batter.fullName;
  document.querySelector("#matchup-pitcher-card").textContent = payload.pitcher.fullName;
  document.querySelector("#matchup-edge-card").textContent = payload.headToHead?.length ? `${careerH2h.pa} PA` : "No H2H";
  document.querySelector("#matchup-edge-note").textContent = "Career batter-vs-pitcher history.";
  document.querySelector("#matchup-context-card").textContent = "Career";
  document.querySelector("#matchup-context-note").textContent = "Season profile hidden";
  document.querySelector("#matchup-title").textContent = `${payload.batter.fullName} vs ${payload.pitcher.fullName}`;
  document.querySelector("#matchup-batter-note").textContent = `${battingTeam} selector | bats ${payload.batter.batSide || "?"}`;
  document.querySelector("#matchup-pitcher-note").textContent = `${pitchingTeam} selector | throws ${payload.pitcher.pitchHand || "?"}`;

  document.querySelector("#matchup-read").innerHTML = `
    <p><strong>Career head-to-head:</strong> ${formatHeadToHeadLine(payload.headToHead || [], payload.batter.fullName, payload.pitcher.fullName, "for his career")}</p>
    <p>This mode ignores the selected season and focuses only on recorded career batter-vs-pitcher history, which is better for retired-player comparisons.</p>
    <p class="data-note">This is historical matchup context, not a projection or betting recommendation.</p>
  `;

  document.querySelector("#matchup-card-grid").innerHTML = `
    <article class="fantasy-note-card">
      <strong><a class="summary-link" href="${baseballReferenceSearchUrl(payload.batter.fullName)}" target="_blank" rel="noopener noreferrer">${payload.batter.fullName}</a></strong>
      <span>Career matchup batter</span>
      <span>Bats ${payload.batter.batSide || "?"}</span>
    </article>
    <article class="fantasy-note-card">
      <strong><a class="summary-link" href="${baseballReferenceSearchUrl(payload.pitcher.fullName)}" target="_blank" rel="noopener noreferrer">${payload.pitcher.fullName}</a></strong>
      <span>Career matchup pitcher</span>
      <span>Throws ${payload.pitcher.pitchHand || "?"}</span>
    </article>
    <article class="fantasy-note-card">
      <strong>Career head-to-head</strong>
      <span>${payload.headToHead?.length ? `${careerH2h.h}-${careerH2h.ab} | ${careerH2h.hr} HR | ${careerH2h.bb} BB | ${careerH2h.so} SO` : "No recorded matchups"}</span>
      <span>${payload.headToHead?.length ? `AVG ${fmt(careerH2h.avg)} | OPS ${fmt(careerH2h.ops)} | PA ${careerH2h.pa}` : "Try another pair"}</span>
    </article>
    <article class="fantasy-note-card">
      <strong>Breakdown</strong>
      <span>${headToHeadBreakdown(payload.headToHead || [])}</span>
    </article>
  `;
}

function syncViewModePanels() {
  if (!matchupWorkspaceOpen) return;
  const isBatterPitcher = activeMatchupTool === "batter-pitcher";
  const isTeamPitcher = activeMatchupTool === "team-pitcher";
  const isPlayerTeam = activeMatchupTool === "player-team";
  document.querySelector(".advanced-grid")?.toggleAttribute("hidden", !isBatterPitcher);
  document.querySelector(".matchup-summary")?.toggleAttribute("hidden", !isBatterPitcher);
  document.querySelector(".matchup-offense-panel")?.toggleAttribute("hidden", !isTeamPitcher);
  document.querySelector(".player-team-panel")?.toggleAttribute("hidden", !isPlayerTeam);
  document.querySelector('[data-tool-control="batter"]')?.toggleAttribute("hidden", isTeamPitcher);
  document.querySelector('[data-tool-control="batter-pitcher-mode"]')?.toggleAttribute("hidden", !isBatterPitcher);
  document.querySelector("#browse-batter-select")?.closest("label")?.toggleAttribute("hidden", isTeamPitcher);
  document.querySelectorAll("[data-matchup-tool]").forEach((button) => {
    button.classList.toggle("active", button.dataset.matchupTool === activeMatchupTool);
  });
  const setupTitle = document.querySelector("#matchup-setup-title");
  const toolNote = document.querySelector("#matchup-tool-note");
  if (setupTitle) {
    setupTitle.textContent = isTeamPitcher
      ? "Choose a batting team and pitcher"
      : isPlayerTeam
        ? "Choose a player and opponent team"
        : "Choose one batter and one pitcher";
  }
  if (toolNote) {
    toolNote.textContent = isTeamPitcher
      ? "Team vs Pitcher shows every hitter from the selected batting team against the selected pitcher."
      : isPlayerTeam
        ? "Player vs Team shows career regular-season history for the selected batter or pitcher against one opponent team."
        : "Batter vs Pitcher compares one hitter against one pitcher, with a season read and career head-to-head history.";
  }
}

async function analyzeMatchup() {
  if (!matchupWorkspaceOpen) return;
  syncViewModePanels();
  document.querySelector("#matchup-status").textContent = "Loading matchup...";
  if (activeMatchupTool === "team-pitcher") {
    try {
      await resolveTypedPlayer("pitcher");
      await updateTeamOffense();
      updateMatchupShareUrl();
      document.querySelector("#matchup-status").textContent = "Team vs pitcher loaded";
    } catch (error) {
      document.querySelector("#matchup-status").textContent = "Choose a pitcher";
    }
    return;
  }
  if (activeMatchupTool === "player-team") {
    try {
      const type = document.querySelector("#player-team-type")?.value || "batter";
      await resolveTypedPlayer(type);
      await updatePlayerVsTeam();
      updateMatchupShareUrl();
      document.querySelector("#matchup-status").textContent = "Player vs team loaded";
    } catch (error) {
      document.querySelector("#matchup-status").textContent = "Choose a player";
    }
    return;
  }
  document.querySelector("#matchup-read").innerHTML = `<div class="empty-state">Loading MLB matchup data...</div>`;
  try {
    await Promise.all([resolveTypedPlayer("batter"), resolveTypedPlayer("pitcher")]);
    const [batterDetails, pitcherDetails] = await Promise.all([personDetails(batter.id), personDetails(pitcher.id)]);
    const [batterStats, pitcherStats, headToHead] = activeViewMode === "career"
      ? [
          { ...batter, ...batterDetails, season: {}, splits: {} },
          { ...pitcher, ...pitcherDetails, season: {}, splits: {} },
          await headToHeadStats(batter, pitcher)
        ]
      : await Promise.all([
          playerStats(batter, "hitting"),
          playerStats(pitcher, "pitching"),
          headToHeadStats(batter, pitcher)
    ]);
    renderMatchup({ batter: batterStats, pitcher: pitcherStats, headToHead });
    updateMatchupShareUrl();
    document.querySelector("#matchup-status").textContent = "Matchup loaded";
  } catch (error) {
    document.querySelector("#matchup-status").textContent = "Could not load matchup";
    document.querySelector("#matchup-read").innerHTML = `<div class="empty-state">Could not load this matchup. Try another player or season.</div>`;
  }
}

function populateControls() {
  const yearOptions = Array.from({ length: lastSeason - firstSeason + 1 }, (_, index) => {
    const year = lastSeason - index;
    return `<option value="${year}">${year}</option>`;
  }).join("");
  document.querySelector("#matchup-season").innerHTML = yearOptions;
  document.querySelector("#matchup-season").value = activeSeason;
  const teamOptions = teams.map(([abbr, name]) => `<option value="${abbr}">${name}</option>`).join("");
  document.querySelector("#matchup-batting-team").innerHTML = teamOptions;
  document.querySelector("#matchup-pitching-team").innerHTML = teamOptions;
  document.querySelector("#player-team-opponent").innerHTML = teamOptions;
  document.querySelector("#matchup-batting-team").value = "LAD";
  document.querySelector("#matchup-pitching-team").value = "PIT";
  document.querySelector("#player-team-opponent").value = "PIT";
  document.querySelector("#matchup-roster-pool").value = activeRosterType;
  document.querySelector("#matchup-view-mode").value = activeViewMode;
  document.querySelector("#matchup-park").innerHTML = parks.map(([abbr, name, factor]) => `<option value="${abbr}">${name} (${factor})</option>`).join("");
  document.querySelector("#matchup-park").value = "LAD";
  document.querySelector("#game-day-date").value = activeGameDayDate;
  setPlayerInput("batter", batter);
  setPlayerInput("pitcher", pitcher);
}

function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const tool = params.get("tool");
  if (["batter-pitcher", "team-pitcher", "player-team"].includes(tool)) activeMatchupTool = tool;
  if (["history", "lens"].includes(params.get("teamView"))) activeTeamPitcherView = params.get("teamView");
  if (decisionMetrics[params.get("decisionMetric")]) activeDecisionMetric = params.get("decisionMetric");
  if (params.get("season")) activeSeason = params.get("season");
  if (params.get("roster")) activeRosterType = params.get("roster");
  if (params.get("view")) activeViewMode = params.get("view");
  const batterName = params.get("batter");
  const batterId = params.get("batterId");
  if (batterName && batterId) batter = { ...batter, id: Number(batterId), fullName: batterName };
  const pitcherName = params.get("pitcher");
  const pitcherId = params.get("pitcherId");
  if (pitcherName && pitcherId) pitcher = { ...pitcher, id: Number(pitcherId), fullName: pitcherName, position: "P" };
  document.querySelector("#matchup-season").value = activeSeason;
  document.querySelector("#matchup-batting-team").value = params.get("batTeam") || document.querySelector("#matchup-batting-team").value;
  document.querySelector("#matchup-pitching-team").value = params.get("pitTeam") || document.querySelector("#matchup-pitching-team").value;
  document.querySelector("#matchup-park").value = params.get("park") || document.querySelector("#matchup-park").value;
  document.querySelector("#matchup-roster-pool").value = activeRosterType;
  document.querySelector("#matchup-view-mode").value = activeViewMode;
  document.querySelector("#player-team-type").value = params.get("playerTeamType") || document.querySelector("#player-team-type").value;
  document.querySelector("#player-team-opponent").value = params.get("opponent") || document.querySelector("#player-team-opponent").value;
  setPlayerInput("batter", batter);
  setPlayerInput("pitcher", pitcher);
}

function isProbablesMode() {
  const params = new URLSearchParams(window.location.search);
  return ["probables", "today"].includes(params.get("mode"));
}

function hasSharedMatchupParams() {
  const params = new URLSearchParams(window.location.search);
  return ["tool", "batTeam", "pitTeam", "pitcher", "pitcherId", "batter", "batterId"].some((key) => params.has(key));
}

function bindEvents() {
  document.querySelectorAll("[data-matchup-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      activeMatchupTool = button.dataset.matchupTool;
      if (activeMatchupTool === "team-pitcher") {
        document.querySelector("#player-team-type").value = "pitcher";
        document.querySelector("#player-team-opponent").value = document.querySelector("#matchup-batting-team").value;
      }
      analyzeMatchup();
    });
  });
  document.querySelectorAll("[data-team-pitcher-view]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTeamPitcherView = button.dataset.teamPitcherView;
      syncTeamPitcherView();
      updateMatchupShareUrl();
      if (activeTeamPitcherView === "lens") updateTeamDecisionLens(teamOffenseRows);
    });
  });
  document.querySelector("#matchup-season").addEventListener("change", (event) => {
    activeSeason = event.target.value;
    populateTeamPlayerDropdowns().then(analyzeMatchup);
  });
  document.querySelector("#game-day-date").addEventListener("change", (event) => {
    activeGameDayDate = event.target.value || localDateValue();
    setGameDayOpen(true);
    loadGameDay();
  });
  document.querySelector("#game-day-toggle").addEventListener("click", () => {
    setGameDayOpen(!gameDayOpen);
    if (gameDayOpen) loadGameDay();
  });
  document.querySelector("#manual-matchup-toggle").addEventListener("click", () => {
    setMatchupWorkspaceOpen(true);
    analyzeMatchup();
    document.querySelector(".matchup-controls-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("#run-matchup").addEventListener("click", analyzeMatchup);
  document.querySelector("#copy-matchup-link").addEventListener("click", copyMatchupLink);
  document.querySelector("#matchup-view-mode").addEventListener("change", (event) => {
    activeViewMode = event.target.value;
    analyzeMatchup();
  });
  document.querySelector("#run-player-team").addEventListener("click", updatePlayerVsTeam);
  document.querySelector("#player-team-type").addEventListener("change", () => {
    const defaultOpponent = document.querySelector("#player-team-type").value === "pitcher"
      ? document.querySelector("#matchup-batting-team").value
      : document.querySelector("#matchup-pitching-team").value;
    document.querySelector("#player-team-opponent").value = defaultOpponent;
    updatePlayerVsTeam();
  });
  document.querySelector("#player-team-opponent").addEventListener("change", updatePlayerVsTeam);
  document.querySelector("#matchup-park").addEventListener("change", analyzeMatchup);
  document.querySelector("#matchup-batting-team").addEventListener("change", () => {
    if (document.querySelector("#player-team-type").value === "pitcher") {
      document.querySelector("#player-team-opponent").value = document.querySelector("#matchup-batting-team").value;
    }
    const selectFirstRoles = activeMatchupTool === "team-pitcher" ? [] : ["batter"];
    populateTeamPlayerDropdowns({ selectFirstRoles }).then(analyzeMatchup);
  });
  document.querySelector("#matchup-pitching-team").addEventListener("change", () => {
    if (document.querySelector("#player-team-type").value === "batter") {
      document.querySelector("#player-team-opponent").value = document.querySelector("#matchup-pitching-team").value;
    }
    populateTeamPlayerDropdowns({ selectFirstRoles: ["pitcher"] }).then(analyzeMatchup);
  });
  document.querySelector("#matchup-roster-pool").addEventListener("change", (event) => {
    activeRosterType = event.target.value;
    const selectFirstRoles = activeMatchupTool === "team-pitcher"
      ? ["pitcher"]
      : ["batter", "pitcher"];
    populateTeamPlayerDropdowns({ selectFirstRoles }).then(analyzeMatchup);
  });
  document.querySelector("#browse-players-toggle").addEventListener("click", (event) => {
    const panel = document.querySelector("#browse-players-panel");
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    event.currentTarget.setAttribute("aria-expanded", String(!isOpen));
  });
  document.querySelector("#browse-batter-select").addEventListener("change", (event) => {
    const selected = batterCandidates.find((person) => Number(person.id) === Number(event.target.value));
    if (!selected) return;
    batter = selected;
    setPlayerInput("batter", batter);
    analyzeMatchup();
  });
  document.querySelector("#browse-pitcher-select").addEventListener("change", (event) => {
    const selected = pitcherCandidates.find((person) => Number(person.id) === Number(event.target.value));
    if (!selected) return;
    pitcher = selected;
    setPlayerInput("pitcher", pitcher);
    analyzeMatchup();
  });
  document.querySelectorAll("[data-team-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.teamSort;
      activeTeamOffenseSort = activeTeamOffenseSort.key === key
        ? { key, dir: activeTeamOffenseSort.dir * -1 }
        : { key, dir: ["name", "position", "seasons"].includes(key) ? 1 : -1 };
      renderTeamOffense(teamOffenseRows, selectedBattingTeam()[1], pitcher.fullName);
    });
  });
  document.querySelector("#batter-autocomplete").addEventListener("input", () => {
    clearTimeout(matchupSearchTimer);
    matchupSearchTimer = setTimeout(() => handleAutocompleteInput("batter"), 180);
  });
  document.querySelector("#pitcher-autocomplete").addEventListener("input", () => {
    clearTimeout(matchupSearchTimer);
    matchupSearchTimer = setTimeout(() => handleAutocompleteInput("pitcher"), 180);
  });
  document.querySelector("#batter-autocomplete").addEventListener("change", () => chooseAutocompletePlayer("batter"));
  document.querySelector("#pitcher-autocomplete").addEventListener("change", () => chooseAutocompletePlayer("pitcher"));
}

populateControls();
applyUrlParams();
bindEvents();
const startsOnProbables = isProbablesMode() && !hasSharedMatchupParams();
setGameDayOpen(startsOnProbables);
setMatchupWorkspaceOpen(!startsOnProbables);
populateTeamPlayerDropdowns().then(() => {
  if (startsOnProbables) loadGameDay();
  else analyzeMatchup();
});
