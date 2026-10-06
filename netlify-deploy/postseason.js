const MLB_STATS = "https://statsapi.mlb.com/api/v1/stats";
const currentYear = new Date().getFullYear();
const query = new URLSearchParams(window.location.search);
const roundNames = { P: "Combined Postseason", F: "Wild Card", D: "Division Series", L: "League Championship Series", W: "World Series" };

const definitions = {
  hitting: {
    label: "Batting",
    defaultMetric: "homeRuns",
    minimums: [[0, "No minimum"], [5, "5+ PA"], [10, "10+ PA"], [20, "20+ PA"], [30, "30+ PA"]],
    weight: row => number(row.stat.plateAppearances),
    metrics: [
      ["gamesPlayed", "G"], ["plateAppearances", "PA"], ["runs", "R"], ["hits", "H"], ["homeRuns", "HR"],
      ["rbi", "RBI"], ["stolenBases", "SB"], ["avg", "AVG"], ["obp", "OBP"], ["slg", "SLG"], ["ops", "OPS"]
    ],
    rateMetrics: new Set(["avg", "obp", "slg", "ops"])
  },
  pitching: {
    label: "Pitching",
    defaultMetric: "strikeOuts",
    minimums: [[0, "No minimum"], [3, "3+ IP"], [5, "5+ IP"], [10, "10+ IP"], [15, "15+ IP"]],
    weight: row => inningsOuts(row.stat.inningsPitched) / 3,
    metrics: [
      ["gamesPlayed", "G"], ["gamesStarted", "GS"], ["inningsPitched", "IP"], ["wins", "W"], ["saves", "SV"],
      ["strikeOuts", "K"], ["era", "ERA"], ["whip", "WHIP"]
    ],
    rateMetrics: new Set(["era", "whip"]),
    lowerBetter: new Set(["era", "whip"])
  }
};

let rows = [];
let group = query.get("group") === "pitching" ? "pitching" : "hitting";
let season = clampSeason(query.get("season"));
let round = roundNames[query.get("round")] ? query.get("round") : "P";
let team = query.get("team") || "all";
let minimum = Math.max(0, Number(query.get("min")) || 0);
let metric = query.get("metric") || definitions[group].defaultMetric;
let size = query.get("size") === "all" ? "all" : "20";
let sort = { key: metric, direction: definitions[group].lowerBetter?.has(metric) ? 1 : -1 };
let requestId = 0;

