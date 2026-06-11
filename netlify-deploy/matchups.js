const firstSeason = 1901;
const lastSeason = 2026;
const peopleCache = new Map();
const statsCache = new Map();
const headToHeadCache = new Map();
const rosterCache = new Map();
const vsTeamCache = new Map();

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
let batter = { id: 605141, fullName: "Mookie Betts", position: "SS" };
let pitcher = { id: 694973, fullName: "Paul Skenes", position: "P" };
let teamOffenseRows = [];
let activeTeamOffenseSort = { key: "pa", dir: -1 };
let batterCandidates = [];
let pitcherCandidates = [];
let matchupSearchTimer;

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

function teamByAbbr(abbr) {
  const row = teams.find(([teamAbbr]) => teamAbbr === abbr) || teams[0];
  return { abbr: row[0], name: row[1], id: row[2] };
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
  const rows = (data.stats?.[0]?.splits || []).map((split) => ({
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
    const seasons = row.headToHead.length ? row.headToHead.map((split) => split.season).join(", ") : "None";
    return `
      <tr>
        <td><a class="summary-link" href="${baseballReferenceSearchUrl(row.fullName)}" target="_blank" rel="noopener noreferrer">${row.fullName}</a></td>
        <td>${row.position || "-"}</td>
        <td>${total.pa}</td>
        <td>${total.ab}</td>
        <td>${total.h}</td>
        <td>${total.hr}</td>
        <td>${total.rbi}</td>
        <td>${total.bb}</td>
        <td>${total.so}</td>
        <td>${row.headToHead.length ? fmt(total.avg) : "-"}</td>
        <td>${row.headToHead.length ? fmt(total.ops) : "-"}</td>
        <td>${seasons}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="12" class="empty-row">No active hitters found for this team.</td></tr>`;
}

function statLine(stat = {}, keys = []) {
  return keys.map(([key, label, formatter]) => `${label} ${formatter ? formatter(stat[key]) : (stat[key] ?? "-")}`).join(" | ");
}

function renderPlayerTeamTable(type, rows) {
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
  document.querySelector("#player-team-table").innerHTML = rows.length
    ? rows
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
    const playerTeam = history.total?.team?.name || profile.teamName || player.teamName || "Career";
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
    const seasonLine = type === "pitcher"
      ? `Season: ERA ${profile.season.era || "-"} | WHIP ${profile.season.whip || "-"} | SO ${profile.season.strikeOuts || 0}`
      : `Season: AVG ${profile.season.avg || "-"} | OPS ${profile.season.ops || "-"} | HR ${profile.season.homeRuns || 0}`;

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
        <span>${history.rows.length ? `${history.rows.length} detailed split rows` : "No season rows available"}</span>
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
  document.querySelector("#team-offense-table").innerHTML = `<tr><td colspan="12" class="empty-row">Loading team offense...</td></tr>`;
  try {
    const hitters = await teamRosterHitters(teamAbbr);
    const rows = await Promise.all(hitters.map(async (hitter) => ({
      ...hitter,
      headToHead: await headToHeadStats(hitter, pitcher)
    })));
    renderTeamOffense(rows, teamName, pitcher.fullName);
  } catch (error) {
    document.querySelector("#team-offense-status").textContent = "Could not load offense";
    document.querySelector("#team-offense-table").innerHTML = `<tr><td colspan="12" class="empty-row">Could not load this team's head-to-head history.</td></tr>`;
  }
}

async function populateTeamPlayerDropdowns({ selectFirst = false } = {}) {
  const battingTeam = document.querySelector("#matchup-batting-team")?.value || "LAD";
  const pitchingTeam = document.querySelector("#matchup-pitching-team")?.value || "PIT";
  const [hitters, pitchers] = await Promise.all([
    teamRosterHitters(battingTeam),
    teamRosterPitchers(pitchingTeam)
  ]);
  if (selectFirst && hitters.length) batter = hitters[0];
  if (selectFirst && pitchers.length) pitcher = pitchers[0];
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
  const careerOnly = activeViewMode === "career";
  document.querySelector(".player-team-panel")?.removeAttribute("hidden");
  document.querySelector(".matchup-offense-panel")?.toggleAttribute("hidden", careerOnly);
}

async function analyzeMatchup() {
  syncViewModePanels();
  document.querySelector("#matchup-status").textContent = "Loading matchup...";
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
    updatePlayerVsTeam();
    if (activeViewMode === "season") {
      updateTeamOffense();
    }
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
  setPlayerInput("batter", batter);
  setPlayerInput("pitcher", pitcher);
}

function bindEvents() {
  document.querySelector("#matchup-season").addEventListener("change", (event) => {
    activeSeason = event.target.value;
    populateTeamPlayerDropdowns().then(analyzeMatchup);
  });
  document.querySelector("#run-matchup").addEventListener("click", analyzeMatchup);
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
    populateTeamPlayerDropdowns({ selectFirst: true }).then(analyzeMatchup);
  });
  document.querySelector("#matchup-pitching-team").addEventListener("change", () => {
    if (document.querySelector("#player-team-type").value === "batter") {
      document.querySelector("#player-team-opponent").value = document.querySelector("#matchup-pitching-team").value;
    }
    populateTeamPlayerDropdowns({ selectFirst: true }).then(analyzeMatchup);
  });
  document.querySelector("#matchup-roster-pool").addEventListener("change", (event) => {
    activeRosterType = event.target.value;
    populateTeamPlayerDropdowns({ selectFirst: true }).then(analyzeMatchup);
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
bindEvents();
populateTeamPlayerDropdowns().then(analyzeMatchup);
