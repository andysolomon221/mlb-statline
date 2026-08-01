const pitchNames = {
  FF: "4-Seam Fastball", SI: "Sinker", FC: "Cutter", SL: "Slider", ST: "Sweeper",
  CU: "Curveball", SV: "Slurve", CH: "Changeup", FS: "Splitter", SC: "Screwball", KN: "Knuckleball"
};

const teamCodeAliases = {
  AZ: "ARI", CHW: "CWS", KCR: "KC", OAK: "ATH", SDP: "SD", SFG: "SF", TBR: "TB", WAS: "WSH", WSN: "WSH"
};

const teamNames = {
  ARI: "Arizona Diamondbacks", ATL: "Atlanta Braves", BAL: "Baltimore Orioles", BOS: "Boston Red Sox",
  CHC: "Chicago Cubs", CWS: "Chicago White Sox", CIN: "Cincinnati Reds", CLE: "Cleveland Guardians",
  COL: "Colorado Rockies", DET: "Detroit Tigers", HOU: "Houston Astros", KC: "Kansas City Royals",
  LAA: "Los Angeles Angels", LAD: "Los Angeles Dodgers", MIA: "Miami Marlins", MIL: "Milwaukee Brewers",
  MIN: "Minnesota Twins", NYM: "New York Mets", NYY: "New York Yankees", ATH: "Athletics",
  PHI: "Philadelphia Phillies", PIT: "Pittsburgh Pirates", SD: "San Diego Padres", SF: "San Francisco Giants",
  SEA: "Seattle Mariners", STL: "St. Louis Cardinals", TB: "Tampa Bay Rays", TEX: "Texas Rangers",
  TOR: "Toronto Blue Jays", WSH: "Washington Nationals"
};

const swingDescriptions = new Set([
  "swinging_strike", "swinging_strike_blocked", "foul", "foul_tip", "hit_into_play",
  "hit_into_play_no_out", "hit_into_play_score", "missed_bunt", "foul_bunt"
]);
const whiffDescriptions = new Set(["swinging_strike", "swinging_strike_blocked", "missed_bunt"]);
const nonAtBatEvents = new Set(["walk", "intent_walk", "hit_by_pitch", "sac_fly", "sac_bunt", "catcher_interf"]);
const hitEvents = new Set(["single", "double", "triple", "home_run"]);

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const clean = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index], next = clean[index + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (field || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
      if (char === "\r" && next === "\n") index += 1;
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function numeric(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function displayName(value) {
  const [last, first] = String(value || "").split(",").map((part) => part.trim());
  return first ? `${first} ${last}` : last || "Unknown";
}

function isoDate(date) { return date.toISOString().slice(0, 10); }

function dateChunks(from, to, days = 3) {
  const chunks = [];
  let cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    const chunkEnd = new Date(Math.min(end.getTime(), cursor.getTime() + (days - 1) * 86400000));
    chunks.push([isoDate(cursor), isoDate(chunkEnd)]);
    cursor = new Date(chunkEnd.getTime() + 86400000);
  }
  return chunks;
}

function validateDateRange(from, to, maxDays = 31) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const span = Math.round((end - start) / 86400000) + 1;
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || span < 1) {
    throw new Error("Choose a valid date range.");
  }
  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    throw new Error("Date ranges must stay within one season.");
  }
  if (span > maxDays) throw new Error(`Date ranges are limited to ${maxDays} calendar days.`);
}

function searchUrl(type, from, to, team = "") {
  const params = new URLSearchParams({
    all: "true", type: "details", player_type: type, game_date_gt: from, game_date_lt: to,
    hfGT: "R|", hfSea: `${from.slice(0, 4)}|`,
    group_by: "name-year", sort_col: "pitches", sort_order: "desc",
    min_pitches: "0", min_results: "0", min_pas: "0"
  });
  if (team) params.set("hfTeam", `${team}|`);
  return `https://baseballsavant.mlb.com/statcast_search/csv?${params.toString()}`;
}

