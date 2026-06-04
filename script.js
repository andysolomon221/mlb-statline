const seasons = {
  2024: {
    label: "2024 Modern Power",
    summary: { runs: 4.39, ops: .711, k: 22.6, saves: 67 },
    players: [
      { name: "Aaron Judge", team: "NYY", avg: .322, ops: 1.159, hr: 58, rbi: 144, war: 10.8 },
      { name: "Shohei Ohtani", team: "LAD", avg: .310, ops: 1.036, hr: 54, rbi: 130, war: 9.2 },
      { name: "Bobby Witt Jr.", team: "KC", avg: .332, ops: .977, hr: 32, rbi: 109, war: 9.4 },
      { name: "Juan Soto", team: "NYY", avg: .288, ops: .989, hr: 41, rbi: 109, war: 7.9 },
      { name: "Gunnar Henderson", team: "BAL", avg: .281, ops: .893, hr: 37, rbi: 92, war: 8.0 },
      { name: "Francisco Lindor", team: "NYM", avg: .273, ops: .844, hr: 33, rbi: 91, war: 7.8 }
    ],
    teams: [
      { name: "Dodgers", abbr: "LAD", wins: 98, runs: 842, era: 3.90, ops: .781, defense: 18, color: "#1f6fb2" },
      { name: "Yankees", abbr: "NYY", wins: 94, runs: 815, era: 3.74, ops: .762, defense: 11, color: "#102a45" },
      { name: "Orioles", abbr: "BAL", wins: 91, runs: 786, era: 3.89, ops: .750, defense: 16, color: "#d56f26" },
      { name: "Phillies", abbr: "PHI", wins: 95, runs: 784, era: 3.78, ops: .747, defense: 20, color: "#c83f4c" },
      { name: "Braves", abbr: "ATL", wins: 89, runs: 742, era: 3.62, ops: .731, defense: 14, color: "#ba0c2f" },
      { name: "Astros", abbr: "HOU", wins: 88, runs: 738, era: 3.85, ops: .738, defense: 8, color: "#e87c1e" }
    ],
    parks: [
      { name: "Coors Field", tilt: "Extra-base hits", factor: 116 },
      { name: "Yankee Stadium", tilt: "Left-handed power", factor: 108 },
      { name: "Oracle Park", tilt: "Run prevention", factor: 91 },
      { name: "Fenway Park", tilt: "Doubles and contact", factor: 104 }
    ]
  },
  2001: {
    label: "2001 Expansion Era",
    summary: { runs: 4.78, ops: .759, k: 16.4, saves: 68 },
    players: [
      { name: "Barry Bonds", team: "SF", avg: .328, ops: 1.379, hr: 73, rbi: 137, war: 11.9 },
      { name: "Sammy Sosa", team: "CHC", avg: .328, ops: 1.174, hr: 64, rbi: 160, war: 10.3 },
      { name: "Luis Gonzalez", team: "ARI", avg: .325, ops: 1.117, hr: 57, rbi: 142, war: 7.9 },
      { name: "Alex Rodriguez", team: "TEX", avg: .318, ops: 1.021, hr: 52, rbi: 135, war: 8.3 },
      { name: "Jason Giambi", team: "OAK", avg: .342, ops: 1.137, hr: 38, rbi: 120, war: 9.2 },
      { name: "Todd Helton", team: "COL", avg: .336, ops: 1.116, hr: 49, rbi: 146, war: 7.8 }
    ],
    teams: [
      { name: "Mariners", abbr: "SEA", wins: 116, runs: 927, era: 3.54, ops: .795, defense: 31, color: "#0c6b68" },
      { name: "Athletics", abbr: "OAK", wins: 102, runs: 884, era: 3.59, ops: .801, defense: 12, color: "#0b5f3a" },
      { name: "Diamondbacks", abbr: "ARI", wins: 92, runs: 818, era: 3.87, ops: .782, defense: 6, color: "#7b2748" },
      { name: "Yankees", abbr: "NYY", wins: 95, runs: 804, era: 4.02, ops: .767, defense: 10, color: "#102a45" },
      { name: "Giants", abbr: "SF", wins: 90, runs: 799, era: 4.18, ops: .776, defense: 3, color: "#d56f26" },
      { name: "Cardinals", abbr: "STL", wins: 93, runs: 814, era: 3.93, ops: .781, defense: 13, color: "#c41e3a" }
    ],
    parks: [
      { name: "Coors Field", tilt: "Runs and doubles", factor: 122 },
      { name: "Enron Field", tilt: "Right-handed pull power", factor: 107 },
      { name: "Safeco Field", tilt: "Pitcher leverage", factor: 96 },
      { name: "Pac Bell Park", tilt: "Triples and alleys", factor: 94 }
    ]
  },
  1998: {
    label: "1998 Home Run Chase",
    summary: { runs: 4.79, ops: .755, k: 16.9, saves: 65 },
    players: [
      { name: "Mark McGwire", team: "STL", avg: .299, ops: 1.222, hr: 70, rbi: 147, war: 7.5 },
      { name: "Sammy Sosa", team: "CHC", avg: .308, ops: 1.024, hr: 66, rbi: 158, war: 6.5 },
      { name: "Ken Griffey Jr.", team: "SEA", avg: .284, ops: .977, hr: 56, rbi: 146, war: 6.6 },
      { name: "Albert Belle", team: "CWS", avg: .328, ops: 1.055, hr: 49, rbi: 152, war: 7.0 },
      { name: "Barry Bonds", team: "SF", avg: .303, ops: 1.047, hr: 37, rbi: 122, war: 8.1 },
      { name: "Alex Rodriguez", team: "SEA", avg: .310, ops: .919, hr: 42, rbi: 124, war: 8.5 }
    ],
    teams: [
      { name: "Yankees", abbr: "NYY", wins: 114, runs: 965, era: 3.82, ops: .824, defense: 24, color: "#102a45" },
      { name: "Braves", abbr: "ATL", wins: 106, runs: 826, era: 3.25, ops: .767, defense: 19, color: "#ba0c2f" },
      { name: "Astros", abbr: "HOU", wins: 102, runs: 874, era: 3.63, ops: .793, defense: 8, color: "#e87c1e" },
      { name: "Padres", abbr: "SD", wins: 98, runs: 749, era: 3.63, ops: .733, defense: 13, color: "#7b5b32" },
      { name: "Cubs", abbr: "CHC", wins: 90, runs: 831, era: 4.18, ops: .763, defense: 0, color: "#1f6fb2" },
      { name: "Giants", abbr: "SF", wins: 89, runs: 845, era: 4.24, ops: .778, defense: 4, color: "#d56f26" }
    ],
    parks: [
      { name: "Coors Field", tilt: "Offense everywhere", factor: 125 },
      { name: "Wrigley Field", tilt: "Wind-driven power", factor: 106 },
      { name: "Astrodome", tilt: "Run suppression", factor: 92 },
      { name: "Kingdome", tilt: "Home run lift", factor: 109 }
    ]
  },
  1968: {
    label: "1968 Year of the Pitcher",
    summary: { runs: 3.42, ops: .637, k: 15.8, saves: 54 },
    players: [
      { name: "Carl Yastrzemski", team: "BOS", avg: .301, ops: .922, hr: 23, rbi: 74, war: 10.5 },
      { name: "Willie McCovey", team: "SF", avg: .293, ops: .923, hr: 36, rbi: 105, war: 7.6 },
      { name: "Frank Howard", team: "WSH", avg: .274, ops: .890, hr: 44, rbi: 106, war: 5.5 },
      { name: "Harmon Killebrew", team: "MIN", avg: .210, ops: .801, hr: 17, rbi: 40, war: 3.4 },
      { name: "Willie Mays", team: "SF", avg: .289, ops: .860, hr: 23, rbi: 79, war: 6.2 },
      { name: "Pete Rose", team: "CIN", avg: .335, ops: .861, hr: 10, rbi: 49, war: 6.4 }
    ],
    teams: [
      { name: "Tigers", abbr: "DET", wins: 103, runs: 671, era: 2.71, ops: .695, defense: 18, color: "#102a45" },
      { name: "Cardinals", abbr: "STL", wins: 97, runs: 583, era: 2.49, ops: .653, defense: 22, color: "#c41e3a" },
      { name: "Orioles", abbr: "BAL", wins: 91, runs: 579, era: 2.66, ops: .646, defense: 19, color: "#d56f26" },
      { name: "Giants", abbr: "SF", wins: 88, runs: 599, era: 2.71, ops: .681, defense: 12, color: "#d56f26" },
      { name: "Cubs", abbr: "CHC", wins: 84, runs: 612, era: 3.35, ops: .683, defense: 5, color: "#1f6fb2" },
      { name: "Red Sox", abbr: "BOS", wins: 86, runs: 614, era: 3.34, ops: .691, defense: 3, color: "#bd3039" }
    ],
    parks: [
      { name: "Dodger Stadium", tilt: "Pitcher command", factor: 91 },
      { name: "Astrodome", tilt: "Low run scoring", factor: 88 },
      { name: "Tiger Stadium", tilt: "Right-handed power", factor: 103 },
      { name: "Fenway Park", tilt: "Contact and doubles", factor: 105 }
    ]
  }
};

