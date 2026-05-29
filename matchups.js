const firstSeason = 1901;
const lastSeason = 2026;
const peopleCache = new Map();
const statsCache = new Map();
const headToHeadCache = new Map();
const rosterCache = new Map();

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
let batter = { id: 605141, fullName: "Mookie Betts", position: "SS" };
let pitcher = { id: 694973, fullName: "Paul Skenes", position: "P" };

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

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request returned ${response.status}`);
  return response.json();
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
      batSide: person.batSide?.code || "",
      pitchHand: person.pitchHand?.code || ""
    }))
    .filter((person) => group === "pitching" ? person.position === "P" : person.position !== "P");
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
      position: row.position?.abbreviation || "MLB"
    }))
    .filter((player) => player.id);
  rosterCache.set(cacheKey, players);
  return players;
}

async function teamRosterHitters(teamAbbr) {
  const players = await teamRosterPlayers(teamAbbr);
  return players.filter((player) => player.position !== "P" && player.position !== "TWP");
}

async function teamRosterPitchers(teamAbbr) {
  const players = await teamRosterPlayers(teamAbbr);
  return players.filter((player) => player.position === "P" || player.position === "TWP");
}

function renderPeopleOptions(selectId, people, selected) {
  const options = people.length ? people : [selected];
  const hasSelected = options.some((person) => Number(person.id) === Number(selected.id));
  const merged = hasSelected ? options : [selected, ...options];
  document.querySelector(selectId).innerHTML = merged.map((person) => `<option value="${person.id}">${person.fullName} (${person.position || "MLB"})</option>`).join("");
  document.querySelector(selectId).value = String(selected.id);
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

function renderTeamOffense(rows, teamName, pitcherName) {
  document.querySelector("#team-offense-title").textContent = `${teamName} career offense vs ${pitcherName}`;
  document.querySelector("#team-offense-status").textContent = `${rows.length} ${activeRosterType === "40Man" ? "40-man" : "active"} hitters loaded`;
  document.querySelector("#team-offense-table").innerHTML = rows.map((row) => {
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
        <td>${total.bb}</td>
        <td>${total.so}</td>
        <td>${row.headToHead.length ? fmt(total.avg) : "-"}</td>
        <td>${row.headToHead.length ? fmt(total.ops) : "-"}</td>
        <td>${seasons}</td>
      </tr>
    `;
  }).join("") || `<tr><td colspan="11" class="empty-row">No active hitters found for this team.</td></tr>`;
}

async function updateTeamOffense() {
  const [teamAbbr, teamName] = selectedBattingTeam();
  document.querySelector("#team-offense-title").textContent = `${teamName} career offense vs ${pitcher.fullName}`;
  document.querySelector("#team-offense-status").textContent = "Loading offense...";
  document.querySelector("#team-offense-table").innerHTML = `<tr><td colspan="11" class="empty-row">Loading team offense...</td></tr>`;
  try {
    const hitters = await teamRosterHitters(teamAbbr);
    const rows = await Promise.all(hitters.map(async (hitter) => ({
      ...hitter,
      headToHead: await headToHeadStats(hitter, pitcher)
    })));
    rows.sort((a, b) => {
      const aTotal = aggregateHeadToHead(a.headToHead);
      const bTotal = aggregateHeadToHead(b.headToHead);
      return bTotal.pa - aTotal.pa || a.fullName.localeCompare(b.fullName);
    });
    renderTeamOffense(rows, teamName, pitcher.fullName);
  } catch (error) {
    document.querySelector("#team-offense-status").textContent = "Could not load offense";
    document.querySelector("#team-offense-table").innerHTML = `<tr><td colspan="11" class="empty-row">Could not load this team's head-to-head history.</td></tr>`;
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
  renderPeopleOptions("#batter-select", hitters, batter);
  renderPeopleOptions("#pitcher-select", pitchers, pitcher);
}

function renderMatchup(payload) {
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

async function analyzeMatchup() {
  document.querySelector("#matchup-status").textContent = "Loading matchup...";
  document.querySelector("#matchup-read").innerHTML = `<div class="empty-state">Loading MLB matchup data...</div>`;
  try {
    const [batterStats, pitcherStats, headToHead] = await Promise.all([
      playerStats(batter, "hitting"),
      playerStats(pitcher, "pitching"),
      headToHeadStats(batter, pitcher)
    ]);
    renderMatchup({ batter: batterStats, pitcher: pitcherStats, headToHead });
    updateTeamOffense();
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
  document.querySelector("#matchup-batting-team").value = "LAD";
  document.querySelector("#matchup-pitching-team").value = "PIT";
  document.querySelector("#matchup-roster-pool").value = activeRosterType;
  document.querySelector("#matchup-park").innerHTML = parks.map(([abbr, name, factor]) => `<option value="${abbr}">${name} (${factor})</option>`).join("");
  document.querySelector("#matchup-park").value = "LAD";
  renderPeopleOptions("#batter-select", [batter], batter);
  renderPeopleOptions("#pitcher-select", [pitcher], pitcher);
}

async function handleSearch(event, group) {
  event.preventDefault();
  const input = document.querySelector(group === "hitting" ? "#batter-query" : "#pitcher-query");
  const query = input.value;
  const people = await searchPeople(query, group);
  if (!people.length) return;
  if (group === "hitting") {
    batter = people[0];
    renderPeopleOptions("#batter-select", people, batter);
  } else {
    pitcher = people[0];
    renderPeopleOptions("#pitcher-select", people, pitcher);
  }
  input.value = "";
  analyzeMatchup();
}

function bindEvents() {
  document.querySelector("#matchup-season").addEventListener("change", (event) => {
    activeSeason = event.target.value;
    populateTeamPlayerDropdowns().then(analyzeMatchup);
  });
  document.querySelector("#run-matchup").addEventListener("click", analyzeMatchup);
  document.querySelector("#matchup-park").addEventListener("change", analyzeMatchup);
  document.querySelector("#matchup-batting-team").addEventListener("change", () => {
    populateTeamPlayerDropdowns({ selectFirst: true }).then(analyzeMatchup);
  });
  document.querySelector("#matchup-pitching-team").addEventListener("change", () => {
    populateTeamPlayerDropdowns({ selectFirst: true }).then(analyzeMatchup);
  });
  document.querySelector("#matchup-roster-pool").addEventListener("change", (event) => {
    activeRosterType = event.target.value;
    populateTeamPlayerDropdowns({ selectFirst: true }).then(analyzeMatchup);
  });
  document.querySelector("#advanced-search-toggle").addEventListener("click", (event) => {
    const panel = document.querySelector("#matchup-advanced-search");
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    event.currentTarget.setAttribute("aria-expanded", String(!isOpen));
  });
  document.querySelector("#batter-search-form").addEventListener("submit", (event) => handleSearch(event, "hitting"));
  document.querySelector("#pitcher-search-form").addEventListener("submit", (event) => handleSearch(event, "pitching"));
  document.querySelector("#batter-select").addEventListener("change", (event) => {
    batter = { id: Number(event.target.value), fullName: event.target.selectedOptions[0].textContent.replace(/\s+\([^)]+\)$/, "") };
    analyzeMatchup();
  });
  document.querySelector("#pitcher-select").addEventListener("change", (event) => {
    pitcher = { id: Number(event.target.value), fullName: event.target.selectedOptions[0].textContent.replace(/\s+\([^)]+\)$/, "") };
    analyzeMatchup();
  });
}

populateControls();
bindEvents();
populateTeamPlayerDropdowns().then(analyzeMatchup);
