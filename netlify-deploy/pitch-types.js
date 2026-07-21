const firstPitchTypeSeason = 2015;
const lastPitchTypeSeason = 2026;
const pitchTypeLoadTimeoutMs = 15000;
const pitchTypeParams = new URLSearchParams(window.location.search);

let pitchTypeSide = "batter";
let pitchTypeView = "teams";
let pitchTypeSeason = "2026";
let pitchTypeTeam = pitchTypeParams.get("team") || "all";
let pitchTypePitch = "offspeed";
let pitchTypeMetric = "pitch_usage";
let pitchTypeSort = { key: "pitch_usage", dir: -1 };
let pitchTypeMinPa = "25";
let pitchTypeMinPitches = "100";
let pitchTypeRawRows = [];
let pitchTypeRows = [];
let pitchTypeCopyStatusTimer;

const teamNames = {
  ARI: "Arizona Diamondbacks",
  ATL: "Atlanta Braves",
  BAL: "Baltimore Orioles",
  BOS: "Boston Red Sox",
  CHC: "Chicago Cubs",
  CWS: "Chicago White Sox",
  CIN: "Cincinnati Reds",
  CLE: "Cleveland Guardians",
  COL: "Colorado Rockies",
  DET: "Detroit Tigers",
  HOU: "Houston Astros",
  KC: "Kansas City Royals",
  LAA: "Los Angeles Angels",
  LAD: "Los Angeles Dodgers",
  MIA: "Miami Marlins",
  MIL: "Milwaukee Brewers",
  MIN: "Minnesota Twins",
  NYM: "New York Mets",
  NYY: "New York Yankees",
  ATH: "Athletics",
  OAK: "Oakland Athletics",
  PHI: "Philadelphia Phillies",
  PIT: "Pittsburgh Pirates",
  SD: "San Diego Padres",
  SF: "San Francisco Giants",
  SEA: "Seattle Mariners",
  STL: "St. Louis Cardinals",
  TB: "Tampa Bay Rays",
  TEX: "Texas Rangers",
  TOR: "Toronto Blue Jays",
  WSH: "Washington Nationals"
};

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

function normalizeTeamCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return teamCodeAliases[code] || code || "MLB";
}

function teamDisplayName(value) {
  const code = normalizeTeamCode(value);
  return teamNames[code] || code;
}

const pitchGroups = [
  ["all", "All pitch types", []],
  ["fastballs", "Fastballs", ["FF", "SI", "FC"]],
  ["breaking", "Breaking", ["SL", "ST", "CU", "SV"]],
  ["offspeed", "Offspeed", ["CH", "FS", "SC"]],
  ["FF", "4-Seam Fastball", ["FF"]],
  ["SI", "Sinker", ["SI"]],
  ["FC", "Cutter", ["FC"]],
  ["SL", "Slider", ["SL"]],
  ["ST", "Sweeper", ["ST"]],
  ["CU", "Curveball", ["CU"]],
  ["SV", "Slurve", ["SV"]],
  ["CH", "Changeup", ["CH"]],
  ["FS", "Splitter", ["FS"]],
  ["SC", "Screwball", ["SC"]],
  ["KN", "Knuckleball", ["KN"]]
];

const pitchTypeMixGroups = ["all", "fastballs", "breaking", "offspeed"];

const pitchTypeMetrics = {
  batter: [
    ["pitch_usage", "Pitch % Seen"],
    ["pitches", "Pitches"],
    ["pa", "PA"],
    ["woba", "wOBA"],
    ["est_woba", "xwOBA"],
    ["ba", "AVG"],
    ["slg", "SLG"],
    ["est_ba", "xBA"],
    ["est_slg", "xSLG"],
    ["whiff_percent", "Whiff %"],
    ["k_percent", "K %"],
    ["hard_hit_percent", "Hard-Hit %"]
  ],
  pitcher: [
    ["pitch_usage", "Pitch % Thrown"],
    ["pitches", "Pitches"],
    ["pa", "BF"],
    ["woba", "wOBA Allowed"],
    ["est_woba", "xwOBA Allowed"],
    ["ba", "AVG Allowed"],
    ["slg", "SLG Allowed"],
    ["est_ba", "xBA Allowed"],
    ["est_slg", "xSLG Allowed"],
    ["whiff_percent", "Whiff %"],
    ["k_percent", "K %"],
    ["hard_hit_percent", "Hard-Hit % Allowed"]
  ]
};

