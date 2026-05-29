const firstSeason = 1901;
const lastSeason = 2026;
const peopleCache = new Map();
const statsCache = new Map();

const teams = [
  ["ARI", "Arizona Diamondbacks"],
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
  ["ATH", "Athletics"],
  ["PHI", "Philadelphia Phillies"],
  ["PIT", "Pittsburgh Pirates"],
  ["SD", "San Diego Padres"],
  ["SF", "San Francisco Giants"],
  ["SEA", "Seattle Mariners"],
  ["STL", "St. Louis Cardinals"],
  ["TB", "Tampa Bay Rays"],
  ["TEX", "Texas Rangers"],
  ["TOR", "Toronto Blue Jays"],
  ["WSH", "Washington Nationals"]
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

function inningsToOuts(value) {
  const [whole, fraction = "0"] = String(value || "0").split(".");
  return (Number(whole) || 0) * 3 + (Number(fraction) || 0);
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

function renderPeopleOptions(selectId, people, selected) {
  const options = people.length ? people : [selected];
  document.querySelector(selectId).innerHTML = options.map((person) => `<option value="${person.id}">${person.fullName} (${person.position || "MLB"})</option>`).join("");
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

function edgeLabel(hitter, pitcherProfile) {
  const hitterScore = hitter.splitOps * 100;
  const pitcherScore = (1 - Math.min(pitcherProfile.splitOps || 0.7, 1)) * 100;
  const diff = hitterScore - pitcherScore;
  if (diff > 18) return ["Batter edge", "The hitter's split profile is meaningfully stronger than the pitcher's allowed profile."];
  if (diff < -18) return ["Pitcher edge", "The pitcher suppresses this side well enough to tilt the matchup."];
  return ["Balanced", "The handedness split reads close, so recent form and game context matter more."];
}

function renderMatchup(payload) {
  const hitter = hitterSummary(payload.batter, payload.pitcher.pitchHand);
  const pitcherProfile = pitcherSummary(payload.pitcher, payload.batter.batSide);
  const [edge, edgeNote] = edgeLabel(hitter, pitcherProfile);
  const [, parkName, parkFactor, parkNote] = parkContext();
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
    <p>${payload.batter.fullName} is carrying a ${fmt(payload.batter.season.ops)} season OPS, with a ${fmt(hitter.splitOps)} OPS in the relevant handedness split.</p>
    <p>${payload.pitcher.fullName} owns a ${fmt(payload.pitcher.season.era, 2)} ERA and ${fmt(payload.pitcher.season.whip, 2)} WHIP, with a ${fmt(pitcherProfile.splitOps)} OPS allowed in the matching split.</p>
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
  `;
}

async function analyzeMatchup() {
  document.querySelector("#matchup-status").textContent = "Loading matchup...";
  document.querySelector("#matchup-read").innerHTML = `<div class="empty-state">Loading MLB matchup data...</div>`;
  try {
    const [batterStats, pitcherStats] = await Promise.all([
      playerStats(batter, "hitting"),
      playerStats(pitcher, "pitching")
    ]);
    renderMatchup({ batter: batterStats, pitcher: pitcherStats });
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
  document.querySelector("#matchup-park").innerHTML = parks.map(([abbr, name, factor]) => `<option value="${abbr}">${name} (${factor})</option>`).join("");
  document.querySelector("#matchup-park").value = "LAD";
  renderPeopleOptions("#batter-select", [batter], batter);
  renderPeopleOptions("#pitcher-select", [pitcher], pitcher);
}

async function handleSearch(event, group) {
  event.preventDefault();
  const query = document.querySelector(group === "hitting" ? "#batter-query" : "#pitcher-query").value;
  const people = await searchPeople(query, group);
  if (!people.length) return;
  if (group === "hitting") {
    batter = people[0];
    renderPeopleOptions("#batter-select", people, batter);
  } else {
    pitcher = people[0];
    renderPeopleOptions("#pitcher-select", people, pitcher);
  }
  analyzeMatchup();
}

function bindEvents() {
  document.querySelector("#matchup-season").addEventListener("change", (event) => {
    activeSeason = event.target.value;
    analyzeMatchup();
  });
  document.querySelector("#run-matchup").addEventListener("click", analyzeMatchup);
  document.querySelector("#matchup-park").addEventListener("change", analyzeMatchup);
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
analyzeMatchup();