let activeMetric = "ops";
let activeSort = { key: "ops", dir: -1 };
let activeSeason = "2026";
let activeMode = "single";
let activeRange = { start: 1990, end: 1999 };
let activeLeague = "all";
let pendingTeamAbbr = new URLSearchParams(window.location.search).get("team") || "";
let activeTeamId = "all";
let activeTeamName = "All teams";
let activePosition = "all";
let activeBoardSize = "leaders";
let activeTeamMetric = "wins";
let leaderRows = [];
let leaderError = "";
let leadersLoading = true;
let leaderRequestId = 0;
let teamRows = [];
let teamsLoading = true;
let teamError = "";
let teamRequestId = 0;
const initialParams = new URLSearchParams(window.location.search);

const numberFormat = new Intl.NumberFormat("en-US");
const firstSeason = 1901;
const lastSeason = 2026;
const seasonLeaderCache = new Map();
const standingsCache = new Map();
const teamStatsCache = new Map();
const teamPitchingSummaryCache = new Map();
const boardType = document.body.dataset.board || "hitting";
const leagueIds = { al: "103", nl: "104" };
const positionOptions = {
  hitting: [
    ["all", "All hitters"],
    ["C", "C"],
    ["1B", "1B"],
    ["2B", "2B"],
    ["3B", "3B"],
    ["SS", "SS"],
    ["OF", "OF"],
    ["DH", "DH"]
  ],
  pitching: [
    ["all", "All pitchers"],
    ["SP", "SP"],
    ["RP", "RP"]
  ]
};
const teamAbbr = {
  "New York Yankees": "NYY",
  "Yankees": "NYY",
  "Los Angeles Dodgers": "LAD",
  "Dodgers": "LAD",
  "Boston Red Sox": "BOS",
  "Red Sox": "BOS",
  "New York Mets": "NYM",
  "Mets": "NYM",
  "Chicago Cubs": "CHC",
  "Cubs": "CHC",
  "Chicago White Sox": "CWS",
  "White Sox": "CWS",
  "San Francisco Giants": "SF",
  "Giants": "SF",
  "Oakland Athletics": "OAK",
  "Athletics": "OAK",
  "Toronto Blue Jays": "TOR",
  "Blue Jays": "TOR",
  "Arizona D-backs": "AZ",
  "D-backs": "AZ",
  "Arizona Diamondbacks": "AZ",
  "Diamondbacks": "AZ",
  "Tampa Bay Rays": "TB",
  "Rays": "TB",
  "Cleveland Guardians": "CLE",
  "Guardians": "CLE",
  "Cleveland Indians": "CLE",
  "Indians": "CLE",
  "Los Angeles Angels": "LAA",
  "Angels": "LAA",
  "Miami Marlins": "MIA",
  "Marlins": "MIA",
  "Montreal Expos": "MON",
  "Expos": "MON",
  "Atlanta Braves": "ATL",
  "Braves": "ATL",
  "Milwaukee Brewers": "MIL",
  "Brewers": "MIL",
  "St. Louis Cardinals": "STL",
  "Cardinals": "STL",
  "Philadelphia Phillies": "PHI",
  "Phillies": "PHI",
  "Pittsburgh Pirates": "PIT",
  "Pirates": "PIT",
  "Cincinnati Reds": "CIN",
  "Reds": "CIN",
  "Washington Nationals": "WSH",
  "Nationals": "WSH",
  "San Diego Padres": "SD",
  "Padres": "SD",
  "Colorado Rockies": "COL",
  "Rockies": "COL",
  "Seattle Mariners": "SEA",
  "Mariners": "SEA",
  "Texas Rangers": "TEX",
  "Rangers": "TEX",
  "Houston Astros": "HOU",
  "Astros": "HOU",
  "Kansas City Royals": "KC",
  "Royals": "KC",
  "Minnesota Twins": "MIN",
  "Twins": "MIN",
  "Baltimore Orioles": "BAL",
  "Orioles": "BAL",
  "Detroit Tigers": "DET",
  "Tigers": "DET"
};
const boardConfig = {
  hitting: {
    group: "hitting",
    label: "batting",
    chartNoun: "offensive",
    eyebrow: "Run Creation",
    defaultMetric: "ops",
    columns: [
      ["ab", "AB"],
      ["avg", "AVG"],
      ["ops", "OPS"],
      ["hits", "H"],
      ["hr", "HR"],
      ["rbi", "RBI"],
      ["slg", "SLG"]
    ],
    metrics: [
      ["ops", "OPS"],
      ["hits", "Hits"],
      ["hr", "HR"],
      ["rbi", "RBI"],
      ["slg", "SLG"],
      ["avg", "AVG"]
    ],
    sortMap: { avg: "avg", ops: "ops", hits: "hits", hr: "homeRuns", rbi: "rbi", slg: "slg" },
    rateMetrics: ["avg", "ops", "slg"],
    weightKey: "pa",
    lowerBetter: []
    ,
    teamMetrics: [
      ["wins", "Wins"],
      ["runs", "Runs"],
      ["hits", "Hits"],
      ["hr", "HR"],
      ["rbi", "RBI"],
      ["ops", "OPS"],
      ["avg", "AVG"],
      ["runDifferential", "Run Diff"]
    ],
    teamRateMetrics: ["ops", "avg"],
    teamLowerBetter: []
  },
  pitching: {
    group: "pitching",
    label: "pitching",
    chartNoun: "pitching",
    eyebrow: "Run Prevention",
    defaultMetric: "era",
    columns: [
      ["ipOuts", "IP"],
      ["era", "ERA"],
      ["wins", "W"],
      ["hits", "H"],
      ["strikeouts", "SO"],
      ["whip", "WHIP"],
      ["saves", "SV"]
    ],
    metrics: [
      ["era", "ERA"],
      ["strikeouts", "SO"],
      ["hits", "Hits Allowed"],
      ["wins", "Wins"],
      ["whip", "WHIP"],
      ["saves", "Saves"]
    ],
    sortMap: { era: "era", wins: "wins", hits: "hits", strikeouts: "strikeOuts", whip: "whip", saves: "saves" },
    rateMetrics: ["era", "whip"],
    weightKey: "ipOuts",
    lowerBetter: ["era", "whip"]
    ,
    teamMetrics: [
      ["wins", "Wins"],
      ["era", "ERA"],
      ["strikeouts", "SO"],
      ["hits", "Hits Allowed"],
      ["whip", "WHIP"],
      ["saves", "Saves"],
      ["runsAllowed", "Runs Allowed"],
      ["runDifferential", "Run Diff"]
    ],
    teamRateMetrics: ["era", "whip"],
    teamLowerBetter: ["era", "whip", "runsAllowed"]
  }
};
const config = boardConfig[boardType];
activeMetric = config.defaultMetric;
activeSort = { key: activeMetric, dir: defaultSortDir(activeMetric) };
if (config.metrics.some(([key]) => key === initialParams.get("metric"))) {
  activeMetric = initialParams.get("metric");
  activeSort = { key: activeMetric, dir: defaultSortDir(activeMetric) };
}
if (initialParams.get("mode") === "range") {
  activeMode = "range";
  activeRange = {
    start: Math.max(firstSeason, Math.min(lastSeason, Number(initialParams.get("start")) || activeRange.start)),
    end: Math.max(firstSeason, Math.min(lastSeason, Number(initialParams.get("end")) || activeRange.end))
  };
}
if (initialParams.get("season")) {
  activeSeason = String(Math.max(firstSeason, Math.min(lastSeason, Number(initialParams.get("season")) || Number(activeSeason))));
  activeMode = "single";
}
const generatedPlayersByEra = {
  deadball: ["Ty Cobb", "Honus Wagner", "Nap Lajoie", "Tris Speaker", "Eddie Collins", "Sam Crawford", "Home Run Baker", "Shoeless Joe Jackson"],
  liveball: ["Babe Ruth", "Lou Gehrig", "Jimmie Foxx", "Mel Ott", "Hank Greenberg", "Joe DiMaggio", "Ted Williams", "Stan Musial"],
  postwar: ["Willie Mays", "Hank Aaron", "Mickey Mantle", "Frank Robinson", "Roberto Clemente", "Ernie Banks", "Eddie Mathews", "Al Kaline"],
  expansion: ["Reggie Jackson", "Mike Schmidt", "George Brett", "Robin Yount", "Dave Winfield", "Eddie Murray", "Rickey Henderson", "Cal Ripken Jr."],
  nineties: ["Ken Griffey Jr.", "Barry Bonds", "Mark McGwire", "Sammy Sosa", "Frank Thomas", "Rafael Palmeiro", "Jeff Bagwell", "Juan Gonzalez"],
  aughts: ["Alex Rodriguez", "Albert Pujols", "Barry Bonds", "Manny Ramirez", "David Ortiz", "Jim Thome", "Vladimir Guerrero", "Miguel Cabrera"],
  modern: ["Mike Trout", "Bryce Harper", "Mookie Betts", "Aaron Judge", "Shohei Ohtani", "Juan Soto", "Freddie Freeman", "Ronald Acuna Jr."]
};
const generatedTeams = [
  ["Yankees", "NYY", "#102a45"], ["Dodgers", "LAD", "#1f6fb2"],
  ["Cardinals", "STL", "#c41e3a"], ["Red Sox", "BOS", "#bd3039"],
  ["Giants", "SF", "#d56f26"], ["Cubs", "CHC", "#1f6fb2"],
  ["Tigers", "DET", "#102a45"], ["Athletics", "OAK", "#0b5f3a"]
];
const generatedParks = [
  ["Fenway Park", "Contact and doubles"], ["Yankee Stadium", "Left-handed power"],
  ["Wrigley Field", "Wind and power"], ["Dodger Stadium", "Pitcher command"],
  ["Coors Field", "Extra-base hits"], ["Oracle Park", "Run prevention"]
];