function baseAccumulator(row, type, pitchType = "") {
  const playerId = String((type === "pitcher" ? row.pitcher : row.batter) || "");
  return {
    playerId, name: displayName(row.player_name), pitchType,
    pitchName: row.pitch_name || pitchNames[pitchType] || pitchType,
    teams: new Map(), pitches: 0, pa: 0, ab: 0, hits: 0, totalBases: 0, homeRuns: 0,
    strikeouts: 0, swings: 0, whiffs: 0, bbe: 0, hardHit: 0, barrels: 0, sweetSpot: 0,
    evTotal: 0, angleTotal: 0, expectedWobaTotal: 0, expectedWobaDenom: 0,
    expectedBaTotal: 0, expectedSlgTotal: 0, wobaTotal: 0, wobaDenom: 0
  };
}

function teamFor(row, type) {
  const top = String(row.inning_topbot || "").toLowerCase() === "top";
  if (type === "batter") return top ? row.away_team : row.home_team;
  return top ? row.home_team : row.away_team;
}

function normalizedTeamFor(row, type) {
  const raw = teamFor(row, type) || "MLB";
  return teamCodeAliases[raw] || raw;
}

function addRow(acc, row, type) {
  acc.pitches += 1;
  const team = teamFor(row, type) || "MLB";
  acc.teams.set(team, (acc.teams.get(team) || 0) + 1);
  const description = String(row.description || "");
  if (swingDescriptions.has(description)) acc.swings += 1;
  if (whiffDescriptions.has(description)) acc.whiffs += 1;

  const launchSpeed = numeric(row.launch_speed);
  const launchAngle = numeric(row.launch_angle);
  if (launchSpeed !== null) {
    acc.bbe += 1;
    acc.evTotal += launchSpeed;
    acc.angleTotal += launchAngle || 0;
    if (launchSpeed >= 95) acc.hardHit += 1;
    if (String(row.launch_speed_angle) === "6") acc.barrels += 1;
    if (launchAngle !== null && launchAngle >= 8 && launchAngle <= 32) acc.sweetSpot += 1;
  }

  const event = String(row.events || "");
  if (!event) return;
  acc.pa += 1;
  if (event === "strikeout" || event === "strikeout_double_play") acc.strikeouts += 1;
  if (event === "home_run") acc.homeRuns += 1;
  const isAtBat = !nonAtBatEvents.has(event);
  if (isAtBat) {
    acc.ab += 1;
    if (hitEvents.has(event)) acc.hits += 1;
    acc.totalBases += event === "home_run" ? 4 : event === "triple" ? 3 : event === "double" ? 2 : event === "single" ? 1 : 0;
    acc.expectedBaTotal += numeric(row.estimated_ba_using_speedangle) || 0;
    acc.expectedSlgTotal += numeric(row.estimated_slg_using_speedangle) || 0;
  }
  const wobaDenom = numeric(row.woba_denom) || 0;
  if (wobaDenom > 0) {
    acc.wobaDenom += wobaDenom;
    acc.wobaTotal += (numeric(row.woba_value) || 0) * wobaDenom;
    acc.expectedWobaDenom += wobaDenom;
    const expected = numeric(row.estimated_woba_using_speedangle);
    acc.expectedWobaTotal += (expected === null ? numeric(row.woba_value) || 0 : expected) * wobaDenom;
  }
}

