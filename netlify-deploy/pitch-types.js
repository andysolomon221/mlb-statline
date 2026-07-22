const pitchTypeLabels = {
  FF: "4-Seam Fastball",
  SI: "Sinker",
  FC: "Cutter",
  SL: "Slider",
  ST: "Sweeper",
  CU: "Curveball",
  SV: "Slurve",
  CH: "Changeup",
  FS: "Splitter",
  SC: "Screwball",
  KN: "Knuckleball"
};

const savantTimeoutMs = 9000;

const teamCodeAliases = {
  AZ: "ARI",
  ARI: "ARI",
  CHW: "CWS",
  CWS: "CWS",
  KCR: "KC",
  KC: "KC",
  OAK: "ATH",
  ATH: "ATH",
  SDP: "SD",
  SD: "SD",
  SFG: "SF",
  SF: "SF",
  TBR: "TB",
  TB: "TB",
  WAS: "WSH",
  WSN: "WSH",
  WSH: "WSH"
};

function savantUrl(type, year) {
  const params = new URLSearchParams({
    type,
    pitchType: "",
    year,
    team: "",
    min: "1",
    minPitches: "1",
    sort: "6",
    sortDir: "desc",
    csv: "true"
  });
  return `https://baseballsavant.mlb.com/leaderboard/pitch-arsenal-stats?${params.toString()}`;
}

function savantHomeRunUrl(type, year) {
  const params = new URLSearchParams({
    hfSea: `${year}|`,
    hfGT: "R|",
    group_by: "pitch-type",
    player_type: type,
    chk_stats_hrs: "on",
    min_pitches: "0",
    min_results: "0",
    min_pas: "0",
    sort_col: "hrs",
    sort_order: "desc"
  });
  return `https://baseballsavant.mlb.com/statcast_search?${params.toString()}`;
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

function normalizeTeamCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return teamCodeAliases[code] || code || "MLB";
}

function htmlNumber(value) {
  const parsed = Number(String(value || "").replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseHomeRunsByPitchType(html) {
  const homeRuns = new Map();
  const rowPattern = /<tr class="search_row default-table-row"[\s\S]*?<\/tr>/g;
  const rows = String(html || "").match(rowPattern) || [];
  rows.forEach((row) => {
    const playerId = row.match(/data-player-id="([^"]+)"/)?.[1] || "";
    const pitchType = row.match(/data-pitch-type="([^"]+)"/)?.[1] || "";
    const values = Array.from(row.matchAll(/<td[^>]*class="tr-data align-right[^"]*"[^>]*>[\s\S]*?<span>\s*([^<]+)\s*<\/span>/g))
      .map((match) => htmlNumber(match[1]));
    const hrs = values[values.length - 1];
    if (playerId && pitchType && hrs !== null) homeRuns.set(`${playerId}:${pitchType}`, hrs);
  });
  return homeRuns;
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const type = params.type === "pitcher" ? "pitcher" : "batter";
  const year = /^\d{4}$/.test(params.year || "") ? params.year : "2026";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), savantTimeoutMs);
    const [response, homeRunHtml] = await Promise.all([
      fetch(savantUrl(type, year), { signal: controller.signal }),
      fetch(savantHomeRunUrl(type, year), { signal: controller.signal })
        .then((homeRunResponse) => homeRunResponse.ok ? homeRunResponse.text() : "")
        .catch(() => "")
    ]).finally(() => clearTimeout(timeout));
    if (!response.ok) throw new Error(`Baseball Savant returned ${response.status}`);
    const csv = await response.text();
    const homeRunsByPitchType = parseHomeRunsByPitchType(homeRunHtml);
    const rows = parseCsv(csv).map((row) => {
      const pitchType = row.pitch_type || "";
      const playerId = String(row.player_id || "");
      return {
        name: displayName(row["last_name, first_name"]),
        playerId,
        team: normalizeTeamCode(row.team_name_alt),
        pitchType,
        pitchName: row.pitch_name || pitchTypeLabels[pitchType] || pitchType,
        run_value_per_100: number(row.run_value_per_100),
        run_value: number(row.run_value),
        pitches: number(row.pitches),
        pitch_usage: number(row.pitch_usage),
        pa: number(row.pa),
        homeRuns: homeRunsByPitchType.get(`${playerId}:${pitchType}`) ?? null,
        ba: number(row.ba),
        slg: number(row.slg),
        woba: number(row.woba),
        whiff_percent: number(row.whiff_percent),
        k_percent: number(row.k_percent),
        put_away: number(row.put_away),
        est_ba: number(row.est_ba),
        est_slg: number(row.est_slg),
        est_woba: number(row.est_woba),
        hard_hit_percent: number(row.hard_hit_percent)
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
      body: JSON.stringify({ error: "Could not load pitch type data." })
    };
  }
};