function fmtStat(key, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  if (key === "ipOuts") return `${Math.floor(numeric / 3)}.${numeric % 3}`;
  if (["avg", "ops", "slg"].includes(key)) return numeric.toFixed(3).replace(/^0/, "");
  if (["era", "whip"].includes(key)) return numeric.toFixed(2);
  if (key === "pct") return numeric.toFixed(3).replace(/^0/, "");
  return numberFormat.format(Math.round(numeric));
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("");
}

function baseballReferenceSearchUrl(name) {
  return `https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(name)}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[character]));
}

function currentSeason() {
  return seasons[activeSeason] || generateSeason(Number(activeSeason));
}

function yearList(start = firstSeason, end = lastSeason) {
  const low = Math.min(Number(start), Number(end));
  const high = Math.max(Number(start), Number(end));
  return Array.from({ length: high - low + 1 }, (_, index) => low + index);
}

function waitForBrowserTurn() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function fetchInBatches(items, mapper, batchSize = 6) {
  const results = [];
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    results.push(...await Promise.all(batch.map(mapper)));
    await waitForBrowserTurn();
  }
  return results;
}

function currentScopeLabel() {
  if (activeMode === "single") return activeSeason;
  return activeRange.start === activeRange.end ? String(activeRange.start) : `${activeRange.start}-${activeRange.end}`;
}

function leaderScopeLabel() {
  const scope = currentScopeLabel();
  return activeTeamId === "all" ? scope : `${activeTeamName}, ${scope}`;
}

function playerWeight(player) {
  return Math.max(1, Number(player[config.weightKey]) || 1);
}

function mlbStatsUrl(year, sortMetric = activeMetric) {
  const params = new URLSearchParams({
    stats: "season",
    group: config.group,
    season: String(year),
    playerPool: "ALL",
    limit: "5000",
    sortStat: config.sortMap[sortMetric] || config.sortMap[config.defaultMetric],
    hydrate: "team"
  });
  if (activeLeague !== "all") params.set("leagueIds", leagueIds[activeLeague]);
  if (activeTeamId !== "all") params.set("teamIds", activeTeamId);
  return `https://statsapi.mlb.com/api/v1/stats?${params.toString()}`;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function safeRate(numerator, denominator) {
  const top = Number(numerator);
  const bottom = Number(denominator);
  return Number.isFinite(top) && Number.isFinite(bottom) && bottom > 0 ? top / bottom : 0;
}

function inningsToOuts(value) {
  const text = String(value || "0");
  const [whole, fraction = "0"] = text.split(".");
  return (Number(whole) || 0) * 3 + (Number(fraction) || 0);
}

function defaultSortDir(key) {
  return config?.lowerBetter?.includes(key) ? 1 : -1;
}

function currentPositionFilter() {
  return document.querySelector("#position-filter")?.value || activePosition;
}

function normalizePosition(position) {
  const clean = String(position || "").toUpperCase();
  if (["LF", "CF", "RF", "OF"].includes(clean)) return "OF";
  if (["C", "1B", "2B", "3B", "SS", "DH"].includes(clean)) return clean;
  return clean || "UTIL";
}

function mapApiPlayer(split) {
  const stat = split.stat || {};
  const common = {
    id: split.player?.id || split.player?.fullName,
    name: split.player?.fullName || "Unknown Player",
    team: split.team?.abbreviation || split.team?.teamName || "MLB",
    teamName: split.team?.teamName || split.team?.name || split.team?.abbreviation || "MLB",
    position: normalizePosition(split.position?.abbreviation || split.position?.type || ""),
    seasons: 1
  };
  if (boardType === "pitching") {
    const gamesStarted = toNumber(stat.gamesStarted);
    const gamesPitched = toNumber(stat.gamesPitched) || toNumber(stat.gamesPlayed);
    return {
      ...common,
      position: gamesStarted >= Math.max(1, gamesPitched / 2) ? "SP" : "RP",
      era: toNumber(stat.era),
      wins: toNumber(stat.wins),
      hits: toNumber(stat.hits),
      strikeouts: toNumber(stat.strikeOuts),
      whip: toNumber(stat.whip),
      saves: toNumber(stat.saves),
      gamesStarted,
      gamesPitched,
      ipOuts: inningsToOuts(stat.inningsPitched)
    };
  }
  return {
    ...common,
    avg: toNumber(stat.avg),
    obp: toNumber(stat.obp),
    ops: toNumber(stat.ops),
    slg: toNumber(stat.slg),
    hits: toNumber(stat.hits),
    hr: toNumber(stat.homeRuns),
    rbi: toNumber(stat.rbi),
    ab: toNumber(stat.atBats),
    pa: toNumber(stat.plateAppearances),
    walks: toNumber(stat.baseOnBalls),
    hbp: toNumber(stat.hitByPitch),
    sacFlies: toNumber(stat.sacFlies),
    totalBases: toNumber(stat.totalBases) || Math.round(toNumber(stat.slg) * toNumber(stat.atBats))
  };
}

async function fetchSeasonLeaders(year) {
  const cacheKey = `${boardType}:${activeLeague}:${activeTeamId}:${year}`;
  if (seasonLeaderCache.has(cacheKey)) return seasonLeaderCache.get(cacheKey);
  const response = await fetch(mlbStatsUrl(year));
  if (!response.ok) throw new Error(`MLB Stats API returned ${response.status}`);
  const data = await response.json();
  const rows = (data.stats?.[0]?.splits || []).map(mapApiPlayer).filter((player) => playerWeight(player) > 0);
  seasonLeaderCache.set(cacheKey, rows);
  return rows;
}