function chosenTeam(acc) {
  const raw = Array.from(acc.teams.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "MLB";
  return teamCodeAliases[raw] || raw;
}

function finalize(acc, mode, playerPitches) {
  const team = chosenTeam(acc);
  const common = {
    name: acc.name, playerId: acc.playerId, team, teamName: teamNames[team] || team,
    sample: acc.pa, pitches: acc.pitches, pa: acc.pa, homeRuns: acc.homeRuns,
    ba: acc.ab ? acc.hits / acc.ab : null, slg: acc.ab ? acc.totalBases / acc.ab : null,
    woba: acc.wobaDenom ? acc.wobaTotal / acc.wobaDenom : null,
    est_ba: acc.ab ? acc.expectedBaTotal / acc.ab : null,
    est_slg: acc.ab ? acc.expectedSlgTotal / acc.ab : null,
    est_woba: acc.expectedWobaDenom ? acc.expectedWobaTotal / acc.expectedWobaDenom : null,
    whiff_percent: acc.swings ? acc.whiffs / acc.swings * 100 : null,
    k_percent: acc.pa ? acc.strikeouts / acc.pa * 100 : null,
    hard_hit_percent: acc.bbe ? acc.hardHit / acc.bbe * 100 : null
  };
  if (mode === "pitch-types") return {
    ...common, pitchType: acc.pitchType, pitchName: acc.pitchName,
    pitch_usage: playerPitches ? acc.pitches / playerPitches * 100 : null,
    run_value_per_100: null, run_value: null, put_away: null
  };
  return {
    ...common, position: "", exit_velocity_avg: acc.bbe ? acc.evTotal / acc.bbe : null,
    launch_angle_avg: acc.bbe ? acc.angleTotal / acc.bbe : null,
    sweet_spot_percent: acc.bbe ? acc.sweetSpot / acc.bbe * 100 : null,
    barrel_batted_rate: acc.bbe ? acc.barrels / acc.bbe * 100 : null,
    hard_hit_percent: acc.bbe ? acc.hardHit / acc.bbe * 100 : null,
    xwoba: common.est_woba, xba: common.est_ba, xslg: common.est_slg
  };
}

async function fetchDateRange({ type, from, to, mode = "statcast", targetPlayerId = "", latestGameOnly = false, team = "", maxDays = 31, chunkDays = 3 }) {
  validateDateRange(from, to, maxDays);
  const groups = new Map();
  const matchingRows = [];
  const chunks = dateChunks(from, to, chunkDays);
  for (let index = 0; index < chunks.length; index += 3) {
    const batch = chunks.slice(index, index + 3);
    const texts = await Promise.all(batch.map(async ([start, end]) => {
      const response = await fetch(searchUrl(type, start, end, team), { headers: { "user-agent": "Mozilla/5.0" } });
      if (!response.ok) throw new Error(`Baseball Savant returned ${response.status}`);
      return response.text();
    }));
    texts.forEach((text) => parseCsv(text).forEach((row) => {
      const playerId = String((type === "pitcher" ? row.pitcher : row.batter) || "");
      if (targetPlayerId && playerId !== String(targetPlayerId)) return;
      if (latestGameOnly) {
        matchingRows.push(row);
        return;
      }
      const pitchType = mode === "pitch-types" ? String(row.pitch_type || "") : "";
      if (!playerId || (mode === "pitch-types" && !pitchType)) return;
      const team = mode === "statcast" ? normalizedTeamFor(row, type) : "";
      const key = mode === "pitch-types" ? `${playerId}:${pitchType}` : `${playerId}:${team}`;
      if (!groups.has(key)) groups.set(key, baseAccumulator(row, type, pitchType));
      addRow(groups.get(key), row, type);
    }));
  }
  let effectiveDate = "";
  if (latestGameOnly) {
    effectiveDate = matchingRows.reduce((latest, row) => String(row.game_date || "") > latest ? String(row.game_date) : latest, "");
    matchingRows.filter((row) => row.game_date === effectiveDate).forEach((row) => {
      const playerId = String((type === "pitcher" ? row.pitcher : row.batter) || "");
      const pitchType = mode === "pitch-types" ? String(row.pitch_type || "") : "";
      if (!playerId || (mode === "pitch-types" && !pitchType)) return;
      const team = mode === "statcast" ? normalizedTeamFor(row, type) : "";
      const key = mode === "pitch-types" ? `${playerId}:${pitchType}` : `${playerId}:${team}`;
      if (!groups.has(key)) groups.set(key, baseAccumulator(row, type, pitchType));
      addRow(groups.get(key), row, type);
    });
  }
  const totals = new Map();
  groups.forEach((acc) => totals.set(acc.playerId, (totals.get(acc.playerId) || 0) + acc.pitches));
  const rows = Array.from(groups.values()).map((acc) => finalize(acc, mode, totals.get(acc.playerId)));
  rows.effectiveDate = effectiveDate;
  return rows;
}

module.exports = { fetchDateRange };
