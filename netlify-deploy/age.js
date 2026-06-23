const firstAgeSeason = 1901;
const lastAgeSeason = 2026;
const ageCache = new Map();
const numberFormat = new Intl.NumberFormat("en-US");

let activeGroup = "pitching";
let activeMetric = "strikeOuts";
let activeRule = "before";
let activeAge = 25;
let activeAdvancedAgeRange = false;
let activeAgeRange = { start: 25, end: 30 };
let activeRange = { start: 1901, end: 2026 };
let activeMinimum = "auto";
let activeRequestId = 0;
let lastRenderedRows = [];

const metricConfig = {
  hitting: {
    label: "hitting",
    sortMap: {
      hits: "hits",
      homeRuns: "homeRuns",
      rbi: "rbi",
      stolenBases: "stolenBases",
      strikeOuts: "strikeOuts",
      avg: "avg",
      ops: "ops"
    },
    metrics: [
      ["homeRuns", "HR"],
      ["hits", "Hits"],
      ["rbi", "RBI"],
      ["stolenBases", "SB"],
      ["strikeOuts", "SO"],
      ["ops", "OPS"],
      ["avg", "AVG"]
    ],
    lowerBetter: [],
    columns: [
      ["name", "Player"],
      ["teams", "Clubs"],
      ["ageLabel", "Ages"],
      ["seasonLabel", "Seasons"],
      ["gamesPlayed", "G"],
      ["plateAppearances", "PA"],
      ["hits", "H"],
      ["homeRuns", "HR"],
      ["stolenBases", "SB"],
      ["rbi", "RBI"],
      ["strikeOuts", "SO"],
      ["avg", "AVG"],
      ["ops", "OPS"]
    ],
    minimums: [
      ["auto", "Auto"],
      ["0", "All"],
      ["250", "250+ PA"],
      ["750", "750+ PA"],
      ["1500", "1500+ PA"]
    ],
    minimumKey: "plateAppearances"
  },
  pitching: {
    label: "pitching",
    sortMap: {
      strikeOuts: "strikeOuts",
      wins: "wins",
      saves: "saves",
      gamesStarted: "gamesStarted",
      era: "era",
      whip: "whip"
    },
    metrics: [
      ["strikeOuts", "SO"],
      ["wins", "Wins"],
      ["saves", "Saves"],
      ["gamesStarted", "GS"],
      ["era", "ERA"],
      ["whip", "WHIP"]
    ],
    lowerBetter: ["era", "whip"],
    columns: [
      ["name", "Player"],
      ["teams", "Clubs"],
      ["ageLabel", "Ages"],
      ["seasonLabel", "Seasons"],
      ["gamesPlayed", "G"],
      ["gamesStarted", "GS"],
      ["inningsPitched", "IP"],
      ["era", "ERA"],
      ["wins", "W"],
      ["losses", "L"],
      ["saves", "SV"],
      ["strikeOuts", "SO"],
      ["whip", "WHIP"]
    ],
    minimums: [
      ["auto", "Auto"],
      ["0", "All"],
      ["150", "50+ IP"],
      ["300", "100+ IP"],
      ["600", "200+ IP"]
    ],
    minimumKey: "ipOuts"
  }
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function inningsToOuts(value) {
  const [whole, partial = "0"] = String(value || "0").split(".");
  return (Number(whole) || 0) * 3 + (Number(partial) || 0);
}

function outsToInnings(outs) {
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

function rate(numerator, denominator, places = 3) {
  return denominator > 0 ? (numerator / denominator).toFixed(places) : "";
}

function fmtStat(key, value) {
  const numeric = Number(value);
  if (key === "name" || key === "teams" || key === "ageLabel" || key === "seasonLabel") return escapeHtml(value || "-");
  if (!Number.isFinite(numeric)) return "-";
  if (key === "inningsPitched") return outsToInnings(numeric);
  if (["avg", "obp", "slg", "ops"].includes(key)) return numeric.toFixed(3).replace(/^0/, "");
  if (["era", "whip"].includes(key)) return numeric.toFixed(2);
  return numberFormat.format(Math.round(numeric));
}

function initials(name) {
  return String(name || "").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function baseballReferenceSearchUrl(name) {
  return `https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(name)}`;
}

function yearOptions() {
  const years = [];
  for (let year = lastAgeSeason; year >= firstAgeSeason; year -= 1) {
    years.push(`<option value="${year}">${year}</option>`);
  }
  return years.join("");
}

function populateControls() {
  const years = yearOptions();
  document.querySelector("#age-start").innerHTML = years;
  document.querySelector("#age-end").innerHTML = years;
  document.querySelector("#age-start").value = activeRange.start;
  document.querySelector("#age-end").value = activeRange.end;

  const ages = [];
  for (let age = 18; age <= 45; age += 1) {
    ages.push(`<option value="${age}">${age}</option>`);
  }
  document.querySelector("#age-cutoff").innerHTML = ages.join("");
  document.querySelector("#age-cutoff").value = activeAge;
  document.querySelector("#age-range-start").innerHTML = ages.join("");
  document.querySelector("#age-range-end").innerHTML = ages.join("");
  document.querySelector("#age-range-start").value = activeAgeRange.start;
  document.querySelector("#age-range-end").value = activeAgeRange.end;
  updateMetricControls();
}

function updateMetricControls() {
  const config = metricConfig[activeGroup];
  document.querySelector("#age-stat").innerHTML = config.metrics.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  if (!config.metrics.some(([value]) => value === activeMetric)) activeMetric = config.metrics[0][0];
  document.querySelector("#age-stat").value = activeMetric;
  document.querySelector("#age-minimum").innerHTML = config.minimums.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  if (!config.minimums.some(([value]) => value === activeMinimum)) activeMinimum = "auto";
  document.querySelector("#age-minimum").value = activeMinimum;
}

function readControls() {
  activeGroup = document.querySelector("#age-group").value;
  activeMetric = document.querySelector("#age-stat").value;
  activeRule = document.querySelector("#age-rule").value;
  activeAge = Number(document.querySelector("#age-cutoff").value);
  activeAdvancedAgeRange = document.querySelector(".age-controls-panel").hasAttribute("data-advanced-age-range");
  activeAgeRange = {
    start: Number(document.querySelector("#age-range-start").value),
    end: Number(document.querySelector("#age-range-end").value)
  };
  activeRange = {
    start: Number(document.querySelector("#age-start").value),
    end: Number(document.querySelector("#age-end").value)
  };
  activeMinimum = document.querySelector("#age-minimum").value;
}

function ageMatches(age) {
  if (!Number.isFinite(age)) return false;
  if (activeAdvancedAgeRange) {
    const low = Math.min(activeAgeRange.start, activeAgeRange.end);
    const high = Math.max(activeAgeRange.start, activeAgeRange.end);
    return age >= low && age <= high;
  }
  if (activeRule === "before") return age < activeAge;
  if (activeRule === "through") return age <= activeAge;
  if (activeRule === "older") return age >= activeAge;
  if (activeRule === "after") return age > activeAge;
  return false;
}

function yearList() {
  const low = Math.min(activeRange.start, activeRange.end);
  const high = Math.max(activeRange.start, activeRange.end);
  return Array.from({ length: high - low + 1 }, (_, index) => low + index);
}

function metricLabel(metric = activeMetric) {
  return metricConfig[activeGroup].metrics.find(([value]) => value === metric)?.[1] || metric.toUpperCase();
}

function questionLabel() {
  if (activeAdvancedAgeRange) {
    const low = Math.min(activeAgeRange.start, activeAgeRange.end);
    const high = Math.max(activeAgeRange.start, activeAgeRange.end);
    return `Most ${metricLabel()} from age ${low} through ${high}`;
  }
  const rules = {
    before: `before age ${activeAge}`,
    through: `through age ${activeAge}`,
    older: `age ${activeAge} or older`,
    after: `after age ${activeAge}`
  };
  return `Most ${metricLabel()} ${rules[activeRule] || `before age ${activeAge}`}`;
}

function searchUrl(year) {
  const config = metricConfig[activeGroup];
  const params = new URLSearchParams({
    stats: "season",
    group: activeGroup,
    season: String(year),
    playerPool: "ALL",
    limit: "5000",
    hydrate: "team",
    sortStat: config.sortMap[activeMetric] || config.sortMap[config.metrics[0][0]]
  });
  return `https://statsapi.mlb.com/api/v1/stats?${params.toString()}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`MLB Stats API returned ${response.status}`);
  return response.json();
}

async function fetchSeason(year) {
  const cacheKey = `${activeGroup}:${activeMetric}:${year}`;
  if (ageCache.has(cacheKey)) return ageCache.get(cacheKey);
  const data = await fetchJson(searchUrl(year));
  const rows = data.stats?.[0]?.splits || [];
  ageCache.set(cacheKey, rows);
  return rows;
}

async function fetchInBatches(items, mapper, size = 4, onProgress = () => {}) {
  const results = [];
  for (let index = 0; index < items.length; index += size) {
    const batch = items.slice(index, index + size);
    results.push(...(await Promise.all(batch.map(mapper))));
    onProgress(Math.min(items.length, index + size), items.length);
  }
  return results;
}

function emptyAggregate(split) {
  const name = split.player?.fullName || "Unknown Player";
  return {
    id: split.player?.id || name,
    name,
    teams: new Set(),
    ages: new Set(),
    seasons: new Set(),
    gamesPlayed: 0,
    gamesStarted: 0,
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    homeRuns: 0,
    stolenBases: 0,
    rbi: 0,
    strikeOuts: 0,
    baseOnBalls: 0,
    hitByPitch: 0,
    sacFlies: 0,
    totalBases: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    earnedRuns: 0,
    ipOuts: 0
  };
}

function teamAbbr(split) {
  return split.team?.abbreviation || split.team?.teamName || split.team?.name || "MLB";
}

function addSplitToAggregate(row, split) {
  const stat = split.stat || {};
  row.teams.add(teamAbbr(split));
  row.ages.add(toNumber(stat.age));
  row.seasons.add(String(split.season));
  row.gamesPlayed += toNumber(stat.gamesPlayed);
  row.gamesStarted += toNumber(stat.gamesStarted);
  row.plateAppearances += toNumber(stat.plateAppearances);
  row.atBats += toNumber(stat.atBats);
  row.hits += toNumber(stat.hits);
  row.homeRuns += toNumber(stat.homeRuns);
  row.stolenBases += toNumber(stat.stolenBases);
  row.rbi += toNumber(stat.rbi);
  row.strikeOuts += toNumber(stat.strikeOuts);
  row.baseOnBalls += toNumber(stat.baseOnBalls);
  row.hitByPitch += toNumber(stat.hitByPitch);
  row.sacFlies += toNumber(stat.sacFlies);
  row.totalBases += toNumber(stat.totalBases) || Math.round(toNumber(stat.slg) * toNumber(stat.atBats));
  row.wins += toNumber(stat.wins);
  row.losses += toNumber(stat.losses);
  row.saves += toNumber(stat.saves);
  row.earnedRuns += toNumber(stat.earnedRuns);
  row.ipOuts += toNumber(stat.outs) || inningsToOuts(stat.inningsPitched);
}

function finalizeRow(row) {
  const ages = Array.from(row.ages).filter(Boolean).sort((a, b) => a - b);
  const seasons = Array.from(row.seasons).map(Number).filter(Boolean).sort((a, b) => a - b);
  row.teams = Array.from(row.teams).slice(0, 4).join("/");
  row.ageLabel = ages.length ? `${ages[0]}-${ages[ages.length - 1]}` : "-";
  row.seasonLabel = seasons.length
    ? seasons[0] === seasons[seasons.length - 1] ? String(seasons[0]) : `${seasons[0]}-${seasons[seasons.length - 1]}`
    : "-";
  row.inningsPitched = row.ipOuts;
  row.avg = Number(rate(row.hits, row.atBats, 3)) || 0;
  const obpDenominator = row.atBats + row.baseOnBalls + row.hitByPitch + row.sacFlies;
  const obp = Number(rate(row.hits + row.baseOnBalls + row.hitByPitch, obpDenominator, 3)) || 0;
  const slg = Number(rate(row.totalBases, row.atBats, 3)) || 0;
  row.ops = obp + slg;
  row.era = row.ipOuts ? (row.earnedRuns * 27) / row.ipOuts : 0;
  row.whip = row.ipOuts ? ((row.hits + row.baseOnBalls) * 3) / row.ipOuts : 0;
  return row;
}

function aggregateRows(seasonSplits) {
  const byPlayer = new Map();
  seasonSplits.flat().forEach((split) => {
    const age = toNumber(split.stat?.age);
    if (!ageMatches(age)) return;
    const id = String(split.player?.id || split.player?.fullName || "");
    if (!id) return;
    const row = byPlayer.get(id) || emptyAggregate(split);
    addSplitToAggregate(row, split);
    byPlayer.set(id, row);
  });
  return Array.from(byPlayer.values()).map(finalizeRow);
}

function minimumThreshold() {
  if (activeMinimum !== "auto") return Number(activeMinimum) || 0;
  const rateMetric = activeGroup === "hitting"
    ? ["avg", "ops"].includes(activeMetric)
    : ["era", "whip"].includes(activeMetric);
  if (!rateMetric) return 0;
  const yearCount = yearList().length;
  if (activeGroup === "pitching") return Math.min(600, Math.max(0, yearCount * 40));
  return Math.min(1500, Math.max(0, yearCount * 120));
}

function qualifiedRows(rows) {
  const config = metricConfig[activeGroup];
  const threshold = minimumThreshold();
  if (!threshold) return rows;
  return rows.filter((row) => toNumber(row[config.minimumKey]) >= threshold);
}

function sortRows(rows) {
  const lower = metricConfig[activeGroup].lowerBetter.includes(activeMetric);
  const direction = lower ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const diff = (toNumber(a[activeMetric]) - toNumber(b[activeMetric])) * direction;
    if (diff) return diff;
    return String(a.name).localeCompare(b.name);
  });
}

function renderHead() {
  const columns = metricConfig[activeGroup].columns;
  document.querySelector("#age-head").innerHTML = `
    <tr>${columns.map(([, label]) => `<th>${label}</th>`).join("")}</tr>
  `;
}

function renderRows(rows) {
  const columns = metricConfig[activeGroup].columns;
  document.querySelector("#age-table").innerHTML = rows.slice(0, 50).map((row) => `
    <tr>
      ${columns.map(([key]) => {
        if (key === "name") {
          return `<td><a class="player-link" href="${baseballReferenceSearchUrl(row.name)}" target="_blank" rel="noopener noreferrer"><span class="avatar">${initials(row.name)}</span><span>${escapeHtml(row.name)}</span></a></td>`;
        }
        return `<td>${fmtStat(key, row[key])}</td>`;
      }).join("")}
    </tr>
  `).join("") || `<tr><td colspan="${columns.length}" class="empty-row">No players match this age question.</td></tr>`;
}

function chartMeta(row) {
  const pieces = [row.teams, row.ageLabel && `Age ${row.ageLabel}`, row.seasonLabel].filter(Boolean);
  return pieces.join(" | ");
}

function renderAgeChart(rows) {
  lastRenderedRows = rows;
  const chart = document.querySelector("#age-bar-chart");
  const title = document.querySelector("#age-chart-title");
  if (!chart || !title) return;
  title.textContent = `${questionLabel()} leaders`;
  if (!rows.length) {
    chart.innerHTML = `<div class="empty-state">No players match this age question.</div>`;
    return;
  }
  const limit = Number(document.querySelector("#age-chart-size")?.value || 10);
  const visibleRows = rows.slice(0, limit);
  const values = visibleRows.map((row) => toNumber(row[activeMetric]));
  const lower = metricConfig[activeGroup].lowerBetter.includes(activeMetric);
  const maxValue = Math.max(...values.map((value) => Math.abs(value)), 1);
  const minValue = Math.min(...values);
  const range = Math.max(maxValue - minValue, 1);
  chart.innerHTML = visibleRows.map((row) => {
    const value = toNumber(row[activeMetric]);
    const percent = lower
      ? Math.max(8, 100 - ((value - minValue) / range) * 92)
      : Math.max(8, (Math.abs(value) / maxValue) * 100);
    return `
      <div class="bar-row age-bar-row">
        <div class="bar-label">
          <a class="chart-player-link" href="${baseballReferenceSearchUrl(row.name)}" target="_blank" rel="noopener noreferrer">
            <strong>${escapeHtml(row.name)}</strong>
            <span>${escapeHtml(chartMeta(row))}</span>
          </a>
        </div>
        <div class="bar-track" aria-hidden="true">
          <div class="bar-fill" style="width:${percent.toFixed(1)}%"></div>
        </div>
        <div class="bar-value">${fmtStat(activeMetric, row[activeMetric])}</div>
      </div>
    `;
  }).join("");
}

function renderSummary(rows, allRows = rows) {
  const leader = rows[0];
  document.querySelector("#age-question").textContent = questionLabel();
  document.querySelector("#age-question-note").textContent = `${activeGroup === "pitching" ? "Pitchers" : "Hitters"}, ${Math.min(activeRange.start, activeRange.end)}-${Math.max(activeRange.start, activeRange.end)}`;
  document.querySelector("#age-player-count").textContent = numberFormat.format(rows.length);
  document.querySelector("#age-leader-name").textContent = leader?.name || "--";
  document.querySelector("#age-leader-note").textContent = leader ? `${metricLabel()}: ${fmtStat(activeMetric, leader[activeMetric])}` : `${numberFormat.format(allRows.length)} raw players before minimum filter`;
}

async function runAgeSearch() {
  readControls();
  const requestId = ++activeRequestId;
  const years = yearList();
  const status = document.querySelector("#age-status");
  document.querySelector("#age-progress").textContent = "Loading";
  document.querySelector("#age-progress-note").textContent = `${years.length} seasons requested`;
  status.textContent = `Loading ${years.length} seasons from MLB Stats API...`;
  renderHead();
  document.querySelector("#age-table").innerHTML = `<tr><td colspan="${metricConfig[activeGroup].columns.length}" class="empty-row">Loading age leaders...</td></tr>`;
  document.querySelector("#age-bar-chart").innerHTML = `<div class="empty-state">Loading age leaders...</div>`;

  try {
    const payloads = await fetchInBatches(years, fetchSeason, 4, (done, total) => {
      if (requestId !== activeRequestId) return;
      document.querySelector("#age-progress").textContent = `${done}/${total}`;
      status.textContent = `Loaded ${done} of ${total} seasons...`;
    });
    if (requestId !== activeRequestId) return;
    const allRows = aggregateRows(payloads);
    const rows = sortRows(qualifiedRows(allRows));
    renderRows(rows);
    renderAgeChart(rows);
    renderSummary(rows, allRows);
    document.querySelector("#age-table-title").textContent = `${questionLabel()} leaders`;
    document.querySelector("#age-progress").textContent = "Done";
    document.querySelector("#age-progress-note").textContent = `${numberFormat.format(allRows.length)} raw players checked`;
    status.textContent = `Showing top ${Math.min(50, rows.length)} of ${numberFormat.format(rows.length)} qualified players.`;
  } catch (error) {
    if (requestId !== activeRequestId) return;
    document.querySelector("#age-progress").textContent = "Error";
    document.querySelector("#age-progress-note").textContent = "Could not load MLB data";
    status.textContent = "Could not load age leaders. Try a smaller season range or try again.";
    document.querySelector("#age-table").innerHTML = `<tr><td colspan="${metricConfig[activeGroup].columns.length}" class="empty-row">Could not load age leaders.</td></tr>`;
    document.querySelector("#age-bar-chart").innerHTML = `<div class="empty-state">Could not load age leaders.</div>`;
  }
}

function applyExample(name) {
  const examples = {
    "pitcher-so-25": { group: "pitching", metric: "strikeOuts", rule: "before", age: 25, min: "auto" },
    "hitter-hr-25": { group: "hitting", metric: "homeRuns", rule: "before", age: 25, min: "auto" },
    "hitter-hits-30": { group: "hitting", metric: "hits", rule: "through", age: 30, min: "auto" },
    "hitter-hr-40": { group: "hitting", metric: "homeRuns", rule: "older", age: 40, min: "auto" },
    "pitcher-saves-28": { group: "pitching", metric: "saves", rule: "before", age: 28, min: "0" }
  };
  const example = examples[name];
  if (!example) return;
  activeGroup = example.group;
  activeMetric = example.metric;
  activeRule = example.rule;
  activeAge = example.age;
  activeAdvancedAgeRange = false;
  activeMinimum = example.min;
  document.querySelector(".age-controls-panel").removeAttribute("data-advanced-age-range");
  document.querySelector("#age-advanced-toggle").textContent = "Advanced age range";
  document.querySelector("#age-group").value = activeGroup;
  updateMetricControls();
  document.querySelector("#age-stat").value = activeMetric;
  document.querySelector("#age-rule").value = activeRule;
  document.querySelector("#age-cutoff").value = activeAge;
  document.querySelector("#age-minimum").value = activeMinimum;
  runAgeSearch();
}

function init() {
  populateControls();
  renderHead();
  renderSummary([], []);
  document.querySelector("#age-group").addEventListener("change", (event) => {
    activeGroup = event.target.value;
    updateMetricControls();
    renderHead();
  });
  document.querySelector("#age-run").addEventListener("click", runAgeSearch);
  document.querySelector("#age-chart-size").addEventListener("change", () => renderAgeChart(lastRenderedRows));
  document.querySelector("#age-advanced-toggle").addEventListener("click", () => {
    const panel = document.querySelector(".age-controls-panel");
    const enabled = panel.toggleAttribute("data-advanced-age-range");
    activeAdvancedAgeRange = enabled;
    document.querySelector("#age-advanced-toggle").textContent = enabled ? "Use single age" : "Advanced age range";
  });
  document.querySelectorAll("[data-age-example]").forEach((button) => {
    button.addEventListener("click", () => applyExample(button.dataset.ageExample));
  });
}

init();