async function currentPlayers() {
  if (activeMode === "single") {
    return (await fetchSeasonLeaders(Number(activeSeason))).slice();
  }

  const byPlayer = new Map();
  const seasonsInRange = await fetchInBatches(yearList(activeRange.start, activeRange.end), fetchSeasonLeaders);
  seasonsInRange.forEach((players) => {
    players.forEach((player) => {
      const key = player.id || player.name;
      const weight = playerWeight(player);
      const existing = byPlayer.get(key) || {
        name: player.name,
        team: player.team,
        teamNames: new Map(),
        positions: new Map(),
        weightedTotals: {},
        totals: {},
        componentTotals: { hits: 0, ab: 0, walks: 0, hbp: 0, sacFlies: 0, totalBases: 0 },
        weight: 0,
        qualifier: 0,
        seasons: 0,
        teams: new Map()
      };
      config.columns.forEach(([metric]) => {
        if (config.rateMetrics.includes(metric)) {
          existing.weightedTotals[metric] = (existing.weightedTotals[metric] || 0) + player[metric] * weight;
        } else {
          existing.totals[metric] = (existing.totals[metric] || 0) + player[metric];
        }
      });
      if (boardType === "hitting") {
        existing.componentTotals.hits += toNumber(player.hits);
        existing.componentTotals.ab += toNumber(player.ab);
        existing.componentTotals.walks += toNumber(player.walks);
        existing.componentTotals.hbp += toNumber(player.hbp);
        existing.componentTotals.sacFlies += toNumber(player.sacFlies);
        existing.componentTotals.totalBases += toNumber(player.totalBases);
      }
      existing.weight += weight;
      existing.qualifier += weight;
      existing.seasons += 1;
      existing.teams.set(player.team, (existing.teams.get(player.team) || 0) + weight);
      existing.teamNames.set(player.teamName || player.team, (existing.teamNames.get(player.teamName || player.team) || 0) + weight);
      existing.positions.set(player.position, (existing.positions.get(player.position) || 0) + weight);
      byPlayer.set(key, existing);
    });
  });

  return Array.from(byPlayer.values()).map((player) => {
    const primaryTeam = Array.from(player.teams.entries()).sort((a, b) => b[1] - a[1])[0][0];
    const primaryTeamName = Array.from(player.teamNames.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || primaryTeam;
    const primaryPosition = Array.from(player.positions.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "UTIL";
    const row = {
      name: player.name,
      team: primaryTeam,
      teamName: primaryTeamName,
      position: primaryPosition,
      qualifier: player.qualifier,
      seasons: player.seasons
    };
    config.columns.forEach(([metric]) => {
      row[metric] = config.rateMetrics.includes(metric)
        ? player.weightedTotals[metric] / player.weight
        : player.totals[metric];
    });
    if (boardType === "hitting") {
      const components = player.componentTotals;
      const obpDenominator = components.ab + components.walks + components.hbp + components.sacFlies;
      row.avg = safeRate(components.hits, components.ab);
      row.slg = safeRate(components.totalBases, components.ab);
      row.ops = safeRate(components.hits + components.walks + components.hbp, obpDenominator) + row.slg;
    }
    row[config.weightKey] = player.qualifier;
    return row;
  });
}

function sortedRows(rows) {
  return rows.slice().sort((a, b) => {
    const av = a[activeSort.key];
    const bv = b[activeSort.key];
    if (typeof av === "string") return av.localeCompare(bv) * activeSort.dir;
    return (av - bv) * activeSort.dir;
  });
}

function qualifiedRows(rows, metric = activeMetric) {
  const position = currentPositionFilter();
  const positionRows = position === "all" ? rows : rows.filter((player) => player.position === position);
  if (activeTeamId !== "all") return positionRows;
  if (!config.rateMetrics.includes(metric)) return positionRows;
  const years = activeMode === "single" ? 1 : yearList(activeRange.start, activeRange.end).length;
  const isCurrentSeason = Number(activeSeason) === lastSeason && activeMode === "single";
  const seasonThreshold = boardType === "pitching"
    ? (isCurrentSeason ? 120 : 486)
    : (isCurrentSeason ? 100 : 400);
  const maxRangeThreshold = 3000;
  const rangeThreshold = Math.min(years * (boardType === "pitching" ? 360 : 300), maxRangeThreshold);
  const threshold = activeMode === "single" ? seasonThreshold : rangeThreshold;
  const filtered = positionRows.filter((player) => playerWeight(player) >= threshold);
  return filtered.length >= 5 ? filtered : positionRows.filter((player) => playerWeight(player) >= Math.max(50, threshold * .5));
}

function renderLoadingLeaders() {
  document.querySelector("#bar-chart").innerHTML = `<div class="empty-state">Loading real MLB leader data...</div>`;
  document.querySelector("#player-table").innerHTML = `
    <tr><td colspan="7" class="empty-row">Loading real MLB leader data...</td></tr>
  `;
}

function renderLeaderError(message) {
  document.querySelector("#bar-chart").innerHTML = `<div class="empty-state">${message}</div>`;
  document.querySelector("#player-table").innerHTML = `
    <tr><td colspan="7" class="empty-row">${message}</td></tr>
  `;
}

async function updateLeaders() {
  const requestId = ++leaderRequestId;
  leadersLoading = true;
  leaderError = "";
  renderLoadingLeaders();

  try {
    leaderRows = await currentPlayers();
    if (requestId !== leaderRequestId) return;
    leadersLoading = false;
    renderChart();
    renderTable();
    renderSearchOptions();
  } catch (error) {
    if (requestId !== leaderRequestId) return;
    leadersLoading = false;
    leaderRows = [];
    leaderError = "Could not load MLB Stats API data. Check your internet connection and try again.";
    renderLeaderError(leaderError);
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

function normalizeTeamName(name) {
  return name === "Diamondbacks" ? "D-backs" : name;
}

function abbreviationFor(name) {
  const clean = normalizeTeamName(name);
  return teamAbbr[clean] || clean.split(" ").map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

function mapStandingRecord(record) {
  const name = normalizeTeamName(record.team?.name || "Unknown");
  return {
    id: record.team?.id || name,
    name,
    abbr: abbreviationFor(name),
    wins: Number(record.wins) || Number(record.leagueRecord?.wins) || 0,
    losses: Number(record.losses) || Number(record.leagueRecord?.losses) || 0,
    runs: Number(record.runsScored) || 0,
    runsAllowed: Number(record.runsAllowed) || 0,
    runDifferential: Number(record.runDifferential) || 0,
    pct: toNumber(record.winningPercentage),
    color: generatedTeams.find((team) => team[1] === abbreviationFor(name))?.[2] || "#12355b"
  };
}

async function fetchStandings(year) {
  const cacheKey = `${activeLeague}:${year}`;
  if (standingsCache.has(cacheKey)) return standingsCache.get(cacheKey);
  const response = await fetch(standingsUrl(year));
  if (!response.ok) throw new Error(`MLB standings returned ${response.status}`);
  const data = await response.json();
  const rows = (data.records || []).flatMap((division) => division.teamRecords || []).map(mapStandingRecord);
  standingsCache.set(cacheKey, rows);
  return rows;
}

function teamStatsUrl(year) {
  const params = new URLSearchParams({
    season: String(year),
    group: config.group,
    stats: "season",
    sportIds: "1"
  });
  return `https://statsapi.mlb.com/api/v1/teams/stats?${params.toString()}`;
}

function mapTeamStat(split) {
  const stat = split.stat || {};
  const common = {
    id: split.team?.id || split.team?.name,
    name: normalizeTeamName(split.team?.name || "Unknown"),
    abbr: abbreviationFor(split.team?.name || "Unknown")
  };
  if (boardType === "pitching") {
    return {
      ...common,
      era: toNumber(stat.era),
      ops: toNumber(stat.ops),
      hits: toNumber(stat.hits),
      earnedRuns: toNumber(stat.earnedRuns),
      walks: toNumber(stat.baseOnBalls),
      strikeouts: toNumber(stat.strikeOuts),
      whip: toNumber(stat.whip),
      saves: toNumber(stat.saves),
      saveOpportunities: toNumber(stat.saveOpportunities),
      battersFaced: toNumber(stat.battersFaced),
      ipOuts: toNumber(stat.outs) || inningsToOuts(stat.inningsPitched)
    };
  }
  return {
    ...common,
    avg: toNumber(stat.avg),
    ops: toNumber(stat.ops),
    hits: toNumber(stat.hits),
    hr: toNumber(stat.homeRuns),
    rbi: toNumber(stat.rbi),
    runs: toNumber(stat.runs),
    strikeouts: toNumber(stat.strikeOuts),
    pa: toNumber(stat.plateAppearances)
  };
}

async function fetchTeamStats(year) {
  const cacheKey = `${boardType}:${year}`;
  if (teamStatsCache.has(cacheKey)) return teamStatsCache.get(cacheKey);
  const response = await fetch(teamStatsUrl(year));
  if (!response.ok) throw new Error(`MLB team stats returned ${response.status}`);
  const data = await response.json();
  const rows = (data.stats?.[0]?.splits || []).map(mapTeamStat);
  teamStatsCache.set(cacheKey, rows);
  return rows;
}

async function fetchTeamPitchingSummary(year) {
  const cacheKey = `pitching-summary:${year}`;
  if (teamPitchingSummaryCache.has(cacheKey)) return teamPitchingSummaryCache.get(cacheKey);
  const params = new URLSearchParams({
    season: String(year),
    group: "pitching",
    stats: "season",
    sportIds: "1"
  });
  const response = await fetch(`https://statsapi.mlb.com/api/v1/teams/stats?${params.toString()}`);
  if (!response.ok) throw new Error(`MLB pitching stats returned ${response.status}`);
  const data = await response.json();
  const rows = (data.stats?.[0]?.splits || []).map((split) => ({
    id: split.team?.id || split.team?.name,
    saves: toNumber(split.stat?.saves),
    saveOpportunities: toNumber(split.stat?.saveOpportunities)
  }));
  teamPitchingSummaryCache.set(cacheKey, rows);
  return rows;
}

async function teamRowsForYear(year) {
  const [standings, stats, pitchingSummary] = await Promise.all([fetchStandings(year), fetchTeamStats(year), fetchTeamPitchingSummary(year)]);
  const statsById = new Map(stats.map((team) => [String(team.id), team]));
  const pitchingById = new Map(pitchingSummary.map((team) => [String(team.id), team]));
  return standings.map((team) => ({ ...team, ...(statsById.get(String(team.id)) || {}), ...(pitchingById.get(String(team.id)) || {}) }));
}

function teamMetricWeight(team) {
  if (boardType === "pitching") return Math.max(1, Number(team.ipOuts) || 1);
  return Math.max(1, Number(team.pa) || 1);
}

async function currentTeams() {
  if (activeMode === "single") return (await teamRowsForYear(Number(activeSeason))).slice();

  const byTeam = new Map();
  const years = await fetchInBatches(yearList(activeRange.start, activeRange.end), teamRowsForYear, 4);
  years.flat().forEach((team) => {
    const existing = byTeam.get(team.id) || {
      ...team,
      wins: 0,
      losses: 0,
      runs: 0,
      runsAllowed: 0,
      runDifferential: 0,
      hits: 0,
      earnedRuns: 0,
      walks: 0,
      hr: 0,
      rbi: 0,
      strikeouts: 0,
      saves: 0,
      saveOpportunities: 0,
      pa: 0,
      battersFaced: 0,
      weightedTotals: {},
      weight: 0,
      seasons: 0
    };
    const weight = teamMetricWeight(team);
    existing.wins += team.wins;
    existing.losses += team.losses;
    existing.runs += team.runs;
    existing.runsAllowed += team.runsAllowed;
    existing.runDifferential += team.runDifferential;
    existing.hits += team.hits || 0;
    existing.earnedRuns += team.earnedRuns || 0;
    existing.walks += team.walks || 0;
    existing.hr += team.hr || 0;
    existing.rbi += team.rbi || 0;
    existing.strikeouts += team.strikeouts || 0;
    existing.saves += team.saves || 0;
    existing.saveOpportunities += team.saveOpportunities || 0;
    existing.pa += team.pa || 0;
    existing.battersFaced += team.battersFaced || 0;
    config.teamRateMetrics.forEach((metric) => {
      existing.weightedTotals[metric] = (existing.weightedTotals[metric] || 0) + (team[metric] || 0) * weight;
    });
    existing.weight += weight;
    existing.seasons += 1;
    existing.pct = existing.wins / Math.max(1, existing.wins + existing.losses);
    config.teamRateMetrics.forEach((metric) => {
      existing[metric] = existing.weightedTotals[metric] / Math.max(1, existing.weight);
    });
    byTeam.set(team.id, existing);
  });
  return Array.from(byTeam.values());
}

function renderTeamLoading() {
  document.querySelector("#team-a").innerHTML = `<option>Loading teams</option>`;
  document.querySelector("#team-b").innerHTML = `<option>Loading teams</option>`;
  document.querySelector("#compare-grid").innerHTML = `<div class="empty-state">Loading real team standings...</div>`;
  document.querySelector("#club-list").innerHTML = `<div class="empty-state">Loading real team standings...</div>`;
}

function renderTeamError() {
  document.querySelector("#compare-grid").innerHTML = `<div class="empty-state">Could not load MLB standings data.</div>`;
  document.querySelector("#club-list").innerHTML = `<div class="empty-state">Could not load MLB standings data.</div>`;
}

async function updateTeams() {
  const requestId = ++teamRequestId;
  teamsLoading = true;
  teamError = "";
  renderTeamLoading();

  try {
    teamRows = await currentTeams();
    if (requestId !== teamRequestId) return;
    teamsLoading = false;
    teamRows.sort((a, b) => b.wins - a.wins);
    teamFilterOptions();
    renderSummary();
    teamOptions();
    renderComparison();
    renderClubs();
    renderSearchOptions();
  } catch (error) {
    if (requestId !== teamRequestId) return;
    teamsLoading = false;
    teamRows = [];
    teamError = "Could not load MLB standings data.";
    renderTeamError();
  }
}

function currentSummary() {
  const teamSummary = currentTeamSummary();
  if (teamSummary) return teamSummary;
  return estimatedSummary();
}

function estimatedSummary() {
  if (activeMode === "single") return currentSeason().summary;
  const years = yearList(activeRange.start, activeRange.end);
  const totals = years.reduce((acc, year) => {
    const summary = (seasons[year] || generateSeason(year)).summary;
    acc.runs += summary.runs;
    acc.ops += summary.ops;
    acc.k += summary.k;
    acc.saves += summary.saves;
    return acc;
  }, { runs: 0, ops: 0, k: 0, saves: 0 });
  return {
    runs: totals.runs / years.length,
    ops: totals.ops / years.length,
    k: totals.k / years.length,
    saves: Math.round(totals.saves / years.length)
  };
}

function currentTeamSummary() {
  if (teamsLoading || teamError || !teamRows.length) return null;
  const scopedTeams = activeTeamId === "all"
    ? teamRows
    : teamRows.filter((team) => String(team.id) === String(activeTeamId));
  if (!scopedTeams.length) return null;

  const totals = scopedTeams.reduce((acc, team) => {
    const games = (Number(team.wins) || 0) + (Number(team.losses) || 0);
    const opsWeight = boardType === "pitching" ? Number(team.battersFaced) || Number(team.ipOuts) || games : Number(team.pa) || games;
    const kDenominator = boardType === "pitching" ? Number(team.battersFaced) || Number(team.ipOuts) || 0 : Number(team.pa) || 0;
    acc.games += games;
    acc.runs += Number(team.runs) || 0;
    acc.earnedRuns += Number(team.earnedRuns) || 0;
    acc.walks += Number(team.walks) || 0;
    acc.hits += Number(team.hits) || 0;
    acc.ipOuts += Number(team.ipOuts) || 0;
    acc.opsTotal += (Number(team.ops) || 0) * Math.max(1, opsWeight);
    acc.opsWeight += Math.max(1, opsWeight);
    acc.strikeouts += Number(team.strikeouts) || 0;
    acc.kDenominator += kDenominator;
    acc.saves += Number(team.saves) || 0;
    acc.saveOpportunities += Number(team.saveOpportunities) || 0;
    return acc;
  }, { games: 0, runs: 0, earnedRuns: 0, walks: 0, hits: 0, ipOuts: 0, opsTotal: 0, opsWeight: 0, strikeouts: 0, kDenominator: 0, saves: 0, saveOpportunities: 0 });

  const fallback = estimatedSummary();
  if (boardType === "pitching") {
    return {
      runs: totals.ipOuts ? (totals.earnedRuns * 27) / totals.ipOuts : fallback?.era || fallback?.runs || 0,
      ops: totals.ipOuts ? ((totals.walks + totals.hits) * 3) / totals.ipOuts : fallback?.whip || fallback?.ops || 0,
      k: totals.kDenominator ? (totals.strikeouts / totals.kDenominator) * 100 : fallback?.k || 0,
      saves: totals.saveOpportunities ? Math.round((totals.saves / totals.saveOpportunities) * 100) : fallback?.saves || 0
    };
  }
  return {
    runs: totals.games ? totals.runs / totals.games : fallback?.runs || 0,
    ops: totals.opsWeight ? totals.opsTotal / totals.opsWeight : fallback?.ops || 0,
    k: totals.kDenominator ? (totals.strikeouts / totals.kDenominator) * 100 : fallback?.k || 0,
    saves: totals.saveOpportunities ? Math.round((totals.saves / totals.saveOpportunities) * 100) : fallback?.saves || 0
  };
}

function eraForYear(year) {
  if (year < 1920) return { key: "deadball", name: "Deadball Era", runs: 3.82, ops: .633, k: 10.2, saves: 32, power: .42 };
  if (year < 1947) return { key: "liveball", name: "Live Ball Era", runs: 4.72, ops: .735, k: 8.9, saves: 38, power: .72 };
  if (year < 1969) return { key: "postwar", name: "Integration to Pitcher Era", runs: 4.05, ops: .690, k: 14.6, saves: 50, power: .66 };
  if (year < 1990) return { key: "expansion", name: "Expansion Era", runs: 4.28, ops: .711, k: 15.4, saves: 58, power: .78 };
  if (year < 2000) return { key: "nineties", name: "1990s Power Era", runs: 4.68, ops: .747, k: 16.3, saves: 64, power: 1 };
  if (year < 2006) return { key: "aughts", name: "High-Offense Era", runs: 4.88, ops: .758, k: 16.8, saves: 66, power: 1.1 };
  if (year < 2015) return { key: "aughts", name: "Run-Prevention Era", runs: 4.22, ops: .718, k: 19.5, saves: 67, power: .88 };
  return { key: "modern", name: "Modern Power Era", runs: 4.46, ops: .724, k: 22.4, saves: 67, power: 1 };
}

function wave(year, offset, spread) {
  return Math.sin((year + offset) * 0.37) * spread;
}

function generateSeason(year) {
  const era = eraForYear(year);
  const isToDate = year === 2026;
  const progress = isToDate ? .35 : 1;
  const summary = {
    runs: Math.max(3.1, era.runs + wave(year, 1, .24)),
    ops: Math.max(.590, era.ops + wave(year, 7, .018)),
    k: Math.max(7.5, era.k + wave(year, 13, 1.1)),
    saves: Math.max(25, Math.round(era.saves + wave(year, 19, 5)))
  };
  const players = Array.from({ length: 6 }, (_, index) => {
    const playerPool = generatedPlayersByEra[era.key];
    const name = playerPool[(year + index * 3) % playerPool.length];
    const team = generatedTeams[(year + index) % generatedTeams.length][1];
    const rank = 6 - index;
    const avg = Math.min(.386, .255 + rank * .012 + wave(year, index, .011));
    const ops = Math.min(1.16, summary.ops + .08 + rank * .035 + wave(year, index + 4, .015));
    const fullSeasonHr = (12 + rank * 6 + wave(year, index + 8, 5)) * era.power;
    const fullSeasonRbi = 62 + rank * 10 + wave(year, index + 12, 11);
    return {
      name,
      team,
      avg,
      ops,
      hr: Math.max(1, Math.round(fullSeasonHr * progress)),
      rbi: Math.max(8, Math.round(fullSeasonRbi * progress)),
      war: Math.max(.6, (4.2 + rank * .75 + wave(year, index + 16, .7)) * progress)
    };
  });
  const teams = generatedTeams.slice(0, 6).map(([name, abbr, color], index) => {
    const fullSeasonWins = 78 + (5 - index) * 4 + wave(year, index + 20, 6);
    const fullSeasonRuns = (summary.runs * 162) + (5 - index) * 18 + wave(year, index + 24, 22);
    return {
      name,
      abbr,
      color,
      wins: Math.max(8, Math.round(fullSeasonWins * progress)),
      runs: Math.max(80, Math.round(fullSeasonRuns * progress)),
      era: Math.max(2.25, summary.runs - .42 - (5 - index) * .07 + wave(year, index + 28, .16)),
      ops: Math.max(.585, summary.ops + (5 - index) * .012 + wave(year, index + 32, .01)),
      defense: Math.round((5 - index) * 4 + wave(year, index + 36, 7))
    };
  });
  const parks = generatedParks.slice(0, 4).map(([name, tilt], index) => ({
    name,
    tilt,
    factor: Math.round(99 + wave(year, index + 40, 9) + (index === 4 ? 10 : 0))
  }));

  return {
    label: `${year}${isToDate ? " To Date" : ""} ${era.name}`,
    summary,
    players,
    teams,
    parks
  };
}

function populateSeasonSelect() {
  const select = document.querySelector("#season-select");
  const options = Array.from({ length: lastSeason - firstSeason + 1 }, (_, index) => {
    const year = lastSeason - index;
    return `<option value="${year}">${year}</option>`;
  }).join("");
  select.innerHTML = options;
  select.value = activeSeason;
  document.querySelector("#range-start").innerHTML = options;
  document.querySelector("#range-end").innerHTML = options;
  document.querySelector("#range-start").value = activeRange.start;
  document.querySelector("#range-end").value = activeRange.end;
  updateRangeLabels();
}

function setActiveSeason(year) {
  activeSeason = String(year);
  activeMode = "single";
  updateModeControls();
  document.querySelector("#season-select").value = activeSeason;
  renderSummary();
  updateLeaders();
  updateTeams();
  renderParks();
}

function setActiveRange(start, end) {
  activeMode = "range";
  activeRange = {
    start: Math.min(Number(start), Number(end)),
    end: Math.max(Number(start), Number(end))
  };
  document.querySelector("#range-start").value = activeRange.start;
  document.querySelector("#range-end").value = activeRange.end;
  updateRangeLabels();
  updateModeControls();
  renderSummary();
  updateLeaders();
  updateTeams();
}

function updateRangeLabels() {
  document.querySelector("#range-start-value").textContent = activeRange.start;
  document.querySelector("#range-end-value").textContent = activeRange.end;
}

function updateModeControls() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === activeMode);
  });
  document.querySelectorAll("[data-range-start]").forEach((button) => {
    const matches = Number(button.dataset.rangeStart) === activeRange.start && Number(button.dataset.rangeEnd) === activeRange.end;
    button.classList.toggle("active", activeMode === "range" && matches);
  });
  document.querySelectorAll("[data-league]").forEach((button) => {
    button.classList.toggle("active", button.dataset.league === activeLeague);
  });
  document.querySelectorAll("[data-board-size]").forEach((button) => {
    button.classList.toggle("active", button.dataset.boardSize === activeBoardSize);
  });
  document.querySelector(".range-panel")?.setAttribute("data-active-mode", activeMode);
  document.querySelector("#scope-title").textContent = activeMode === "single" ? `${activeSeason} single-season leaders` : `${activeRange.start}-${activeRange.end} cumulative leaders`;
  document.querySelector("#data-note").textContent = activeMode === "single"
    ? `${config.label[0].toUpperCase()}${config.label.slice(1)} ${activeTeamId === "all" ? "leaders" : "players"} load from MLB Stats API for the selected season${activeTeamId === "all" ? "" : " and team"}.`
    : `Range mode aggregates ${config.label} seasons from MLB Stats API across the selected years${activeTeamId === "all" ? "" : " for every selected-team player"}.`;
}

function renderSummary() {
  const summary = currentSummary();
  const label = leaderScopeLabel();
  if (boardType === "pitching") {
    document.querySelector("#run-summary-label").textContent = "League ERA";
    document.querySelector("#ops-summary-label").textContent = "League WHIP";
    document.querySelector("#run-environment").textContent = summary.runs.toFixed(2);
    document.querySelector("#league-ops").textContent = summary.ops.toFixed(2);
    document.querySelector("#run-context").textContent = activeMode === "single" ? "earned runs per nine innings" : "average ERA across selected years";
    document.querySelector("#ops-context").textContent = activeMode === "single" ? "walks plus hits per inning" : "average WHIP across selected years";
  } else {
    document.querySelector("#run-summary-label").textContent = "Run Environment";
    document.querySelector("#ops-summary-label").textContent = "League OPS";
    document.querySelector("#run-environment").textContent = summary.runs.toFixed(2);
    document.querySelector("#league-ops").textContent = summary.ops.toFixed(3).replace(/^0/, "");
    document.querySelector("#run-context").textContent = activeMode === "single" ? "runs per team game" : "average runs per team game";
    document.querySelector("#ops-context").textContent = activeMode === "single" ? "weighted by plate appearances" : "average league OPS";
  }
  document.querySelector("#k-rate").textContent = `${summary.k.toFixed(1)}%`;
  document.querySelector("#save-rate").textContent = `${summary.saves}%`;
  document.querySelector("#chart-title").textContent = `${label} ${config.chartNoun} leaders`;
  document.querySelector("#compare-title").textContent = `${label} club comparison`;
  const tableNoun = activeTeamId === "all" ? "leaders" : "players";
  document.querySelector("#table-title").textContent = activeMode === "single" ? `${label} ${config.label} ${tableNoun}` : `${label} cumulative ${config.label} ${tableNoun}`;
  document.querySelector("#save-context").textContent = activeMode === "single" ? "late-game pressure index" : "average conversion rate";
}

function renderChart() {
  if (leadersLoading) return renderLoadingLeaders();
  if (leaderError) return renderLeaderError(leaderError);
  const direction = defaultSortDir(activeMetric);
  const data = qualifiedRows(leaderRows).slice().sort((a, b) => (a[activeMetric] - b[activeMetric]) * direction).slice(0, 7);
  if (!data.length) {
    document.querySelector("#bar-chart").innerHTML = `<div class="empty-state">No players found for this filter.</div>`;
    return;
  }
  const values = data.map((player) => player[activeMetric]);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const chart = document.querySelector("#bar-chart");
  chart.innerHTML = data.map((player) => {
    const score = config.lowerBetter.includes(activeMetric) ? max + min - player[activeMetric] : player[activeMetric];
    const scoreMax = config.lowerBetter.includes(activeMetric) ? max : Math.max(...values);
    const width = Math.max(8, (score / scoreMax) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label">
          <a class="chart-player-link" href="${baseballReferenceSearchUrl(player.name)}" target="_blank" rel="noopener noreferrer">
            <strong>${player.name}</strong>
          </a>
          <span>${player.team}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
        <div class="bar-value">${fmtStat(activeMetric, player[activeMetric])}</div>
      </div>
    `;
  }).join("");
}

function renderTable() {
  if (leadersLoading) return renderLoadingLeaders();
  if (leaderError) return renderLeaderError(leaderError);
  const query = cleanSearchInput(document.querySelector("#player-search").value).toLowerCase();
  const scope = leaderScopeLabel();
  const rows = sortedRows(qualifiedRows(leaderRows, activeSort.key)
    .filter((player) => `${player.name} ${player.team} ${player.teamName || ""} ${scope}`.toLowerCase().includes(query))
  );
  const visibleRows = activeBoardSize === "leaders" ? rows.slice(0, 20) : rows;

  document.querySelector("#player-table").innerHTML = visibleRows.map((player) => `
    <tr>
      <td>
        <a class="player-link" href="${baseballReferenceSearchUrl(player.name)}" target="_blank" rel="noopener noreferrer">
          <span class="avatar">${initials(player.name)}</span>
          <span>${player.name}</span>
        </a>
      </td>
      <td>${player.team}</td>
      ${config.columns.map(([key]) => `<td>${fmtStat(key, player[key])}</td>`).join("")}
    </tr>
  `).join("") || `<tr><td colspan="9" class="empty-row">No players match this filter.</td></tr>`;
}

function cleanSearchInput(value) {
  return String(value || "").replace(/\s+-\s+[^-]+(?:\s+-\s+.+)?$/, "").trim();
}

function playerSearchLabel(player) {
  const context = [player.position || "MLB", player.teamName || player.team, activeMode === "range" ? currentScopeLabel() : ""]
    .filter(Boolean)
    .join(" - ");
  return `${player.name} - ${context}`;
}

function renderSearchOptions() {
  const datalist = document.querySelector("#player-search-options");
  if (!datalist) return;
  const options = new Map();
  leaderRows.slice().sort((a, b) => playerWeight(b) - playerWeight(a)).slice(0, 450).forEach((player) => {
    options.set(playerSearchLabel(player), "Player");
  });
  teamRows.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach((team) => {
    options.set(team.name, team.abbr);
    options.set(team.abbr, team.name);
  });
  datalist.innerHTML = Array.from(options.entries()).slice(0, 520).map(([value, label]) => (
    `<option value="${escapeHtml(value)}" label="${escapeHtml(label)}"></option>`
  )).join("");
}

function renderBoardControls() {
  document.querySelector("#leader-eyebrow").textContent = config.eyebrow;
  document.querySelector("#metric-select").innerHTML = config.metrics
    .map(([key, label]) => `<option value="${key}">${label}</option>`)
    .join("");
  document.querySelector("#metric-select").value = activeMetric;
  document.querySelector("#player-head").innerHTML = `
    <tr>
      <th data-sort="name">Player</th>
      <th data-sort="team">Club</th>
      ${config.columns.map(([key, label]) => `<th data-sort="${key}">${label}</th>`).join("")}
    </tr>
  `;
  document.querySelector("#team-metric-select").innerHTML = config.teamMetrics
    .map(([key, label]) => `<option value="${key}">${label}</option>`)
    .join("");
  document.querySelector("#team-metric-select").value = activeTeamMetric;
  document.querySelector("#position-filter").innerHTML = positionOptions[boardType]
    .map(([key, label]) => `<option value="${key}">${label}</option>`)
    .join("");
  document.querySelector("#position-filter").value = activePosition;
}

function teamMetricLabel(key = activeTeamMetric) {
  return config.teamMetrics.find(([metric]) => metric === key)?.[1] || key.toUpperCase();
}

function teamOptions() {
  if (!teamRows.length) return;
  const previousA = document.querySelector("#team-a").value;
  const previousB = document.querySelector("#team-b").value;
  const options = teamRows
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((team) => `<option value="${team.id}">${team.name}</option>`)
    .join("");
  document.querySelector("#team-a").innerHTML = options;
  document.querySelector("#team-b").innerHTML = options;
  const values = teamRows.map((team) => String(team.id));
  const yankees = teamRows.find((team) => team.abbr === "NYY")?.id;
  const dodgers = teamRows.find((team) => team.abbr === "LAD")?.id;
  const defaultA = activeTeamId !== "all" && values.includes(String(activeTeamId))
    ? String(activeTeamId)
    : String(yankees || teamRows[0].id);
  document.querySelector("#team-a").value = values.includes(previousA) && activeTeamId === "all" ? previousA : defaultA;
  const selectedA = document.querySelector("#team-a").value;
  const defaultB = [previousB, dodgers, yankees, teamRows[0]?.id, teamRows[1]?.id]
    .map((id) => String(id || ""))
    .find((id) => values.includes(id) && id !== selectedA) || selectedA;
  document.querySelector("#team-b").value = defaultB;
}

function syncComparisonToActiveTeam() {
  if (activeTeamId === "all" || !teamRows.length) return;
  const values = teamRows.map((team) => String(team.id));
  const selectedTeam = String(activeTeamId);
  if (!values.includes(selectedTeam)) return;
  const teamA = document.querySelector("#team-a");
  const teamB = document.querySelector("#team-b");
  teamA.value = selectedTeam;
  if (teamB.value === selectedTeam || !values.includes(teamB.value)) {
    teamB.value = values.find((id) => id !== selectedTeam) || selectedTeam;
  }
}

function teamFilterOptions() {
  const select = document.querySelector("#team-filter");
  if (!select || !teamRows.length) return;
  let appliedPendingTeam = false;
  if (pendingTeamAbbr) {
    const requestedTeam = teamRows.find((team) => team.abbr === pendingTeamAbbr.toUpperCase());
    if (requestedTeam) {
      activeTeamId = String(requestedTeam.id);
      appliedPendingTeam = true;
    }
    pendingTeamAbbr = "";
  }
  const previous = String(activeTeamId);
  const options = teamRows
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((team) => `<option value="${team.id}">${team.name}</option>`)
    .join("");
  select.innerHTML = `<option value="all">All teams</option>${options}`;
  const values = teamRows.map((team) => String(team.id));
  activeTeamId = previous === "all" || values.includes(previous) ? previous : "all";
  select.value = activeTeamId;
  activeTeamName = activeTeamId === "all" ? "All teams" : teamRows.find((team) => String(team.id) === activeTeamId)?.name || "Selected team";
  updateModeControls();
  if (appliedPendingTeam) updateLeaders();
}

function renderComparison() {
  if (teamsLoading) return;
  if (teamError) return renderTeamError();
  syncComparisonToActiveTeam();
  const a = teamRows.find((team) => String(team.id) === document.querySelector("#team-a").value) || teamRows[0];
  const b = teamRows.find((team) => String(team.id) === document.querySelector("#team-b").value) || teamRows[1] || teamRows[0];
  if (!a || !b) return;
  const metrics = [
    ["wins", "Wins", false],
    ["losses", "Losses", true],
    ["runs", "Runs", false],
    ["runsAllowed", "Runs Allowed", true],
    ["runDifferential", "Run Diff", false],
    ["pct", "Win %", false]
  ];

  const teamHeader = `
    <div class="comparison-header">
      <span>${escapeHtml(a.abbr)}</span>
      <strong>${escapeHtml(a.name)} vs ${escapeHtml(b.name)}</strong>
      <span>${escapeHtml(b.abbr)}</span>
    </div>
  `;
  document.querySelector("#compare-grid").innerHTML = teamHeader + metrics.map(([key, label, lowerBetter]) => {
    const rawA = a[key];
    const rawB = b[key];
    const floor = Math.min(rawA, rawB, 0);
    let av = rawA - floor + 1;
    let bv = rawB - floor + 1;
    if (lowerBetter) {
      const max = Math.max(av, bv);
      const min = Math.min(av, bv);
      av = max + min - av;
      bv = max + min - bv;
    }
    const total = Math.max(1, av + bv);
    const left = (av / total) * 100;
    const right = (bv / total) * 100;
    return `
      <div class="comparison">
        <div class="comparison-value">
          <span>${escapeHtml(a.abbr)}</span>
          <strong>${fmtStat(key, rawA)}</strong>
        </div>
        <div>
          <span>${label}</span>
          <div class="split-track">
            <div class="split-left" style="width:${left}%"></div>
            <div class="split-right" style="width:${right}%"></div>
          </div>
        </div>
        <div class="comparison-value comparison-value-right">
          <span>${escapeHtml(b.abbr)}</span>
          <strong>${fmtStat(key, rawB)}</strong>
        </div>
      </div>
    `;
  }).join("");
}

function renderClubs() {
  if (teamsLoading) return;
  if (teamError) return renderTeamError();
  const direction = config.teamLowerBetter.includes(activeTeamMetric) ? 1 : -1;
  document.querySelector("#team-list-title").textContent = `${currentScopeLabel()} team ${teamMetricLabel(activeTeamMetric)} leaders`;
  document.querySelector("#club-list").innerHTML = teamRows
    .slice()
    .sort((a, b) => (a[activeTeamMetric] - b[activeTeamMetric]) * direction)
    .map((team) => {
      return `
        <article class="club-card">
          <div class="club-badge" style="background:${team.color}">${team.abbr}</div>
          <div>
            <strong>${team.name}</strong>
            <span class="club-meta">${fmtStat("wins", team.wins)}-${fmtStat("losses", team.losses)} &middot; ${fmtStat("runs", team.runs)} RS &middot; ${fmtStat("runsAllowed", team.runsAllowed)} RA</span>
          </div>
          <div class="club-score">${fmtStat(activeTeamMetric, team[activeTeamMetric] || 0)}</div>
        </article>
      `;
    }).join("");
}

function renderParks() {
  document.querySelector("#park-grid").innerHTML = currentSeason().parks.map((park) => `
    <article class="park-tile">
      <strong>${park.name}</strong>
      <span>${park.tilt}</span>
      <div class="park-factor">${park.factor}</div>
    </article>
  `).join("");
}

function bindEvents() {
  document.querySelector("#metric-select").addEventListener("change", (event) => {
    activeMetric = event.target.value;
    activeSort = { key: activeMetric, dir: defaultSortDir(activeMetric) };
    updateLeaders();
  });

  const playerSearch = document.querySelector("#player-search");
  const heroPlayerSearch = document.querySelector("#hero-player-search");
  playerSearch.addEventListener("input", () => {
    if (heroPlayerSearch && heroPlayerSearch.value !== playerSearch.value) heroPlayerSearch.value = playerSearch.value;
    renderTable();
  });
  heroPlayerSearch?.addEventListener("input", () => {
    playerSearch.value = heroPlayerSearch.value;
    renderTable();
  });

  document.querySelector("#team-metric-select").addEventListener("change", (event) => {
    activeTeamMetric = event.target.value;
    renderClubs();
  });

  document.querySelector("#team-filter").addEventListener("change", (event) => {
    activeTeamId = event.target.value;
    activeTeamName = event.target.selectedOptions[0]?.textContent || "All teams";
    updateModeControls();
    renderSummary();
    renderComparison();
    updateLeaders();
  });

  document.querySelector("#position-filter").addEventListener("change", (event) => {
    activePosition = event.target.value;
    renderSummary();
    renderChart();
    renderTable();
  });

  document.querySelectorAll("[data-board-size]").forEach((button) => {
    button.addEventListener("click", () => {
      activeBoardSize = button.dataset.boardSize;
      updateModeControls();
      renderTable();
    });
  });

  document.querySelectorAll("th[data-sort]").forEach((heading) => {
    heading.addEventListener("click", () => {
      const key = heading.dataset.sort;
      activeSort = { key, dir: activeSort.key === key ? activeSort.dir * -1 : defaultSortDir(key) };
      renderTable();
    });
  });

  document.querySelector("#season-select").addEventListener("change", (event) => {
    setActiveSeason(event.target.value);
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.mode === "single") {
        setActiveSeason(activeSeason);
      } else {
        setActiveRange(activeRange.start, activeRange.end);
      }
    });
  });

  document.querySelector("#range-start").addEventListener("change", (event) => {
    setActiveRange(event.target.value, activeRange.end);
  });

  document.querySelector("#range-end").addEventListener("change", (event) => {
    setActiveRange(activeRange.start, event.target.value);
  });

  document.querySelectorAll("[data-range-start]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveRange(button.dataset.rangeStart, button.dataset.rangeEnd);
    });
  });

  document.querySelectorAll("[data-league]").forEach((button) => {
    button.addEventListener("click", () => {
      activeLeague = button.dataset.league;
      activeTeamId = "all";
      activeTeamName = "All teams";
      updateModeControls();
      updateLeaders();
      updateTeams();
    });
  });

  document.querySelector("#team-a").addEventListener("change", renderComparison);
  document.querySelector("#team-b").addEventListener("change", renderComparison);
}

populateSeasonSelect();
renderBoardControls();
updateModeControls();
bindEvents();
renderSummary();
updateLeaders();
updateTeams();
renderParks();
