const selections = [
  "pa",
  "exit_velocity_avg",
  "launch_angle_avg",
  "sweet_spot_percent",
  "barrel_batted_rate",
  "hard_hit_percent",
  "xwoba",
  "xba",
  "xslg"
];

const teamAbbr = {
  "Arizona Diamondbacks": "ARI",
  "D-backs": "ARI",
  "Atlanta Braves": "ATL",
  "Baltimore Orioles": "BAL",
  "Boston Red Sox": "BOS",
  "Chicago Cubs": "CHC",
  "Chicago White Sox": "CWS",
  "Cincinnati Reds": "CIN",
  "Cleveland Guardians": "CLE",
  "Colorado Rockies": "COL",
  "Detroit Tigers": "DET",
  "Houston Astros": "HOU",
  "Kansas City Royals": "KC",
  "Los Angeles Angels": "LAA",
  "Los Angeles Dodgers": "LAD",
  "Miami Marlins": "MIA",
  "Milwaukee Brewers": "MIL",
  "Minnesota Twins": "MIN",
  "New York Mets": "NYM",
  "New York Yankees": "NYY",
  "Athletics": "ATH",
  "Oakland Athletics": "ATH",
  "Philadelphia Phillies": "PHI",
  "Pittsburgh Pirates": "PIT",
  "San Diego Padres": "SD",
  "San Francisco Giants": "SF",
  "Seattle Mariners": "SEA",
  "St. Louis Cardinals": "STL",
  "Tampa Bay Rays": "TB",
  "Texas Rangers": "TEX",
  "Toronto Blue Jays": "TOR",
  "Washington Nationals": "WSH"
};

function csvUrl(type, year) {
  const params = new URLSearchParams({
    year,
    type,
    filter: "",
    min: "25",
    selections: selections.join(","),
    sort: type === "pitcher" ? "xwoba" : "exit_velocity_avg",
    sortDir: type === "pitcher" ? "asc" : "desc",
    csv: "true"
  });
  return `https://baseballsavant.mlb.com/leaderboard/custom?${params.toString()}`;
}

function statsUrl(group, year) {
  const params = new URLSearchParams({
    stats: "season",
    group,
    playerPool: "all",
    season: year,
    sportIds: "1",
    limit: "5000"
  });
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
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (field || row.length) {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      }
      if (char === "\r" && next === "\n") index += 1;
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
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

async function teamLookup(group, year) {
  const response = await fetch(statsUrl(group, year));
  if (!response.ok) return new Map();
  const data = await response.json();
  return new Map((data.stats?.[0]?.splits || []).map((split) => [
    String(split.player?.id),
    {
      team: teamAbbr[split.team?.name] || split.team?.abbreviation || split.team?.teamName || "MLB",
      teamName: split.team?.name || split.team?.teamName || "MLB",
      position: split.position?.abbreviation || ""
    }
  ]));
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const type = params.type === "pitcher" ? "pitcher" : "batter";
  const group = type === "pitcher" ? "pitching" : "hitting";
  const year = /^\d{4}$/.test(params.year || "") ? params.year : "2026";

  try {
    const [csvResponse, teams] = await Promise.all([
      fetch(csvUrl(type, year)),
      teamLookup(group, year)
    ]);
    if (!csvResponse.ok) throw new Error(`Baseball Savant returned ${csvResponse.status}`);
    const csv = await csvResponse.text();
    const rows = parseCsv(csv).map((row) => {
      const playerId = String(row.player_id || "");
      const meta = teams.get(playerId) || {};
      return {
        name: displayName(row["last_name, first_name"]),
        playerId,
        year: row.year,
        team: meta.team || "MLB",
        teamName: meta.teamName || "MLB",
        position: meta.position || "",
        sample: number(row.pa),
        exit_velocity_avg: number(row.exit_velocity_avg),
        launch_angle_avg: number(row.launch_angle_avg),
        sweet_spot_percent: number(row.sweet_spot_percent),
        barrel_batted_rate: number(row.barrel_batted_rate),
        hard_hit_percent: number(row.hard_hit_percent),
        xwoba: number(row.xwoba),
        xba: number(row.xba),
        xslg: number(row.xslg)
      };
    });
    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "cache-control": "public, max-age=900" },
      body: JSON.stringify({ type, year, rows })
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Could not load Statcast leaderboard." })
    };
  }
};
