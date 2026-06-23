const spanFirstSeason = 1901;
const spanLastSeason = 2026;
const spanNumberFormat = new Intl.NumberFormat("en-US");

let activeSpanGroup = "hitting";
let activeSpanStat = "homeRuns";
let activeSpanSeason = spanLastSeason;
let activeSpanLength = 5;
let activeSpanMinimum = 0;
let activeSpanRequestId = 0;
let activeSpanSuggestId = 0;
let spanSuggestTimer = null;

const spanMetrics = {
  hitting: [
    ["homeRuns", "HR"],
    ["hits", "Hits"],
    ["rbi", "RBI"],
    ["stolenBases", "SB"],
    ["strikeOuts", "SO"],
    ["totalBases", "TB"],
    ["runs", "Runs"]
  ],
  pitching: [
    ["strikeOuts", "SO"],
    ["inningsPitched", "IP"],
    ["earnedRuns", "ER"],
    ["hits", "H Allowed"],
    ["baseOnBalls", "BB"],
    ["homeRuns", "HR Allowed"],
    ["saves", "Saves"]
  ]
};

const spanExamples = {
  "schwarber-hr": {
    group: "hitting",
    player: "Kyle Schwarber",
    stat: "homeRuns",
    length: 5,
    minimum: 5
  },
  "judge-hr": {
    group: "hitting",
    player: "Aaron Judge",
    stat: "homeRuns",
    length: 10,
    minimum: 4
  },
  "misiorowski-so": {
    group: "pitching",
    player: "Jacob Misiorowski",
    stat: "strikeOuts",
    length: 3,
    minimum: 20
  },
  "sale-so": {
    group: "pitching",
    player: "Chris Sale",
    stat: "strikeOuts",
    length: 3,
    minimum: 20
  }
};

function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanPlayerQuery(value) {
  return cleanText(value).replace(/\s+-\s+(P|C|1B|2B|3B|SS|LF|CF|RF|OF|DH|IF)\b.*$/i, "");
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

function statLabel() {
  return spanMetrics[activeSpanGroup].find(([value]) => value === activeSpanStat)?.[1] || activeSpanStat.toUpperCase();
}

function statValue(row, key = activeSpanStat) {
  if (key === "inningsPitched") return inningsToOuts(row.stat?.inningsPitched);
  return toNumber(row.stat?.[key]);
}

function displayStat(value, key = activeSpanStat) {
  if (key === "inningsPitched") return outsToInnings(value);
  return spanNumberFormat.format(Math.round(value));
}

function dateLabel(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}/${year}`;
}

function populateSpanControls() {
  $("#span-season").innerHTML = Array.from({ length: spanLastSeason - spanFirstSeason + 1 }, (_, index) => {
    const year = spanLastSeason - index;
    return `<option value="${year}">${year}</option>`;
  }).join("");
  $("#span-season").value = activeSpanSeason;
  $("#span-length").innerHTML = Array.from({ length: 30 }, (_, index) => {
    const value = index + 1;
    return `<option value="${value}">${value} game${value === 1 ? "" : "s"}</option>`;
  }).join("");
  $("#span-length").value = activeSpanLength;
  updateSpanMetricControls();
}

function updateSpanMetricControls() {
  $("#span-stat").innerHTML = spanMetrics[activeSpanGroup].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  if (!spanMetrics[activeSpanGroup].some(([value]) => value === activeSpanStat)) {
    activeSpanStat = spanMetrics[activeSpanGroup][0][0];
  }
  $("#span-stat").value = activeSpanStat;
}

function readSpanControls() {
  activeSpanGroup = $("#span-group").value;
  activeSpanStat = $("#span-stat").value;
  activeSpanSeason = Number($("#span-season").value);
  activeSpanLength = Number($("#span-length").value);
  activeSpanMinimum = Math.max(0, Number($("#span-min").value) || 0);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function findPlayer(query) {
  const clean = cleanPlayerQuery(query);
  const data = await fetchJson(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(clean)}`);
  const people = data.people || [];
  const cleanQuery = clean.toLowerCase();
  return people.find((person) => person.fullName?.toLowerCase() === cleanQuery) || people[0] || null;
}