function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function clampSeason(value) { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 1903 && parsed <= currentYear ? parsed : currentYear; }
function inningsOuts(value) { const [whole, partial = "0"] = String(value || "0").split("."); return number(whole) * 3 + number(partial); }
function initials(name) { return String(name || "MLB").split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase(); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
function statlineUrl(page, name) { return `${page}?player=${encodeURIComponent(name)}&group=${group}`; }

function formatStat(key, value) {
  if (value === undefined || value === null || value === "") return "—";
  if (definitions[group].rateMetrics.has(key)) {
    const places = key === "era" || key === "whip" ? 2 : 3;
    return number(value).toFixed(places).replace(/^0(?=\.)/, "");
  }
  if (key === "inningsPitched") return String(value);
  return Math.round(number(value)).toLocaleString("en-US");
}

function populateYears() {
  const select = document.querySelector("#postseason-year");
  for (let year = currentYear; year >= 1903; year -= 1) select.add(new Option(String(year), String(year)));
  select.value = String(season);
}

function configureGroup() {
  const config = definitions[group];
  document.querySelector("#postseason-group").value = group;
  document.querySelector("#postseason-min-label").firstChild.textContent = group === "pitching" ? "Minimum IP\n" : "Minimum PA\n";
  const minimumSelect = document.querySelector("#postseason-min");
  minimumSelect.innerHTML = config.minimums.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  minimumSelect.value = String(config.minimums.some(([value]) => value === minimum) ? minimum : 0);
  minimum = number(minimumSelect.value);
  const metricSelect = document.querySelector("#postseason-metric");
  metricSelect.innerHTML = config.metrics.map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
  if (!config.metrics.some(([key]) => key === metric)) metric = config.defaultMetric;
  metricSelect.value = metric;
  sort = { key: metric, direction: config.lowerBetter?.has(metric) ? 1 : -1 };
}

function endpoint() {
  const params = new URLSearchParams({
    stats: "season", group, season: String(season), gameType: round, playerPool: "ALL", limit: "5000", hydrate: "team",
    sortStat: metric
  });
  return `${MLB_STATS}?${params}`;
}

async function loadRows() {
  const activeRequest = ++requestId;
  setLoading();
  try {
    const response = await fetch(endpoint());
    if (!response.ok) throw new Error(`MLB Stats API returned ${response.status}`);
    const data = await response.json();
    if (activeRequest !== requestId) return;
    rows = data.stats?.[0]?.splits || [];
    populateTeams();
    render();
  } catch (error) {
    if (activeRequest !== requestId) return;
    rows = [];
    document.querySelector("#postseason-title").textContent = "Postseason statistics unavailable";
    document.querySelector("#postseason-note").textContent = "The MLB data feed could not be reached. Try again in a moment.";
    document.querySelector("#postseason-body").innerHTML = `<tr><td class="empty-row">Could not load playoff data.</td></tr>`;
  }
}

function setLoading() {
  document.querySelector("#postseason-title").textContent = "Loading playoff leaders…";
  document.querySelector("#postseason-note").textContent = "";
  document.querySelector("#postseason-highlight").classList.remove("is-visible");
  document.querySelector("#postseason-body").innerHTML = `<tr><td class="empty-row">Loading MLB postseason statistics…</td></tr>`;
}

function populateTeams() {
  const select = document.querySelector("#postseason-team");
  const found = new Map(rows.map(row => [String(row.team?.id || row.team?.name), row.team?.name || "Unknown Team"]));
  const teams = Array.from(found.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  select.innerHTML = `<option value="all">All teams</option>${teams.map(([id, name]) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join("")}`;
  if (!found.has(String(team))) team = "all";
  select.value = team;
}

function filteredRows() {
  const search = document.querySelector("#postseason-search").value.trim().toLowerCase();
  const config = definitions[group];
  return rows.filter(row => {
    const matchesTeam = team === "all" || String(row.team?.id || row.team?.name) === String(team);
    const matchesMinimum = config.weight(row) >= minimum;
    const matchesSearch = !search || String(row.player?.fullName || "").toLowerCase().includes(search);
    return matchesTeam && matchesMinimum && matchesSearch;
  }).sort((a, b) => {
    const aValue = sort.key === "inningsPitched" ? inningsOuts(a.stat?.[sort.key]) : number(a.stat?.[sort.key]);
    const bValue = sort.key === "inningsPitched" ? inningsOuts(b.stat?.[sort.key]) : number(b.stat?.[sort.key]);
    return (aValue - bValue) * sort.direction || String(a.player?.fullName).localeCompare(String(b.player?.fullName));
  });
}

function render() {
  const config = definitions[group];
  const allFiltered = filteredRows();
  const visible = size === "all" ? allFiltered : allFiltered.slice(0, 20);
  const teamName = team === "all" ? "MLB" : document.querySelector("#postseason-team").selectedOptions[0]?.textContent;
  const roundName = roundNames[round];
  document.querySelector("#postseason-scope").textContent = `${season} ${roundName} leaders`;
  document.querySelector("#postseason-eyebrow").textContent = `Postseason ${config.label}`;
  document.querySelector("#postseason-title").textContent = `${season} ${teamName} ${config.label.toLowerCase()} leaders · ${roundName}`;
  document.querySelector("#postseason-note").textContent = `${allFiltered.length} players match the current filters. Totals include only ${roundName.toLowerCase()} games.`;
  document.querySelector("#postseason-head").innerHTML = `<tr><th>Player</th><th>Team</th>${config.metrics.map(([key, label]) => `<th><button type="button" data-sort="${key}" aria-sort="${sort.key === key ? (sort.direction === 1 ? "ascending" : "descending") : "none"}">${label}</button></th>`).join("")}</tr>`;
  document.querySelector("#postseason-body").innerHTML = visible.length ? visible.map(row => `
    <tr>
      <td><div class="player-cell-stack"><span class="player-link"><span class="avatar">${initials(row.player?.fullName)}</span><span>${escapeHtml(row.player?.fullName || "Unknown Player")}</span></span><div class="player-row-actions"><a href="${statlineUrl("career.html", row.player?.fullName)}">Career</a><a href="${statlineUrl("splits.html", row.player?.fullName)}">Splits</a></div></div></td>
      <td>${escapeHtml(row.team?.abbreviation || row.team?.teamName || "MLB")}</td>
      ${config.metrics.map(([key]) => `<td>${formatStat(key, row.stat?.[key])}</td>`).join("")}
    </tr>`).join("") : `<tr><td colspan="${config.metrics.length + 2}" class="empty-row">No players match these playoff filters.</td></tr>`;
  const leader = allFiltered[0];
  const highlight = document.querySelector("#postseason-highlight");
  if (leader) {
    const metricLabel = config.metrics.find(([key]) => key === sort.key)?.[1] || sort.key;
    highlight.innerHTML = `<div><p>${escapeHtml(metricLabel)} Leader</p><h3>${escapeHtml(leader.player?.fullName)}</h3><span>${escapeHtml(leader.team?.name || "MLB")} · ${escapeHtml(roundName)}</span></div><strong>${formatStat(sort.key, leader.stat?.[sort.key])}</strong>`;
    highlight.classList.add("is-visible");
  } else highlight.classList.remove("is-visible");
  document.querySelectorAll("[data-sort]").forEach(button => button.addEventListener("click", () => changeSort(button.dataset.sort)));
  syncUrl();
}

function changeSort(key) {
  if (sort.key === key) sort.direction *= -1;
  else sort = { key, direction: definitions[group].lowerBetter?.has(key) ? 1 : -1 };
  metric = key;
  document.querySelector("#postseason-metric").value = key;
  render();
}

function syncUrl() {
  const params = new URLSearchParams({ season: String(season), round, group, metric, min: String(minimum) });
  if (team !== "all") params.set("team", team);
  if (size === "all") params.set("size", "all");
  history.replaceState(null, "", `${location.pathname}?${params}`);
}

function bind() {
  document.querySelector("#postseason-year").addEventListener("change", event => { season = number(event.target.value); team = "all"; loadRows(); });
  document.querySelector("#postseason-round").addEventListener("change", event => { round = event.target.value; team = "all"; loadRows(); });
  document.querySelector("#postseason-group").addEventListener("change", event => { group = event.target.value; metric = definitions[group].defaultMetric; minimum = 0; team = "all"; configureGroup(); loadRows(); });
  document.querySelector("#postseason-team").addEventListener("change", event => { team = event.target.value; render(); });
  document.querySelector("#postseason-min").addEventListener("change", event => { minimum = number(event.target.value); render(); });
  document.querySelector("#postseason-metric").addEventListener("change", event => { metric = event.target.value; sort = { key: metric, direction: definitions[group].lowerBetter?.has(metric) ? 1 : -1 }; render(); });
  document.querySelector("#postseason-search").addEventListener("input", render);
  document.querySelectorAll("[data-postseason-size]").forEach(button => button.addEventListener("click", () => {
    size = button.dataset.postseasonSize;
    document.querySelectorAll("[data-postseason-size]").forEach(item => item.classList.toggle("active", item === button));
    render();
  }));
  document.querySelector("#postseason-copy-link").addEventListener("click", async () => {
    const status = document.querySelector("#postseason-copy-status");
    try { await navigator.clipboard.writeText(location.href); status.textContent = "Link copied"; }
    catch { status.textContent = "Copy the URL from your browser"; }
    setTimeout(() => { status.textContent = ""; }, 2200);
  });
}

populateYears();
document.querySelector("#postseason-round").value = round;
configureGroup();
document.querySelectorAll("[data-postseason-size]").forEach(button => button.classList.toggle("active", button.dataset.postseasonSize === size));
bind();
loadRows();