const pitchTypeLowerBetter = {
  batter: [],
  pitcher: ["woba", "est_woba", "ba", "slg", "est_ba", "est_slg", "hard_hit_percent"]
};

function applyInitialPitchTypeParams() {
  if (pitchTypeTeam !== "all") pitchTypeTeam = normalizeTeamCode(pitchTypeTeam);
  if (["batter", "pitcher"].includes(pitchTypeParams.get("type"))) pitchTypeSide = pitchTypeParams.get("type");
  if (["teams", "players"].includes(pitchTypeParams.get("view"))) pitchTypeView = pitchTypeParams.get("view");
  if (pitchTypeParams.has("season")) {
    const season = Number(pitchTypeParams.get("season"));
    if (Number.isFinite(season)) pitchTypeSeason = String(clampPitchType(season, firstPitchTypeSeason, lastPitchTypeSeason));
  }
  const pitch = pitchTypeParams.get("pitch");
  if (pitchGroups.some(([key]) => key === pitch)) pitchTypePitch = pitch;
  const metric = pitchTypeParams.get("metric");
  if (pitchTypeMetrics[pitchTypeSide].some(([key]) => key === metric)) pitchTypeMetric = metric;
  const minPa = pitchTypeParams.get("minPa");
  if (["0", "10", "25", "50", "100", "200", "250", "500"].includes(minPa)) pitchTypeMinPa = minPa;
  const minPitches = pitchTypeParams.get("minPitches");
  if (["0", "10", "25", "50", "100", "200", "300", "500", "750"].includes(minPitches)) pitchTypeMinPitches = minPitches;
  const sort = pitchTypeParams.get("sort");
  const sortable = new Set(["name", "team", "pitches", "pa", ...pitchTypeMetrics[pitchTypeSide].map(([key]) => key)]);
  if (sortable.has(sort)) {
    const dir = Number(pitchTypeParams.get("dir"));
    pitchTypeSort = { key: sort, dir: dir === 1 || dir === -1 ? dir : pitchTypeSortDirection(sort) };
  } else {
    pitchTypeSort = { key: pitchTypeMetric, dir: pitchTypeSortDirection(pitchTypeMetric) };
  }
}

function clampPitchType(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toPitchTypeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function pitchTypeLabel(key = pitchTypePitch) {
  return pitchGroups.find(([group]) => group === key)?.[1] || key;
}

function pitchTypeCodes(key = pitchTypePitch) {
  return pitchGroups.find(([group]) => group === key)?.[2] || [];
}

function pitchTypeMetricLabel(key = pitchTypeMetric) {
  return pitchTypeMetrics[pitchTypeSide].find(([metric]) => metric === key)?.[1] || key;
}

function pitchTypeSortDirection(key) {
  return pitchTypeLowerBetter[pitchTypeSide].includes(key) ? 1 : -1;
}

function showPitchTypeBars(key = pitchTypeMetric) {
  return !pitchTypeLowerBetter[pitchTypeSide].includes(key);
}

function formatPitchTypeStat(key, value) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  if (["pitch_usage", "whiff_percent", "k_percent", "put_away", "hard_hit_percent"].includes(key)) return `${number.toFixed(1)}%`;
  if (["ba", "slg", "woba", "est_ba", "est_slg", "est_woba"].includes(key)) return number.toFixed(3).replace(/^0/, "");
  if (["pitches", "pa"].includes(key)) return Math.round(number).toLocaleString("en-US");
  return number.toFixed(1);
}

function pitchTypeApiUrl() {
  const params = new URLSearchParams({ type: pitchTypeSide, year: pitchTypeSeason });
  return `/.netlify/functions/pitch-types?${params.toString()}`;
}

