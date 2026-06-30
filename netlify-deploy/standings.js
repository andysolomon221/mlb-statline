const leagueIds = { al: "103", nl: "104" };
const leagueNames = { 103: "American League", 104: "National League" };
const divisionNames = {
  200: "AL West",
  201: "AL East",
  202: "AL Central",
  203: "NL West",
  204: "NL East",
  205: "NL Central"
};
const divisionOrder = ["AL East", "AL Central", "AL West", "NL East", "NL Central", "NL West"];
const leagueOrder = ["American League", "National League"];
const teamAbbr = {
  "Angels": "LAA",
  "Astros": "HOU",
  "Athletics": "ATH",
  "Blue Jays": "TOR",
  "Braves": "ATL",
  "Brewers": "MIL",
  "Cardinals": "STL",
  "Cubs": "CHC",
  "Diamondbacks": "ARI",
  "D-backs": "ARI",
  "Dodgers": "LAD",
  "Giants": "SF",
  "Guardians": "CLE",
  "Mariners": "SEA",
  "Marlins": "MIA",
  "Mets": "NYM",
  "Nationals": "WSH",
  "Orioles": "BAL",
  "Padres": "SD",
  "Phillies": "PHI",
  "Pirates": "PIT",
  "Rangers": "TEX",
  "Rays": "TB",
  "Red Sox": "BOS",
  "Reds": "CIN",
  "Rockies": "COL",
  "Royals": "KC",
  "Tigers": "DET",
  "Twins": "MIN",
  "White Sox": "CWS",
  "Yankees": "NYY"
};

const state = {
  date: todayString(),
  view: "division",
  league: "all",
  rows: []
};
const standingsCache = new Map();

const dateInput = document.querySelector("#standings-date");
const todayButton = document.querySelector("#standings-today");
const title = document.querySelector("#standings-title");
const statusText = document.querySelector("#standings-status");
const grid = document.querySelector("#standings-grid");
const copyButton = document.querySelector("#copy-standings-link");
const copyStatus = document.querySelector("#standings-copy-status");

function todayString() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function prettyDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value || "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
}