async function suggestSpanPlayers() {
  const input = $("#span-player");
  const datalist = $("#span-player-options");
  const query = cleanPlayerQuery(input.value);
  if (!datalist || query.length < 2) {
    if (datalist) datalist.innerHTML = "";
    return;
  }

  const requestId = ++activeSpanSuggestId;
  try {
    const data = await fetchJson(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(query)}`);
    if (requestId !== activeSpanSuggestId) return;
    const seen = new Set();
    datalist.innerHTML = (data.people || []).slice(0, 12).map((person) => {
      const position = person.primaryPosition?.abbreviation || "MLB";
      const debut = person.mlbDebutDate ? `MLB debut ${person.mlbDebutDate.slice(0, 4)}` : "no MLB debut listed";
      const value = `${person.fullName} - ${position} - ${debut}`;
      if (seen.has(value)) return "";
      seen.add(value);
      return `<option value="${escapeHtml(value)}"></option>`;
    }).join("");
  } catch (error) {
    console.warn("Could not load span player suggestions", error);
  }
}

async function loadGameLog(playerId) {
  const params = new URLSearchParams({
    stats: "gameLog",
    group: activeSpanGroup,
    season: String(activeSpanSeason),
    sportId: "1"
  });
  const data = await fetchJson(`https://statsapi.mlb.com/api/v1/people/${playerId}/stats?${params.toString()}`);
  return data.stats?.[0]?.splits || [];
}

function makeSpans(games, player) {
  const sorted = [...games]
    .filter((game) => game.gameType === "R")
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const spans = [];
  if (sorted.length < activeSpanLength) return spans;

  for (let start = 0; start <= sorted.length - activeSpanLength; start += 1) {
    const windowGames = sorted.slice(start, start + activeSpanLength);
    const total = windowGames.reduce((sum, game) => sum + statValue(game), 0);
    if (activeSpanMinimum && total < activeSpanMinimum) continue;
    const teamSet = [...new Set(windowGames.map((game) => game.team?.abbreviation || game.team?.name || "-"))];
    spans.push({
      player: player.fullName,
      team: teamSet.join("/"),
      startDate: windowGames[0]?.date,
      endDate: windowGames.at(-1)?.date,
      games: windowGames.length,
      total,
      detail: windowGames.map((game) => `${dateLabel(game.date)}: ${displayStat(statValue(game))}`).join(" | ")
    });
  }
  return spans.sort((a, b) => b.total - a.total || String(a.startDate).localeCompare(String(b.startDate)));
}

function renderSpanTable(spans) {
  $("#span-head").innerHTML = `
    <tr>
      <th>Rk</th>
      <th>Player</th>
      <th>Team</th>
      <th>Span Started</th>
      <th>Span Ended</th>
      <th>Games</th>
      <th>${escapeHtml(statLabel())}</th>
      <th>Game By Game</th>
    </tr>
  `;
  $("#span-table").innerHTML = spans.slice(0, 50).map((span, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(span.player)}</strong></td>
      <td>${escapeHtml(span.team)}</td>
      <td>${escapeHtml(dateLabel(span.startDate))}</td>
      <td>${escapeHtml(dateLabel(span.endDate))}</td>
      <td>${span.games}</td>
      <td><strong>${escapeHtml(displayStat(span.total))}</strong></td>
      <td>${escapeHtml(span.detail)}</td>
    </tr>
  `).join("") || `<tr><td colspan="8">No spans matched this filter.</td></tr>`;
}

function updateSummary(player, spans, rawGameCount) {
  const playerName = player?.fullName || cleanText($("#span-player").value) || "Player";
  const minimumText = activeSpanMinimum ? ` with at least ${displayStat(activeSpanMinimum)} ${statLabel()}` : "";
  $("#span-question").textContent = `${playerName} ${activeSpanLength}-game ${statLabel()} spans`;
  $("#span-question-note").textContent = `${activeSpanSeason}${minimumText}`;
  $("#span-count").textContent = spanNumberFormat.format(spans.length);
  $("#span-count-note").textContent = `${rawGameCount} game logs checked`;
  const best = spans[0];
  $("#span-leader").textContent = best ? displayStat(best.total) : "--";
  $("#span-leader-note").textContent = best ? `${dateLabel(best.startDate)}-${dateLabel(best.endDate)}` : "No matching span";
}

async function runSpanSearch() {
  readSpanControls();
  const requestId = ++activeSpanRequestId;
  const playerQuery = cleanPlayerQuery($("#span-player").value);
  if (!playerQuery) {
    $("#span-status").textContent = "Type a player name first.";
    return;
  }
  $("#span-progress").textContent = "Loading";
  $("#span-progress-note").textContent = "Fetching player game logs";
  $("#span-status").textContent = "Looking up player...";

  try {
    const player = await findPlayer(playerQuery);
    if (requestId !== activeSpanRequestId) return;
    if (!player) {
      $("#span-status").textContent = "No player found. Try the full name.";
      $("#span-progress").textContent = "No match";
      return;
    }
    $("#span-player").value = player.fullName;
    $("#span-status").textContent = `Loading ${player.fullName}'s ${activeSpanSeason} game log...`;
    const games = await loadGameLog(player.id);
    if (requestId !== activeSpanRequestId) return;
    const spans = makeSpans(games, player);
    updateSummary(player, spans, games.length);
    renderSpanTable(spans);
    $("#span-table-title").textContent = `${player.fullName}: best ${activeSpanLength}-game ${statLabel()} spans`;
    $("#span-status").textContent = `Showing top ${Math.min(50, spans.length)} of ${spanNumberFormat.format(spans.length)} spans.`;
    $("#span-progress").textContent = "Done";
    $("#span-progress-note").textContent = "MLB Stats API game logs";
  } catch (error) {
    console.error(error);
    $("#span-progress").textContent = "Error";
    $("#span-progress-note").textContent = "Try again in a moment";
    $("#span-status").textContent = "The span search did not load.";
  }
}

function applySpanExample(name) {
  const example = spanExamples[name];
  if (!example) return;
  activeSpanGroup = example.group;
  activeSpanStat = example.stat;
  activeSpanLength = example.length;
  $("#span-group").value = activeSpanGroup;
  updateSpanMetricControls();
  $("#span-stat").value = activeSpanStat;
  $("#span-player").value = example.player;
  $("#span-length").value = activeSpanLength;
  $("#span-min").value = example.minimum;
  runSpanSearch();
}

function bindSpanFinder() {
  populateSpanControls();
  $("#span-run").addEventListener("click", runSpanSearch);
  $("#span-player").addEventListener("input", () => {
    clearTimeout(spanSuggestTimer);
    spanSuggestTimer = setTimeout(suggestSpanPlayers, 180);
  });
  $("#span-player").addEventListener("change", () => {
    $("#span-player").value = cleanPlayerQuery($("#span-player").value);
  });
  $("#span-player").addEventListener("keydown", (event) => {
    if (event.key === "Enter") runSpanSearch();
  });
  $("#span-group").addEventListener("change", () => {
    activeSpanGroup = $("#span-group").value;
    updateSpanMetricControls();
  });
  document.querySelectorAll("[data-span-example]").forEach((button) => {
    button.addEventListener("click", () => applySpanExample(button.dataset.spanExample));
  });
  applySpanExample("schwarber-hr");
}

bindSpanFinder();
