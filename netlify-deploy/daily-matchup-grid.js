const MLB_API = "https://statsapi.mlb.com/api/v1";
const teamRows = [
  ["ARI", "Arizona Diamondbacks", 109], ["ATL", "Atlanta Braves", 144], ["BAL", "Baltimore Orioles", 110], ["BOS", "Boston Red Sox", 111], ["CHC", "Chicago Cubs", 112], ["CWS", "Chicago White Sox", 145],
  ["CIN", "Cincinnati Reds", 113], ["CLE", "Cleveland Guardians", 114], ["COL", "Colorado Rockies", 115], ["DET", "Detroit Tigers", 116], ["HOU", "Houston Astros", 117], ["KC", "Kansas City Royals", 118],
  ["LAA", "Los Angeles Angels", 108], ["LAD", "Los Angeles Dodgers", 119], ["MIA", "Miami Marlins", 146], ["MIL", "Milwaukee Brewers", 158], ["MIN", "Minnesota Twins", 142], ["NYM", "New York Mets", 121],
  ["NYY", "New York Yankees", 147], ["ATH", "Athletics", 133], ["PHI", "Philadelphia Phillies", 143], ["PIT", "Pittsburgh Pirates", 134], ["SD", "San Diego Padres", 135], ["SF", "San Francisco Giants", 137],
  ["SEA", "Seattle Mariners", 136], ["STL", "St. Louis Cardinals", 138], ["TB", "Tampa Bay Rays", 139], ["TEX", "Texas Rangers", 140], ["TOR", "Toronto Blue Jays", 141], ["WSH", "Washington Nationals", 120]
];
const teamById = new Map(teamRows.map(([abbr, name, id]) => [Number(id), { abbr, name, id }]));
const columns = [["hitter", "Hitter"], ["team", "Team"], ["pitcher", "Opposing SP"], ["pa", "PA"], ["ab", "AB"], ["h", "H"], ["hr", "HR"], ["bb", "BB"], ["so", "K"], ["avg", "AVG"], ["obp", "OBP"], ["slg", "SLG"], ["ops", "OPS"]];
let allRows = [];
let visibleRows = [];
let sortState = { key: "pa", dir: -1 };

