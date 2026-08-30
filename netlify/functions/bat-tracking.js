const teamAbbr = {
  "Arizona Diamondbacks": "ARI", "Atlanta Braves": "ATL", "Baltimore Orioles": "BAL",
  "Boston Red Sox": "BOS", "Chicago Cubs": "CHC", "Chicago White Sox": "CWS",
  "Cincinnati Reds": "CIN", "Cleveland Guardians": "CLE", "Colorado Rockies": "COL",
  "Detroit Tigers": "DET", "Houston Astros": "HOU", "Kansas City Royals": "KC",
  "Los Angeles Angels": "LAA", "Los Angeles Dodgers": "LAD", "Miami Marlins": "MIA",
  "Milwaukee Brewers": "MIL", "Minnesota Twins": "MIN", "New York Mets": "NYM",
  "New York Yankees": "NYY", "Athletics": "ATH", "Oakland Athletics": "ATH",
  "Philadelphia Phillies": "PHI", "Pittsburgh Pirates": "PIT", "San Diego Padres": "SD",
  "San Francisco Giants": "SF", "Seattle Mariners": "SEA", "St. Louis Cardinals": "STL",
  "Tampa Bay Rays": "TB", "Texas Rangers": "TEX", "Toronto Blue Jays": "TOR",
  "Washington Nationals": "WSH"
};

function savantUrl(path, type, year) {
  const params = new URLSearchParams({
    attackZone: "", batSide: "", contactType: "", count: "",
    dateStart: `${year}-01-01`, dateEnd: `${year}-12-31`, gameType: "Regular",
    isHardHit: "", minSwings: "25", minGroupSwings: "1", pitchHand: "", pitchType: "",
    seasonStart: year, seasonEnd: year, type, csv: "true"
  });
  return `https://baseballsavant.mlb.com/leaderboard/bat-tracking${path}?${params.toString()}`;
}

function statsUrl(group, year) {
  const params = new URLSearchParams({ stats: "season", group, playerPool: "all", season: year, sportIds: "1", limit: "5000" });
  return `https://statsapi.mlb.com/api/v1/stats?${params.toString()}`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const clean = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    const next = clean[index + 1];
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

function displayName(value) {
  const [last, first] = String(value || "").split(",").map((part) => part.trim());
  return first ? `${first} ${last}` : last || "Unknown";
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 StatLineBaseball/1.0" } });
  if (!response.ok) throw new Error(`Baseball Savant returned ${response.status}`);
  return response.text();
}

async function teamLookup(group, year) {
  const response = await fetch(statsUrl(group, year));
  if (!response.ok) return new Map();
  const data = await response.json();
  return new Map((data.stats?.[0]?.splits || []).map((split) => [String(split.player?.id), {
    team: teamAbbr[split.team?.name] || split.team?.abbreviation || "MLB",
    position: split.position?.abbreviation || ""
  }]));
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const type = params.type === "pitcher" ? "pitcher" : "batter";
  const group = type === "pitcher" ? "pitching" : "hitting";
  const yearNumber = Number(params.year);
  const year = String(Number.isInteger(yearNumber) && yearNumber >= 2023 && yearNumber <= new Date().getUTCFullYear() ? yearNumber : new Date().getUTCFullYear());
  try {
    const [mainCsv, pathCsv, teams] = await Promise.all([
      fetchText(savantUrl("", type, year)),
      fetchText(savantUrl("/swing-path-attack-angle", type, year)),
      teamLookup(group, year)
    ]);
    const pathByPlayer = new Map();
    parseCsv(pathCsv).forEach((row) => {
      const id = String(row.id || "");
      const current = pathByPlayer.get(id);
      if (!current || number(row.competitive_swings) > number(current.competitive_swings)) pathByPlayer.set(id, row);
    });
    const rows = parseCsv(mainCsv).map((row) => {
      const playerId = String(row.id || "");
      const path = pathByPlayer.get(playerId) || {};
      const meta = teams.get(playerId) || {};
      return {
        playerId,
        name: displayName(row.name),
        team: meta.team || "MLB",
        position: meta.position || "",
        swings: number(row.swings_competitive),
        avgBatSpeed: number(row.avg_bat_speed),
        fastSwingRate: number(row.hard_swing_rate),
        squaredUpRate: number(row.squared_up_per_swing),
        blastRate: number(row.blast_per_swing),
        swingLength: number(row.swing_length),
        swords: number(row.swords),
        whiffRate: number(row.whiff_per_swing),
        attackAngle: number(path.attack_angle),
        idealAttackAngleRate: number(path.ideal_attack_angle_rate),
        swingPathTilt: number(path.swing_tilt),
        attackDirection: number(path.attack_direction)
      };
    }).filter((row) => row.playerId && row.name !== "Unknown");
    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "cache-control": "public, max-age=900, s-maxage=1800" },
      body: JSON.stringify({ type, year, rows })
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Could not load Baseball Savant bat-tracking data." })
    };
  }
};