function toNumber(value) {
  if (value === undefined || value === null || value === "-" || value === "") return 0;
  const numeric = Number(String(value).replace("%", ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function pctValue(row) {
  return toNumber(row.pct || row.winningPercentage || row.leagueRecord?.pct);
}

function normalizeTeamName(name) {
  return name === "Diamondbacks" ? "D-backs" : name;
}

function abbreviationFor(name) {
  const clean = normalizeTeamName(name);
  return teamAbbr[clean] || clean.split(" ").map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

function splitRecord(record, type) {
  const row = record.records?.splitRecords?.find((item) => item.type === type);
  if (!row) return "-";
  return `${row.wins}-${row.losses}`;
}

function normalizeRow(record, group) {
  const name = normalizeTeamName(record.team?.name || "Unknown");
  const wins = Number(record.wins) || Number(record.leagueRecord?.wins) || 0;
  const losses = Number(record.losses) || Number(record.leagueRecord?.losses) || 0;
  const pct = record.winningPercentage || record.leagueRecord?.pct || (wins + losses ? (wins / (wins + losses)).toFixed(3).replace(/^0/, "") : ".000");
  return {
    id: record.team?.id || name,
    name,
    abbr: abbreviationFor(name),
    wins,
    losses,
    pct,
    leagueId: group.league?.id,
    leagueName: leagueNames[group.league?.id] || "League",
    divisionId: group.division?.id,
    divisionName: divisionNames[group.division?.id] || group.division?.name || "Division",
    divisionRank: Number(record.divisionRank) || 99,
    leagueRank: Number(record.leagueRank) || 99,
    wildCardRank: Number(record.wildCardRank) || 99,
    gamesBack: record.gamesBack || record.divisionGamesBack || "-",
    wildCardGamesBack: record.wildCardGamesBack || "-",
    lastTen: splitRecord(record, "lastTen"),
    streak: record.streak?.streakCode || "-",
    runsScored: Number(record.runsScored) || 0,
    runsAllowed: Number(record.runsAllowed) || 0,
    diff: Number(record.runDifferential) || ((Number(record.runsScored) || 0) - (Number(record.runsAllowed) || 0))
  };
}

function standingsUrl() {
  const season = state.date.slice(0, 4);
  const params = new URLSearchParams({
    leagueId: state.league === "all" ? "103,104" : leagueIds[state.league],
    season,
    standingsTypes: "regularSeason",
    date: state.date
  });
  return `https://statsapi.mlb.com/api/v1/standings?${params.toString()}`;
}

async function fetchStandings() {
  const cacheKey = `${state.league}:${state.date}`;
  if (standingsCache.has(cacheKey)) return standingsCache.get(cacheKey);
  const response = await fetch(standingsUrl());
  if (!response.ok) throw new Error(`MLB standings returned ${response.status}`);
  const data = await response.json();
  const rows = (data.records || []).flatMap((group) => (group.teamRecords || []).map((record) => normalizeRow(record, group)));
  standingsCache.set(cacheKey, rows);
  return rows;
}

function setActiveButtons() {
  document.querySelectorAll("[data-standings-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.standingsView === state.view);
  });
  document.querySelectorAll("[data-standings-league]").forEach((button) => {
    button.classList.toggle("active", button.dataset.standingsLeague === state.league);
  });
}

function syncUrl() {
  const params = new URLSearchParams();
  params.set("date", state.date);
  params.set("view", state.view);
  params.set("league", state.league);
  history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
}

function loadParams() {
  const params = new URLSearchParams(location.search);
  const date = params.get("date");
  const view = params.get("view");
  const league = params.get("league");
  if (/^\d{4}-\d{2}-\d{2}$/.test(date || "")) state.date = date;
  if (view === "division" || view === "wildcard") state.view = view;
  if (league === "all" || league === "al" || league === "nl") state.league = league;
  dateInput.value = state.date;
  dateInput.max = todayString();
  setActiveButtons();
}

function updateSummary(rows) {
  document.querySelector("#standings-date-card").textContent = prettyDate(state.date);
  document.querySelector("#standings-team-count").textContent = rows.length || "-";
  const best = [...rows].sort((a, b) => pctValue(b) - pctValue(a) || b.wins - a.wins)[0];
  document.querySelector("#standings-best-record").textContent = best ? best.abbr : "-";
  document.querySelector("#standings-best-record-note").textContent = best ? `${best.wins}-${best.losses} (${best.pct})` : "-";

  const byDivision = groupBy(rows, "divisionName");
  let tightest = null;
  Object.entries(byDivision).forEach(([division, divisionRows]) => {
    const sorted = divisionRows.sort((a, b) => a.divisionRank - b.divisionRank);
    const second = sorted[1];
    if (!second) return;
    const gap = second.gamesBack === "-" ? 0 : toNumber(second.gamesBack);
    if (!tightest || gap < tightest.gap) tightest = { division, gap, team: second.abbr };
  });
  document.querySelector("#standings-tightest-race").textContent = tightest ? tightest.division : "-";
  document.querySelector("#standings-tightest-race-note").textContent = tightest ? `${tightest.team} ${tightest.gap} GB` : "-";
}

function groupBy(rows, key) {
  return rows.reduce((groups, row) => {
    const value = row[key] || "Other";
    if (!groups[value]) groups[value] = [];
    groups[value].push(row);
    return groups;
  }, {});
}

function tableMarkup(rows, mode) {
  const gamesBackHeader = mode === "wildcard" ? "WC GB" : "GB";
  return `
    <div class="table-wrap standings-table-wrap">
      <table class="standings-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>W</th>
            <th>L</th>
            <th>Pct</th>
            <th>${gamesBackHeader}</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, index) => `
            <tr class="${mode === "wildcard" && index === 2 ? "standings-cutline" : ""}">
              <td>
                <span class="standings-team">
                  <span class="standings-rank">${index + 1}</span>
                  <span class="club-badge standings-badge">${row.abbr}</span>
                  <strong>${row.name}</strong>
                </span>
              </td>
              <td>${row.wins}</td>
              <td>${row.losses}</td>
              <td>${row.pct}</td>
              <td>${mode === "wildcard" ? row.wildCardGamesBack : row.gamesBack}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderDivision(rows) {
  const byDivision = groupBy(rows, "divisionName");
  const byLeague = groupBy(rows, "leagueName");
  const sections = leagueOrder.filter((league) => byLeague[league]).map((league) => {
    const leagueDivisions = divisionOrder
      .filter((division) => byDivision[division]?.[0]?.leagueName === league)
      .map((division) => {
        const divisionRows = byDivision[division].sort((a, b) => a.divisionRank - b.divisionRank || pctValue(b) - pctValue(a));
        return `
          <article class="panel standings-card">
            <div class="section-head">
              <div>
                <p class="eyebrow">${league}</p>
                <h2>${division}</h2>
              </div>
            </div>
            ${tableMarkup(divisionRows, "division")}
          </article>
        `;
      }).join("");

    return `
      <section class="standings-league-column" aria-label="${league}">
        <div class="standings-league-heading">
          <p class="eyebrow">League</p>
          <h2>${league}</h2>
        </div>
        ${leagueDivisions}
      </section>
    `;
  });
  grid.classList.toggle("standings-grid-single", state.league !== "all");
  grid.innerHTML = sections.join("") || `<div class="panel empty-state">No standings found for this date.</div>`;
}

function renderWildCard(rows) {
  grid.classList.remove("standings-grid-single");
  const divisionLeaders = new Set(rows.filter((row) => row.divisionRank === 1).map((row) => row.id));
  const byLeague = groupBy(rows, "leagueName");
  const sections = Object.entries(byLeague).map(([league, leagueRows]) => {
    const leaders = leagueRows.filter((row) => divisionLeaders.has(row.id)).sort((a, b) => a.leagueRank - b.leagueRank);
    const wildCardRows = leagueRows
      .filter((row) => !divisionLeaders.has(row.id))
      .sort((a, b) => a.wildCardRank - b.wildCardRank || pctValue(b) - pctValue(a));
    return `
      <article class="panel standings-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Wild Card</p>
            <h2>${league}</h2>
            <small class="data-note">Division leaders: ${leaders.map((row) => `${row.abbr} ${row.wins}-${row.losses}`).join(" · ") || "-"}</small>
          </div>
        </div>
        ${tableMarkup(wildCardRows, "wildcard")}
      </article>
    `;
  });
  grid.innerHTML = sections.join("") || `<div class="panel empty-state">No Wild Card standings found for this date.</div>`;
}

async function renderStandings() {
  statusText.textContent = "Loading MLB standings...";
  grid.innerHTML = `<div class="panel empty-state">Loading standings...</div>`;
  setActiveButtons();
  syncUrl();
  try {
    state.rows = await fetchStandings();
    updateSummary(state.rows);
    title.textContent = state.view === "wildcard" ? "Wild Card standings" : "Division standings";
    statusText.textContent = `${state.rows.length} teams loaded for ${prettyDate(state.date)}.`;
    if (state.view === "wildcard") renderWildCard(state.rows);
    else renderDivision(state.rows);
  } catch (error) {
    console.error(error);
    statusText.textContent = "Could not load MLB standings.";
    grid.innerHTML = `<div class="panel empty-state">Could not load MLB standings. Try another date.</div>`;
  }
}

function setupEvents() {
  dateInput.addEventListener("change", () => {
    state.date = dateInput.value || todayString();
    renderStandings();
  });
  todayButton.addEventListener("click", () => {
    state.date = todayString();
    dateInput.value = state.date;
    renderStandings();
  });
  document.querySelectorAll("[data-standings-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.standingsView;
      renderStandings();
    });
  });
  document.querySelectorAll("[data-standings-league]").forEach((button) => {
    button.addEventListener("click", () => {
      state.league = button.dataset.standingsLeague;
      renderStandings();
    });
  });
  copyButton.addEventListener("click", async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      copyStatus.textContent = "Copied";
    } catch (error) {
      copyStatus.textContent = "Copy failed";
    }
    setTimeout(() => { copyStatus.textContent = ""; }, 2200);
  });
}

loadParams();
setupEvents();
renderStandings();