function localDateValue(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function escapeHtml(value = "") { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
async function fetchJson(url) { const response = await fetch(url); if (!response.ok) throw new Error(`Request returned ${response.status}`); return response.json(); }
async function mapLimit(items, limit, task) {
  const results = new Array(items.length); let cursor = 0;
  async function worker() { while (cursor < items.length) { const index = cursor++; try { results[index] = await task(items[index], index); } catch (error) { results[index] = null; } } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker)); return results;
}

function matchupStat(data, batterId, pitcherId) {
  const entries = data.stats || [];
  const match = (split) => Number(split.batter?.id || batterId) === Number(batterId) && Number(split.pitcher?.id || pitcherId) === Number(pitcherId);
  const total = entries.find((entry) => entry.type?.displayName === "vsPlayerTotal")?.splits?.find(match)?.stat;
  if (total) return total;
  const details = entries.find((entry) => entry.type?.displayName === "vsPlayer")?.splits?.filter(match) || [];
  return details.at(-1)?.stat || {};
}

async function rosterHitters(team) {
  const season = document.querySelector("#grid-date").value.slice(0, 4);
  const params = new URLSearchParams({ rosterType: "active", season });
  const data = await fetchJson(`${MLB_API}/teams/${team.id}/roster?${params}`);
  return (data.roster || []).filter((row) => row.position?.abbreviation !== "P").map((row) => ({ id: row.person.id, hitter: row.person.fullName, position: row.position?.abbreviation || "", team: team.abbr, teamName: team.name }));
}

async function hitterMatchup(hitter, pitcher) {
  const params = new URLSearchParams({ stats: "vsPlayer", group: "hitting", opposingPlayerId: pitcher.id, sportId: 1 });
  const data = await fetchJson(`${MLB_API}/people/${hitter.id}/stats?${params}`);
  const stat = matchupStat(data, hitter.id, pitcher.id);
  return { ...hitter, pitcher: pitcher.fullName, pitcherId: pitcher.id, pa: Number(stat.plateAppearances || 0), ab: Number(stat.atBats || 0), h: Number(stat.hits || 0), hr: Number(stat.homeRuns || 0), bb: Number(stat.baseOnBalls || 0), so: Number(stat.strikeOuts || 0), avg: Number(stat.avg || 0), obp: Number(stat.obp || 0), slg: Number(stat.slg || 0), ops: Number(stat.ops || 0) };
}

function scheduleSides(games) {
  return games.flatMap((game) => {
    const away = teamById.get(Number(game.teams?.away?.team?.id)); const home = teamById.get(Number(game.teams?.home?.team?.id));
    const awayPitcher = game.teams?.away?.probablePitcher; const homePitcher = game.teams?.home?.probablePitcher;
    return [away && homePitcher ? { team: away, pitcher: homePitcher } : null, home && awayPitcher ? { team: home, pitcher: awayPitcher } : null].filter(Boolean);
  });
}

function myPlayerNames() { return document.querySelector("#grid-my-players").value.split(/[\n,;]+/).map((name) => name.trim().toLowerCase()).filter(Boolean); }
function isMyPlayer(row) { return myPlayerNames().some((name) => row.hitter.toLowerCase() === name || row.hitter.toLowerCase().includes(name)); }
function formatRate(value) { return Number(value) ? Number(value).toFixed(3).replace(/^0/, "") : "-"; }

function mergeImportedPlayers(names, source) {
  const textarea = document.querySelector("#grid-my-players");
  const current = textarea.value.split(/[\n,;]+/).map((name) => name.trim()).filter(Boolean);
  const byName = new Map(current.map((name) => [name.toLowerCase(), name]));
  names.forEach((name) => { if (String(name || "").trim()) byName.set(String(name).trim().toLowerCase(), String(name).trim()); });
  textarea.value = [...byName.values()].sort((a, b) => a.localeCompare(b)).join("\n");
  localStorage.setItem("statline-my-fantasy-players", textarea.value);
  document.querySelector("#grid-roster-view").value = "mine";
  document.querySelector("#fantasy-import-status").textContent = `Imported ${names.length} players from ${source}. Your combined list now has ${byName.size} players.`;
  applyFilters();
}

async function importEspnRoster() {
  const leagueId = document.querySelector("#espn-league-id").value.trim();
  const teamId = document.querySelector("#espn-team-id").value.trim();
  const season = document.querySelector("#espn-season").value.trim();
  const status = document.querySelector("#fantasy-import-status");
  if (!/^\d+$/.test(leagueId) || !/^\d+$/.test(teamId)) { status.textContent = "Enter the numeric ESPN league ID and team ID."; return; }
  status.textContent = "Importing the ESPN roster…";
  try {
    const params = new URLSearchParams({ leagueId, teamId, season });
    const data = await fetchJson(`/.netlify/functions/espn-fantasy-roster?${params}`);
    mergeImportedPlayers(data.players || [], `ESPN team ${data.teamName || teamId}`);
  } catch (error) { status.textContent = `ESPN import could not finish: ${error.message}. Confirm the IDs and that the league is public.`; }
}

async function importYahooRoster() {
  const teamKey = document.querySelector("#yahoo-team").value;
  const status = document.querySelector("#fantasy-import-status");
  if (!teamKey) { status.textContent = "Choose a Yahoo fantasy team first."; return; }
  status.textContent = "Importing the Yahoo roster…";
  try {
    const data = await fetchJson(`/.netlify/functions/yahoo-fantasy?action=roster&teamKey=${encodeURIComponent(teamKey)}`);
    mergeImportedPlayers(data.players || [], data.teamName || "Yahoo");
  } catch (error) { status.textContent = `Yahoo import could not finish: ${error.message}. Try reconnecting Yahoo.`; }
}

async function loadFantasyConnections() {
  const copy = document.querySelector("#yahoo-import-copy"); const connect = document.querySelector("#yahoo-connect");
  const importButton = document.querySelector("#yahoo-import"); const teamWrap = document.querySelector("#yahoo-team-wrap"); const teamSelect = document.querySelector("#yahoo-team");
  try {
    const config = await fetchJson("/.netlify/functions/fantasy-connections");
    if (!config.yahooConfigured) { copy.textContent = "Yahoo requires a read-only OAuth app connection. Site setup is ready; the Yahoo app credentials still need to be added."; return; }
    if (!config.yahooConnected) { copy.textContent = "Connect Yahoo with read-only access, then select the fantasy team you want on the grid."; connect.hidden = false; return; }
    copy.textContent = "Choose a connected Yahoo fantasy baseball team to import.";
    const data = await fetchJson("/.netlify/functions/yahoo-fantasy?action=teams");
    (data.teams || []).forEach((team) => { const option = document.createElement("option"); option.value = team.key; option.textContent = team.name; teamSelect.append(option); });
    teamWrap.hidden = false; importButton.hidden = false;
  } catch (error) { copy.textContent = "Yahoo connection is temporarily unavailable. You can still paste player names above."; }
}

function populateFilters(rows) {
  const team = document.querySelector("#grid-team"); const pitcher = document.querySelector("#grid-pitcher");
  const selectedTeam = team.value; const selectedPitcher = pitcher.value;
  const teams = [...new Map(rows.map((row) => [row.team, row.teamName])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const pitchers = [...new Map(rows.map((row) => [String(row.pitcherId), row.pitcher])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  team.innerHTML = `<option value="all">All teams</option>${teams.map(([abbr, name]) => `<option value="${abbr}">${escapeHtml(name)}</option>`).join("")}`;
  pitcher.innerHTML = `<option value="all">All pitchers</option>${pitchers.map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`).join("")}`;
  if ([...team.options].some((option) => option.value === selectedTeam)) team.value = selectedTeam;
  if ([...pitcher.options].some((option) => option.value === selectedPitcher)) pitcher.value = selectedPitcher;
}

function applyFilters() {
  const team = document.querySelector("#grid-team").value; const pitcher = document.querySelector("#grid-pitcher").value;
  const history = document.querySelector("#grid-history").value; const rosterView = document.querySelector("#grid-roster-view").value;
  const search = document.querySelector("#grid-search").value.trim().toLowerCase();
  visibleRows = allRows.filter((row) => {
    if (team !== "all" && row.team !== team) return false;
    if (pitcher !== "all" && String(row.pitcherId) !== pitcher) return false;
    if (history === "history" && !row.pa) return false; if (history === "none" && row.pa) return false;
    if (rosterView === "mine" && !isMyPlayer(row)) return false;
    return !search || `${row.hitter} ${row.teamName} ${row.team} ${row.pitcher}`.toLowerCase().includes(search);
  });
  const { key, dir } = sortState;
  visibleRows.sort((a, b) => typeof a[key] === "string" ? dir * a[key].localeCompare(b[key]) : dir * (Number(a[key]) - Number(b[key])));
  renderTable();
}

function renderTable() {
  document.querySelector("#grid-head").innerHTML = `<tr>${columns.map(([key, label]) => `<th><button type="button" data-sort="${key}">${label}${sortState.key === key ? (sortState.dir > 0 ? " ↑" : " ↓") : ""}</button></th>`).join("")}</tr>`;
  document.querySelector("#grid-body").innerHTML = visibleRows.length ? visibleRows.map((row) => `<tr class="${isMyPlayer(row) ? "my-player-row" : ""}"><td><strong>${escapeHtml(row.hitter)}</strong><small class="fantasy-note-cell">${escapeHtml(row.position)}</small></td><td>${escapeHtml(row.team)}</td><td>${escapeHtml(row.pitcher)}</td><td class="${row.pa ? "" : "no-history"}">${row.pa || "-"}</td><td>${row.ab || "-"}</td><td>${row.h || "-"}</td><td>${row.hr || "-"}</td><td>${row.bb || "-"}</td><td>${row.so || "-"}</td><td>${formatRate(row.avg)}</td><td>${formatRate(row.obp)}</td><td>${formatRate(row.slg)}</td><td>${formatRate(row.ops)}</td></tr>`).join("") : `<tr><td colspan="13">No hitters match these filters.</td></tr>`;
  document.querySelector("#grid-title").textContent = `${visibleRows.length} of ${allRows.length} active hitters`;
  document.querySelectorAll("[data-sort]").forEach((button) => button.addEventListener("click", () => { const key = button.dataset.sort; sortState = { key, dir: sortState.key === key ? -sortState.dir : (typeof allRows[0]?.[key] === "string" ? 1 : -1) }; applyFilters(); }));
}

function csvValue(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function exportCsv() {
  const lines = [columns.map(([, label]) => label), ...visibleRows.map((row) => columns.map(([key]) => row[key] ?? ""))].map((line) => line.map(csvValue).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }); const link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = `statline-daily-matchups-${document.querySelector("#grid-date").value}.csv`; link.click(); URL.revokeObjectURL(link.href);
}

async function loadGrid() {
  const date = document.querySelector("#grid-date").value; const status = document.querySelector("#grid-status"); const cacheKey = `statline-daily-grid:${date}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) { allRows = JSON.parse(cached); populateFilters(allRows); applyFilters(); status.textContent = `Loaded ${allRows.length} hitters from this session's cache.`; return; }
  allRows = []; applyFilters(); status.textContent = "Loading today's schedule and probable starters…";
  try {
    const schedule = await fetchJson(`${MLB_API}/schedule?${new URLSearchParams({ sportId: 1, date, hydrate: "probablePitcher" })}`);
    const games = schedule.dates?.[0]?.games || []; const sides = scheduleSides(games);
    status.textContent = `Found ${games.length} games and ${sides.length} confirmed offensive matchups. Loading active rosters…`;
    const rosters = (await mapLimit(sides, 5, async (side) => ({ ...side, hitters: await rosterHitters(side.team) }))).filter(Boolean);
    const jobs = rosters.flatMap((side) => side.hitters.map((hitter) => ({ hitter, pitcher: side.pitcher }))); let completed = 0;
    const rows = await mapLimit(jobs, 8, async (job) => { const row = await hitterMatchup(job.hitter, job.pitcher); completed += 1; if (completed % 10 === 0 || completed === jobs.length) status.textContent = `Loaded ${completed} of ${jobs.length} hitter matchups…`; return row; });
    allRows = rows.filter(Boolean); sessionStorage.setItem(cacheKey, JSON.stringify(allRows)); populateFilters(allRows); applyFilters();
    const missing = games.length * 2 - sides.length;
    status.textContent = `Loaded ${allRows.length} active hitters across ${sides.length} offensive matchups.${missing > 0 ? ` ${missing} side${missing === 1 ? " is" : "s are"} still awaiting a probable starter.` : ""}`;
  } catch (error) { status.textContent = `The grid could not load: ${error.message}. Please try again.`; }
}

document.querySelector("#grid-date").value = localDateValue();
document.querySelector("#espn-season").value = document.querySelector("#grid-date").value.slice(0, 4);
document.querySelector("#grid-my-players").value = localStorage.getItem("statline-my-fantasy-players") || "";
document.querySelector("#grid-load").addEventListener("click", loadGrid); document.querySelector("#grid-export").addEventListener("click", exportCsv);
document.querySelector("#espn-import").addEventListener("click", importEspnRoster); document.querySelector("#yahoo-import").addEventListener("click", importYahooRoster);
document.querySelector("#grid-save-players").addEventListener("click", () => { localStorage.setItem("statline-my-fantasy-players", document.querySelector("#grid-my-players").value); document.querySelector("#grid-status").textContent = "Your player list is saved in this browser."; applyFilters(); });
["grid-team", "grid-pitcher", "grid-history", "grid-roster-view"].forEach((id) => document.querySelector(`#${id}`).addEventListener("change", applyFilters));
document.querySelector("#grid-search").addEventListener("input", applyFilters); document.querySelector("#grid-date").addEventListener("change", loadGrid);
renderTable(); loadGrid(); loadFantasyConnections();