async function fetchPitchTypeJson() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), pitchTypeLoadTimeoutMs);
  try {
    const response = await fetch(pitchTypeApiUrl(), { signal: controller.signal, cache: "no-cache" });
    if (!response.ok) throw new Error(`Pitch type function returned ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function pitchTypeSearchUrl(name) {
  return `https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(name)}`;
}

function initials(name) {
  return String(name || "").split(" ").map((part) => part[0]).join("").slice(0, 3);
}

function weightAverage(items, key, weightKey) {
  let total = 0;
  let weight = 0;
  items.forEach((item) => {
    const value = toPitchTypeNumber(item[key]);
    const rowWeight = toPitchTypeNumber(item[weightKey]);
    if (rowWeight > 0) {
      total += value * rowWeight;
      weight += rowWeight;
    }
  });
  return weight ? total / weight : null;
}

function sumRows(items, key) {
  return items.reduce((total, item) => total + toPitchTypeNumber(item[key]), 0);
}

function addAggregate(map, key, row) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(row);
}

function aggregatePitchTypeItems(items, groupKey) {
  const codes = pitchTypeCodes(groupKey);
  const selected = codes.length ? items.filter((row) => codes.includes(row.pitchType)) : items;
  const pitches = sumRows(selected, "pitches");
  const totalPitches = sumRows(items, "pitches");
  return {
    key: groupKey,
    label: pitchTypeLabel(groupKey),
    codes,
    pitches,
    totalPitches,
    pitch_usage: totalPitches ? pitches / totalPitches * 100 : null,
    pa: sumRows(selected, "pa"),
    ba: weightAverage(selected, "ba", "pa"),
    slg: weightAverage(selected, "slg", "pa"),
    woba: weightAverage(selected, "woba", "pa"),
    est_ba: weightAverage(selected, "est_ba", "pa"),
    est_slg: weightAverage(selected, "est_slg", "pa"),
    est_woba: weightAverage(selected, "est_woba", "pa"),
    whiff_percent: weightAverage(selected, "whiff_percent", "pitches"),
    k_percent: weightAverage(selected, "k_percent", "pa"),
    hard_hit_percent: weightAverage(selected, "hard_hit_percent", "pa")
  };
}

function pitchTypeMixSourceRows() {
  const query = document.querySelector("#pitch-types-search")?.value.trim().toLowerCase() || "";
  return pitchTypeRawRows
    .filter((row) => pitchTypeTeam === "all" || row.team === pitchTypeTeam)
    .filter((row) => pitchTypeView === "teams" || toPitchTypeNumber(row.pa) >= toPitchTypeNumber(pitchTypeMinPa))
    .filter((row) => pitchTypeView === "teams" || toPitchTypeNumber(row.pitches) >= toPitchTypeNumber(pitchTypeMinPitches))
    .filter((row) => pitchTypeView === "teams" || !query || `${row.name} ${row.team} ${teamDisplayName(row.team)}`.toLowerCase().includes(query));
}

function aggregatePitchTypeRows() {
  const codes = pitchTypeCodes();
  const selected = codes.length ? pitchTypeRawRows.filter((row) => codes.includes(row.pitchType)) : pitchTypeRawRows;
  const allGroups = new Map();
  const selectedGroups = new Map();

  pitchTypeRawRows.forEach((row) => {
    const key = pitchTypeView === "teams" ? row.team : row.playerId;
    addAggregate(allGroups, key, row);
  });
  selected.forEach((row) => {
    const key = pitchTypeView === "teams" ? row.team : row.playerId;
    addAggregate(selectedGroups, key, row);
  });

  pitchTypeRows = Array.from(selectedGroups.entries()).map(([key, items]) => {
    const allItems = allGroups.get(key) || [];
    const first = items[0] || {};
    const pitches = sumRows(items, "pitches");
    const totalPitches = sumRows(allItems, "pitches");
    return {
      key,
      name: pitchTypeView === "teams" ? teamDisplayName(key) : first.name,
      team: pitchTypeView === "teams" ? key : first.team,
      teamName: teamDisplayName(first.team),
      pitches,
      totalPitches,
      pitch_usage: totalPitches ? pitches / totalPitches * 100 : null,
      pa: sumRows(items, "pa"),
      ba: weightAverage(items, "ba", "pa"),
      slg: weightAverage(items, "slg", "pa"),
      woba: weightAverage(items, "woba", "pa"),
      est_ba: weightAverage(items, "est_ba", "pa"),
      est_slg: weightAverage(items, "est_slg", "pa"),
      est_woba: weightAverage(items, "est_woba", "pa"),
      whiff_percent: weightAverage(items, "whiff_percent", "pitches"),
      k_percent: weightAverage(items, "k_percent", "pa"),
      put_away: weightAverage(items, "put_away", "pitches"),
      hard_hit_percent: weightAverage(items, "hard_hit_percent", "pa")
    };
  });
}

function filteredPitchTypeRows() {
  const query = document.querySelector("#pitch-types-search").value.trim().toLowerCase();
  return pitchTypeRows
    .filter((row) => pitchTypeTeam === "all" || row.team === pitchTypeTeam)
    .filter((row) => toPitchTypeNumber(row.pa) >= toPitchTypeNumber(pitchTypeMinPa))
    .filter((row) => toPitchTypeNumber(row.pitches) >= toPitchTypeNumber(pitchTypeMinPitches))
    .filter((row) => !query || `${row.name} ${row.team} ${row.teamName}`.toLowerCase().includes(query))
    .sort((a, b) => {
      if (pitchTypeSort.key === "name" || pitchTypeSort.key === "team") {
        return String(a[pitchTypeSort.key] || "").localeCompare(String(b[pitchTypeSort.key] || "")) * pitchTypeSort.dir;
      }
      return (toPitchTypeNumber(a[pitchTypeSort.key]) - toPitchTypeNumber(b[pitchTypeSort.key])) * pitchTypeSort.dir;
    });
}

function renderPitchTypeControls() {
  document.querySelector("#pitch-types-season").innerHTML = Array.from({ length: lastPitchTypeSeason - firstPitchTypeSeason + 1 }, (_, index) => {
    const year = lastPitchTypeSeason - index;
    return `<option value="${year}">${year}</option>`;
  }).join("");
  document.querySelector("#pitch-types-season").value = pitchTypeSeason;
  document.querySelector("#pitch-types-pitch").innerHTML = pitchGroups.map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
  document.querySelector("#pitch-types-pitch").value = pitchTypePitch;
  document.querySelector("#pitch-types-metric").innerHTML = pitchTypeMetrics[pitchTypeSide].map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
  document.querySelector("#pitch-types-metric").value = pitchTypeMetric;
  document.querySelector("#pitch-types-min-pa").innerHTML = [
    ["0", "All"],
    ["10", "10+"],
    ["25", "25+"],
    ["50", "50+"],
    ["100", "100+"],
    ["200", "200+"],
    ["250", "250+"],
    ["500", "500+"]
  ].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  document.querySelector("#pitch-types-min-pa").value = pitchTypeMinPa;
  document.querySelector("#pitch-types-min-pitches").innerHTML = [
    ["0", "All"],
    ["10", "10+"],
    ["25", "25+"],
    ["50", "50+"],
    ["100", "100+"],
    ["200", "200+"],
    ["300", "300+"],
    ["500", "500+"],
    ["750", "750+"]
  ].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  document.querySelector("#pitch-types-min-pitches").value = pitchTypeMinPitches;
  document.querySelectorAll("[data-pitch-type-side]").forEach((button) => button.classList.toggle("active", button.dataset.pitchTypeSide === pitchTypeSide));
  document.querySelectorAll("[data-pitch-type-view]").forEach((button) => button.classList.toggle("active", button.dataset.pitchTypeView === pitchTypeView));
  document.querySelector("#pitch-types-min-pa").previousElementSibling.textContent = pitchTypeSide === "batter" ? "Minimum PA" : "Minimum BF";
}

function renderPitchTypeTeamOptions() {
  const teams = Array.from(new Set(pitchTypeRawRows.map((row) => row.team).filter(Boolean)))
    .sort((a, b) => teamDisplayName(a).localeCompare(teamDisplayName(b)));
  document.querySelector("#pitch-types-team").innerHTML = `<option value="all">All teams</option>${teams.map((abbr) => `<option value="${abbr}">${teamDisplayName(abbr)}</option>`).join("")}`;
  if (pitchTypeTeam !== "all" && !teams.includes(pitchTypeTeam)) pitchTypeTeam = "all";
  document.querySelector("#pitch-types-team").value = pitchTypeTeam;
}

function renderPitchTypeSearchOptions() {
  const options = new Map();
  pitchTypeRows.forEach((row) => {
    options.set(row.name, pitchTypeView === "teams" ? row.team : `${row.name} (${row.team})`);
    if (row.team) options.set(row.team, row.team);
    if (row.teamName) options.set(row.teamName, row.teamName);
  });
  document.querySelector("#pitch-types-search-options").innerHTML = Array.from(options.entries())
    .slice(0, 500)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
}

function renderPitchTypeSummary() {
  const data = filteredPitchTypeRows();
  const leader = data[0];
  const scope = pitchTypeTeam === "all" ? "All MLB" : document.querySelector("#pitch-types-team").selectedOptions[0]?.textContent || pitchTypeTeam;
  const minPaLabel = pitchTypeSide === "batter" ? "PA" : "BF";
  document.querySelector("#pitch-types-leader").textContent = leader ? leader.name : "No rows";
  document.querySelector("#pitch-types-leader-note").textContent = leader ? `${leader.team} | ${pitchTypeMetricLabel()} ${formatPitchTypeStat(pitchTypeMetric, leader[pitchTypeMetric])}` : "Try another filter";
  document.querySelector("#pitch-types-pitch-card").textContent = pitchTypeLabel();
  document.querySelector("#pitch-types-pitch-note").textContent = `${pitchTypeSeason} | ${scope}`;
  document.querySelector("#pitch-types-metric-card").textContent = pitchTypeMetricLabel();
  document.querySelector("#pitch-types-count").textContent = data.length;
  document.querySelector("#pitch-types-count-note").textContent = `${pitchTypeMinPa === "0" ? `All ${minPaLabel}` : `${pitchTypeMinPa}+ ${minPaLabel}`} | ${pitchTypeMinPitches === "0" ? "All pitches" : `${pitchTypeMinPitches}+ pitches`}`;
  const perspective = pitchTypeSide === "batter" ? "batting" : "pitching";
  const subject = pitchTypeView === "teams" ? "team" : "player";
  const scaleNote = showPitchTypeBars() ? ` <span class="chart-scale-note">bars scaled to leader</span>` : "";
  document.querySelector("#pitch-types-chart-title").innerHTML = `${pitchTypeLabel()} ${perspective} ${subject} ${pitchTypeMetricLabel()} leaders${scaleNote}`;
  document.querySelector("#pitch-types-table-title").textContent = `${scope} ${pitchTypeLabel()} ${pitchTypeSide === "batter" ? "batting" : "pitching"} board`;
}

function renderPitchTypeMixBoard() {
  const sourceRows = pitchTypeMixSourceRows();
  const rows = pitchTypeMixGroups
    .map((key) => aggregatePitchTypeItems(sourceRows, key))
    .filter((row) => row.pitches > 0);
  const selectedTeam = document.querySelector("#pitch-types-team")?.selectedOptions[0]?.textContent;
  const scope = pitchTypeTeam === "all" ? "All MLB" : selectedTeam || teamDisplayName(pitchTypeTeam);
  const subject = pitchTypeView === "teams" ? scope : `${scope} player pool`;
  const roleLabel = pitchTypeSide === "batter" ? "PA" : "BF";
  const pitchLabel = pitchTypeSide === "batter" ? "seen" : "thrown";
  const resultLabel = pitchTypeSide === "batter" ? "batting" : "pitching allowed";
  document.querySelector("#pitch-types-mix-title").textContent = `${subject} ${resultLabel} by pitch group`;
  document.querySelector("#pitch-types-mix-status").textContent = `${pitchTypeSeason} | pitches ${pitchLabel}`;
  document.querySelector("#pitch-types-mix-board").innerHTML = rows.length ? `
    <div class="table-wrap pitch-mix-table-wrap">
      <table class="pitch-mix-table">
        <thead>
          <tr>
            <th>Pitch Group</th>
            <th>Pitches</th>
            <th>Pitch %</th>
            <th>${roleLabel}</th>
            <th>${pitchTypeSide === "batter" ? "AVG" : "AVG Allowed"}</th>
            <th>${pitchTypeSide === "batter" ? "SLG" : "SLG Allowed"}</th>
            <th>${pitchTypeSide === "batter" ? "xwOBA" : "xwOBA Allowed"}</th>
            <th>Whiff %</th>
            <th>K %</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>
                <span class="pitch-mix-label">
                  <strong>${row.label}</strong>
                  <small>${row.codes.length ? row.codes.join("/") : "All tracked pitches"}</small>
                </span>
              </td>
              <td>${formatPitchTypeStat("pitches", row.pitches)}</td>
              <td>${formatPitchTypeStat("pitch_usage", row.pitch_usage)}</td>
              <td>${formatPitchTypeStat("pa", row.pa)}</td>
              <td>${formatPitchTypeStat("ba", row.ba)}</td>
              <td>${formatPitchTypeStat("slg", row.slg)}</td>
              <td>${formatPitchTypeStat("est_woba", row.est_woba)}</td>
              <td>${formatPitchTypeStat("whiff_percent", row.whiff_percent)}</td>
              <td>${formatPitchTypeStat("k_percent", row.k_percent)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : `<div class="empty-state">No pitch groups match this filter.</div>`;
}

function renderPitchTypeChart() {
  const data = filteredPitchTypeRows().slice(0, 10);
  const max = Math.max(...data.map((row) => Math.abs(toPitchTypeNumber(row[pitchTypeMetric]))), 1);
  const includeBars = showPitchTypeBars();
  document.querySelector("#pitch-types-chart").innerHTML = data.map((row, index) => `
    <div class="bar-row pitch-type-leader-row${includeBars ? "" : " no-bar-row"}">
      <strong class="pitch-type-leader-rank">${index + 1}</strong>
      <div class="bar-label">
        ${pitchTypeView === "players" ? `<a class="chart-player-link" href="${pitchTypeSearchUrl(row.name)}" target="_blank" rel="noopener noreferrer"><strong>${row.name}</strong></a>` : `<strong>${row.name}</strong>`}
        <span>${row.team} | ${formatPitchTypeStat("pitches", row.pitches)} pitches | ${formatPitchTypeStat("pa", row.pa)} ${pitchTypeSide === "batter" ? "PA" : "BF"}</span>
      </div>
      ${includeBars ? `<div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, Math.abs(toPitchTypeNumber(row[pitchTypeMetric])) / max * 100)}%"></div></div>` : ""}
      <div class="bar-value">${formatPitchTypeStat(pitchTypeMetric, row[pitchTypeMetric])}</div>
    </div>
  `).join("") || `<div class="empty-state">No rows match this filter.</div>`;
}

function renderPitchTypeTableHead() {
  const columns = [
    ["name", pitchTypeView === "teams" ? "Team" : "Player"],
    ["team", "Team"],
    ["pitch_usage", pitchTypeSide === "batter" ? "Pitch % Seen" : "Pitch % Thrown"],
    ["pitches", "Pitches"],
    ["pa", pitchTypeSide === "batter" ? "PA" : "BF"],
    ["ba", pitchTypeSide === "batter" ? "AVG" : "AVG Allowed"],
    ["slg", pitchTypeSide === "batter" ? "SLG" : "SLG Allowed"],
    ["est_ba", pitchTypeSide === "batter" ? "xBA" : "xBA Allowed"],
    ["est_slg", pitchTypeSide === "batter" ? "xSLG" : "xSLG Allowed"],
    ["woba", pitchTypeSide === "batter" ? "wOBA" : "wOBA Allowed"],
    ["est_woba", pitchTypeSide === "batter" ? "xwOBA" : "xwOBA Allowed"],
    ["whiff_percent", "Whiff %"],
    ["k_percent", "K %"],
    ["hard_hit_percent", pitchTypeSide === "batter" ? "Hard-Hit %" : "Hard-Hit % Allowed"]
  ];
  document.querySelector("#pitch-types-head").innerHTML = `<tr>${columns.map(([key, label]) => `<th data-sort="${key}">${label}</th>`).join("")}</tr>`;
  document.querySelectorAll("#pitch-types-head th[data-sort]").forEach((header) => {
    header.addEventListener("click", () => {
      const key = header.dataset.sort;
      if (pitchTypeMetrics[pitchTypeSide].some(([metric]) => metric === key)) {
        pitchTypeMetric = key;
        document.querySelector("#pitch-types-metric").value = pitchTypeMetric;
      }
      pitchTypeSort = pitchTypeSort.key === key ? { key, dir: pitchTypeSort.dir * -1 } : { key, dir: pitchTypeSortDirection(key) };
      renderPitchTypeAll();
    });
  });
}

function renderPitchTypeTable() {
  const data = filteredPitchTypeRows().slice(0, 100);
  document.querySelector("#pitch-types-table").innerHTML = data.map((row) => `
    <tr>
      <td>
        ${pitchTypeView === "players" ? `
          <a class="player-link" href="${pitchTypeSearchUrl(row.name)}" target="_blank" rel="noopener noreferrer">
            <span class="avatar">${initials(row.name)}</span>
            <span>${row.name}</span>
          </a>
        ` : row.name}
      </td>
      <td>${row.team}</td>
      <td>${formatPitchTypeStat("pitch_usage", row.pitch_usage)}</td>
      <td>${formatPitchTypeStat("pitches", row.pitches)}</td>
      <td>${formatPitchTypeStat("pa", row.pa)}</td>
      <td>${formatPitchTypeStat("ba", row.ba)}</td>
      <td>${formatPitchTypeStat("slg", row.slg)}</td>
      <td>${formatPitchTypeStat("est_ba", row.est_ba)}</td>
      <td>${formatPitchTypeStat("est_slg", row.est_slg)}</td>
      <td>${formatPitchTypeStat("woba", row.woba)}</td>
      <td>${formatPitchTypeStat("est_woba", row.est_woba)}</td>
      <td>${formatPitchTypeStat("whiff_percent", row.whiff_percent)}</td>
      <td>${formatPitchTypeStat("k_percent", row.k_percent)}</td>
      <td>${formatPitchTypeStat("hard_hit_percent", row.hard_hit_percent)}</td>
    </tr>
  `).join("") || `<tr><td colspan="14" class="empty-row">No rows match this filter.</td></tr>`;
}

function renderPitchTypeAll() {
  aggregatePitchTypeRows();
  renderPitchTypeSearchOptions();
  renderPitchTypeSummary();
  renderPitchTypeMixBoard();
  renderPitchTypeChart();
  renderPitchTypeTableHead();
  renderPitchTypeTable();
}

function pitchTypeShareParams() {
  const params = new URLSearchParams();
  params.set("type", pitchTypeSide);
  params.set("view", pitchTypeView);
  params.set("season", pitchTypeSeason);
  params.set("pitch", pitchTypePitch);
  params.set("metric", pitchTypeMetric);
  if (pitchTypeTeam !== "all") params.set("team", pitchTypeTeam);
  if (pitchTypeMinPa !== "25") params.set("minPa", pitchTypeMinPa);
  if (pitchTypeMinPitches !== "100") params.set("minPitches", pitchTypeMinPitches);
  const query = document.querySelector("#pitch-types-search")?.value.trim() || "";
  if (query) params.set("q", query);
  if (pitchTypeSort.key && pitchTypeSort.key !== pitchTypeMetric) params.set("sort", pitchTypeSort.key);
  if (pitchTypeSort.dir !== pitchTypeSortDirection(pitchTypeSort.key || pitchTypeMetric)) params.set("dir", pitchTypeSort.dir);
  return params;
}

function pitchTypeShareUrl() {
  const url = new URL(window.location.href);
  url.search = pitchTypeShareParams().toString();
  return url.toString();
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function showPitchTypeCopyStatus(message) {
  const status = document.querySelector("#pitch-types-copy-status");
  if (!status) return;
  status.textContent = message;
  clearTimeout(pitchTypeCopyStatusTimer);
  pitchTypeCopyStatusTimer = setTimeout(() => {
    status.textContent = "";
  }, 2400);
}

async function copyPitchTypeLink() {
  try {
    await copyText(pitchTypeShareUrl());
    showPitchTypeCopyStatus("Copied");
  } catch (error) {
    showPitchTypeCopyStatus("Could not copy");
  }
}

function focusPitchTypeSearchResult() {
  renderPitchTypeAll();
  document.querySelector("#pitch-types-table-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadPitchTypeData() {
  document.querySelector("#pitch-types-status").textContent = "Loading...";
  document.querySelector("#pitch-types-mix-status").textContent = "Loading...";
  document.querySelector("#pitch-types-mix-board").innerHTML = `<div class="empty-state">Loading Baseball Savant pitch data...</div>`;
  document.querySelector("#pitch-types-chart").innerHTML = `<div class="empty-state">Loading Baseball Savant pitch data...</div>`;
  document.querySelector("#pitch-types-table").innerHTML = `<tr><td colspan="14" class="empty-row">Loading Baseball Savant pitch data...</td></tr>`;
  try {
    const data = await fetchPitchTypeJson();
    pitchTypeRawRows = (data.rows || []).map((row) => ({ ...row, team: normalizeTeamCode(row.team) }));
    renderPitchTypeTeamOptions();
    renderPitchTypeAll();
    document.querySelector("#pitch-types-status").textContent = `${pitchTypeRows.length} rows loaded`;
  } catch (error) {
    pitchTypeRawRows = [];
    pitchTypeRows = [];
    renderPitchTypeTeamOptions();
    document.querySelector("#pitch-types-status").textContent = "Live pitch feed unavailable";
    document.querySelector("#pitch-types-mix-status").textContent = "Live pitch feed unavailable";
    document.querySelector("#pitch-types-mix-board").innerHTML = `<div class="empty-state">Baseball Savant did not return pitch type data. Refresh the page or try another season.</div>`;
    document.querySelector("#pitch-types-chart").innerHTML = `<div class="empty-state">Baseball Savant did not return pitch type data. Refresh the page or try another season.</div>`;
    document.querySelector("#pitch-types-table").innerHTML = `<tr><td colspan="14" class="empty-row">Baseball Savant did not return pitch type data. Refresh the page or try another season.</td></tr>`;
  }
}

function bindPitchTypeEvents() {
  document.querySelector("#pitch-types-season").addEventListener("change", (event) => {
    pitchTypeSeason = event.target.value;
    loadPitchTypeData();
  });
  document.querySelector("#pitch-types-team").addEventListener("change", (event) => {
    pitchTypeTeam = event.target.value === "all" ? "all" : normalizeTeamCode(event.target.value);
    renderPitchTypeAll();
  });
  document.querySelector("#pitch-types-pitch").addEventListener("change", (event) => {
    pitchTypePitch = event.target.value;
    renderPitchTypeAll();
  });
  document.querySelector("#pitch-types-metric").addEventListener("change", (event) => {
    pitchTypeMetric = event.target.value;
    pitchTypeSort = { key: pitchTypeMetric, dir: pitchTypeSortDirection(pitchTypeMetric) };
    renderPitchTypeAll();
  });
  document.querySelector("#pitch-types-min-pa").addEventListener("change", (event) => {
    pitchTypeMinPa = event.target.value;
    renderPitchTypeAll();
  });
  document.querySelector("#pitch-types-min-pitches").addEventListener("change", (event) => {
    pitchTypeMinPitches = event.target.value;
    renderPitchTypeAll();
  });
  document.querySelectorAll("[data-pitch-type-side]").forEach((button) => {
    button.addEventListener("click", () => {
      pitchTypeSide = button.dataset.pitchTypeSide;
      pitchTypeMetric = "pitch_usage";
      pitchTypeSort = { key: "pitch_usage", dir: -1 };
      renderPitchTypeControls();
      loadPitchTypeData();
    });
  });
  document.querySelectorAll("[data-pitch-type-view]").forEach((button) => {
    button.addEventListener("click", () => {
      pitchTypeView = button.dataset.pitchTypeView;
      renderPitchTypeControls();
      renderPitchTypeAll();
    });
  });
  document.querySelector("#pitch-types-search").addEventListener("input", renderPitchTypeAll);
  document.querySelector("#pitch-types-search-submit").addEventListener("click", focusPitchTypeSearchResult);
  document.querySelector("#pitch-types-search").addEventListener("keydown", (event) => {
    if (event.key === "Enter") focusPitchTypeSearchResult();
  });
  document.querySelector("#copy-pitch-types-link")?.addEventListener("click", copyPitchTypeLink);
}

function applyInitialPitchTypeSearch() {
  const query = pitchTypeParams.get("q") || "";
  if (query) document.querySelector("#pitch-types-search").value = query;
}

applyInitialPitchTypeParams();
renderPitchTypeControls();
applyInitialPitchTypeSearch();
bindPitchTypeEvents();
loadPitchTypeData();
