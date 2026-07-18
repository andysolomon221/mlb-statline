const initialParams = new URLSearchParams(window.location.search);
const DAMAGE_BOARD_DATA_VERSION = "20260718-expanded-player-pool";
const requestedTopLimit = initialParams.get("limit") || "10";
const requestedMode = initialParams.get("mode") === "pitcher" ? "pitcher" : "hitter";
const pvpState = {
  mode: requestedMode,
  players: [],
  activePlayerId: initialParams.get("player") || (requestedMode === "pitcher" ? "martp001" : "bondb001"),
  activeSort: initialParams.get("sort") || (requestedMode === "pitcher" ? "so" : "hr"),
  minPa: Number(initialParams.get("minPa")) || 0,
  limit: requestedTopLimit,
  bottomLimit: initialParams.get("bottom") || requestedTopLimit,
  data: null
};

let pvpCopyTimer;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function num(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function fmtNumber(value) {
  return Math.round(num(value)).toLocaleString("en-US");
}

function fmtRate(value) {
  return num(value).toFixed(3).replace(/^0/, "");
}

function activePlayer() {
  return pvpState.players.find((player) => player.id === pvpState.activePlayerId) || pvpState.players[0];
}

function modeConfig() {
  if (pvpState.mode === "pitcher") {
    return {
      indexPath: "data/pitcher-vs-hitters/index.json",
      dataPath: "data/pitcher-vs-hitters",
      defaultId: "martp001",
      defaultSort: "so",
      selectedLabel: "Selected Pitcher",
      opponentSingular: "hitter",
      opponentPlural: "hitters",
      opponentTitle: "Hitters",
      opponentEyebrow: "Opponent Hitters",
      listEyebrow: "Hitter List",
      facedLabel: "Batters Faced",
      totalLabel: "Strikeouts",
      totalNote: "Against all opposing hitters",
      summaryKey: "strikeouts",
      facedKey: "battersFaced",
      rowNameKey: "batter",
      rowIdKey: "batterId",
      intro: "Build a shareable top board, then scan the full hitter list below"
    };
  }
  return {
    indexPath: "data/player-vs-pitchers/index.json",
    dataPath: "data/player-vs-pitchers",
    defaultId: "bondb001",
    defaultSort: "hr",
    selectedLabel: "Selected Hitter",
    opponentSingular: "pitcher",
    opponentPlural: "pitchers",
    opponentTitle: "Pitchers",
    opponentEyebrow: "Opponent Pitchers",
    listEyebrow: "Pitcher List",
    facedLabel: "Pitchers Faced",
    totalLabel: "Total HR",
    totalNote: "Against all opposing pitchers",
    summaryKey: "homeRuns",
    facedKey: "pitchersFaced",
    rowNameKey: "pitcher",
    rowIdKey: "pitcherId",
    intro: "Build a shareable top board, then scan the full pitcher list below"
  };
}

function rowName(row) {
  return row[modeConfig().rowNameKey] || row.name || row[modeConfig().rowIdKey] || "--";
}

function careerUrl(name, group) {
  const params = new URLSearchParams();
  params.set("player", name);
  params.set("group", group);
  return `career.html?${params.toString()}`;
}

function careerLink(name, group) {
  return `<a class="summary-link" href="${escapeHtml(careerUrl(name, group))}">${escapeHtml(name)}</a>`;
}

function selectedCareerGroup() {
  return pvpState.mode === "pitcher" ? "pitching" : "hitting";
}

function opponentCareerGroup() {
  return pvpState.mode === "pitcher" ? "hitting" : "pitching";
}

async function fetchJson(url) {
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}v=${DAMAGE_BOARD_DATA_VERSION}`);
  if (!response.ok) throw new Error(`Request returned ${response.status}`);
  return response.json();
}

function sortRows(rows) {
  const sort = pvpState.activeSort;
  const tieBreakers = ["hr", "pa", "h"];
  return rows.slice().sort((a, b) => {
    const primary = num(b[sort]) - num(a[sort]);
    if (primary) return primary;
    for (const key of tieBreakers) {
      const diff = num(b[key]) - num(a[key]);
      if (diff) return diff;
    }
    return String(rowName(a)).localeCompare(String(rowName(b)));
  });
}

function filteredRows() {
  return sortRows((pvpState.data?.rows || []).filter((row) => num(row.pa) >= pvpState.minPa));
}

function leaderboardRows() {
  const filtered = filteredRows();
  if (pvpState.limit === "all") return filtered;
  return filtered.slice(0, Math.max(1, Number(pvpState.limit) || 20));
}

function bottomRows() {
  const filtered = filteredRows();
  if (pvpState.bottomLimit === "hidden") return [];
  if (pvpState.bottomLimit === "all") return filtered;
  return filtered.slice(0, Math.max(1, Number(pvpState.bottomLimit) || 20));
}

function filteredRowCount() {
  return (pvpState.data?.rows || []).filter((row) => num(row.pa) >= pvpState.minPa).length;
}

function statLabel(key = pvpState.activeSort) {
  return {
    hr: "HR",
    h: "H",
    rbi: "RBI",
    bb: "BB",
    so: "SO",
    ops: "OPS",
    avg: "AVG",
    ab: "AB",
    pa: "PA"
  }[key] || key.toUpperCase();
}

function sumRows(key) {
  return (pvpState.data?.rows || []).reduce((total, row) => total + num(row[key]), 0);
}

function summaryMetric() {
  const summary = pvpState.data?.summary || {};
  const sort = pvpState.activeSort;
  if (pvpState.mode === "pitcher") {
    const pitcherMetrics = {
      hr: ["HR Allowed", summary.homeRunsAllowed],
      h: ["Hits Allowed", summary.hitsAllowed],
      bb: ["Walks", summary.walks],
      so: ["Strikeouts", summary.strikeouts],
      pa: ["Plate Appearances", summary.plateAppearances],
      ab: ["At-Bats", sumRows("ab")],
      rbi: ["RBI Allowed", sumRows("rbi")]
    };
    return pitcherMetrics[sort] || pitcherMetrics.so;
  }
  const hitterMetrics = {
    hr: ["Total HR", summary.homeRuns],
    h: ["Hits", summary.hits],
    bb: ["Walks", summary.walks],
    so: ["Strikeouts", sumRows("so")],
    pa: ["Plate Appearances", summary.plateAppearances],
    ab: ["At-Bats", sumRows("ab")],
    rbi: ["RBI", sumRows("rbi")]
  };
  return hitterMetrics[sort] || hitterMetrics.hr;
}

function renderPlayerOptions() {
  const select = document.querySelector("#pvp-player");
  select.innerHTML = pvpState.players.map((player) => `
    <option value="${escapeHtml(player.id)}">${escapeHtml(player.name)}</option>
  `).join("");
  select.value = pvpState.activePlayerId;
}

function renderSummary(rows) {
  const data = pvpState.data;
  const player = data.player;
  const leader = rows[0];
  const config = modeConfig();
  document.querySelector("#pvp-mode").value = pvpState.mode;
  document.querySelector("#pvp-player-label").textContent = pvpState.mode === "pitcher" ? "Pitcher" : "Hitter";
  document.querySelector("#pvp-controls-eyebrow").textContent = config.opponentEyebrow;
  document.querySelector("#pvp-controls-intro").textContent = config.intro;
  document.querySelector("#pvp-selected-label").textContent = config.selectedLabel;
  document.querySelector("#pvp-player-name").innerHTML = careerLink(player.name, selectedCareerGroup());
  document.querySelector("#pvp-player-note").textContent = `${player.seasons} regular season`;
  document.querySelector("#pvp-faced-label").textContent = config.facedLabel;
  document.querySelector("#pvp-pitchers-faced").textContent = fmtNumber(data.summary[config.facedKey]);
  document.querySelector("#pvp-data-through").textContent = data.player.dataThrough;
  const [summaryLabel, summaryValue] = summaryMetric();
  document.querySelector("#pvp-total-label").textContent = summaryLabel;
  document.querySelector("#pvp-total-hr").textContent = fmtNumber(summaryValue);
  document.querySelector("#pvp-total-note").textContent = config.totalNote;
  document.querySelector("#pvp-leader-label").textContent = `Top ${statLabel()}`;
  document.querySelector("#pvp-leader").innerHTML = leader ? careerLink(rowName(leader), opponentCareerGroup()) : "--";
  document.querySelector("#pvp-leader-note").textContent = leader ? `${statLabel()} ${statLabel() === "AVG" || statLabel() === "OPS" ? fmtRate(leader[pvpState.activeSort]) : fmtNumber(leader[pvpState.activeSort])}` : "No rows";
  document.querySelector("#player-vs-pitchers-heading").textContent = `${player.name} ${statLabel()} by opposing ${config.opponentSingular}.`;
  const limitLabel = pvpState.limit === "all" ? `All ${config.opponentPlural}` : `Top ${pvpState.limit}`;
  document.querySelector("#pvp-leaderboard-title").textContent = `${limitLabel}: ${player.name} ${statLabel()} by opposing ${config.opponentSingular}`;
  document.querySelector("#pvp-table-eyebrow").textContent = config.listEyebrow;
  document.querySelector("#pvp-first-column").textContent = config.opponentTitle.slice(0, -1);
  document.querySelector("#pvp-limit-all").textContent = `All ${config.opponentTitle}`;
  document.querySelector("#pvp-bottom-all").textContent = `All ${config.opponentTitle}`;
  const bottomLabel = pvpState.bottomLimit === "hidden" ? config.listEyebrow : pvpState.bottomLimit === "all" ? `All ${config.opponentPlural}` : `Top ${pvpState.bottomLimit}`;
  document.querySelector("#pvp-table-title").textContent = `${bottomLabel}: ${player.name} ${statLabel()} by opposing ${config.opponentSingular}`;
}

function renderTable(rows, targetSelector) {
  const table = document.querySelector(targetSelector);
  if (!rows.length) {
    table.innerHTML = `<tr><td colspan="10">No ${modeConfig().opponentPlural} match this filter.</td></tr>`;
    return;
  }
  table.innerHTML = rows.map((row) => `
    <tr>
      <td>${careerLink(rowName(row), opponentCareerGroup())}</td>
      <td>${fmtNumber(row.pa)}</td>
      <td>${fmtNumber(row.ab)}</td>
      <td>${fmtNumber(row.h)}</td>
      <td>${fmtNumber(row.hr)}</td>
      <td>${fmtNumber(row.rbi)}</td>
      <td>${fmtNumber(row.bb)}</td>
      <td>${fmtNumber(row.so)}</td>
      <td>${fmtRate(row.avg)}</td>
      <td>${fmtRate(row.ops)}</td>
    </tr>
  `).join("");
}

function selectedStatValue(row) {
  return num(row[pvpState.activeSort]);
}

function fmtSelectedStat(value) {
  return ["avg", "ops"].includes(pvpState.activeSort) ? fmtRate(value) : fmtNumber(value);
}

function renderTopBoard(rows) {
  const board = document.querySelector("#pvp-leaderboard-table");
  if (!rows.length) {
    board.innerHTML = `<div class="empty-state">No ${modeConfig().opponentPlural} match this filter.</div>`;
    return;
  }
  const leaderValue = Math.max(...rows.map(selectedStatValue), 0);
  board.innerHTML = rows.map((row, index) => {
    const value = selectedStatValue(row);
    const percent = leaderValue ? Math.max(3, (value / leaderValue) * 100) : 0;
    return `
      <article class="pvp-top-row">
        <div class="pvp-top-rank">${index + 1}</div>
        <div class="pvp-top-label">
          <strong>${careerLink(rowName(row), opponentCareerGroup())}</strong>
          <span>${fmtNumber(row.pa)} PA | ${fmtNumber(row.ab)} AB | ${fmtNumber(row.h)} H</span>
        </div>
        <div class="pvp-top-track" aria-hidden="true">
          <div class="pvp-top-fill" style="width:${percent.toFixed(1)}%"></div>
        </div>
        <div class="pvp-top-value">${fmtSelectedStat(value)}</div>
      </article>
    `;
  }).join("");
}

function updateUrl() {
  const params = new URLSearchParams();
  if (pvpState.mode === "pitcher") params.set("mode", "pitcher");
  params.set("player", pvpState.activePlayerId);
  params.set("sort", pvpState.activeSort);
  if (pvpState.minPa) params.set("minPa", String(pvpState.minPa));
  if (pvpState.limit !== "10") params.set("limit", pvpState.limit);
  if (pvpState.bottomLimit !== "hidden") params.set("bottom", pvpState.bottomLimit);
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", nextUrl);
}

function renderBottomListControl() {
  const wrap = document.querySelector("#pvp-full-list-wrap");
  const select = document.querySelector("#pvp-bottom-limit");
  wrap.hidden = pvpState.bottomLimit === "hidden";
  select.value = pvpState.bottomLimit;
  document.querySelectorAll("[data-pvp-sort]").forEach((button) => {
    button.classList.toggle("active", button.dataset.pvpSort === pvpState.activeSort);
  });
}

function render() {
  const allRows = filteredRows();
  const topRows = leaderboardRows();
  const listRows = bottomRows();
  const totalRows = filteredRowCount();
  const config = modeConfig();
  renderSummary(topRows);
  renderTopBoard(topRows);
  if (pvpState.bottomLimit !== "hidden") {
    renderTable(listRows, "#pvp-table");
  } else {
    document.querySelector("#pvp-table").innerHTML = "";
  }
  document.querySelector("#pvp-status").textContent = pvpState.limit === "all"
    ? `${fmtNumber(topRows.length)} ${config.opponentPlural} on top board`
    : `${fmtNumber(topRows.length)} of ${fmtNumber(totalRows)} ${config.opponentPlural} on top board`;
  document.querySelector("#pvp-full-status").textContent = pvpState.bottomLimit === "hidden"
    ? `${fmtNumber(allRows.length)} ${config.opponentPlural} available`
    : pvpState.bottomLimit === "all"
      ? `${fmtNumber(listRows.length)} ${config.opponentPlural} shown`
      : `${fmtNumber(listRows.length)} of ${fmtNumber(allRows.length)} ${config.opponentPlural} shown`;
  document.querySelector("#pvp-sort").value = pvpState.activeSort;
  document.querySelector("#pvp-min-pa").value = String(pvpState.minPa);
  document.querySelector("#pvp-limit").value = pvpState.limit;
  renderBottomListControl();
  updateUrl();
}

async function loadPlayerData() {
  const player = activePlayer();
  if (!player) throw new Error("No player data is available yet.");
  pvpState.activePlayerId = player.id;
  pvpState.data = await fetchJson(`${modeConfig().dataPath}/${player.id}.json`);
  render();
}

async function copyLink() {
  updateUrl();
  const status = document.querySelector("#pvp-copy-status");
  try {
    await navigator.clipboard.writeText(window.location.href);
    status.textContent = "Copied";
  } catch (error) {
    status.textContent = "Copy failed";
  }
  clearTimeout(pvpCopyTimer);
  pvpCopyTimer = setTimeout(() => {
    status.textContent = "";
  }, 1800);
}

function bindEvents() {
  document.querySelector("#pvp-mode").addEventListener("change", async (event) => {
    pvpState.mode = event.target.value === "pitcher" ? "pitcher" : "hitter";
    pvpState.activePlayerId = modeConfig().defaultId;
    pvpState.activeSort = modeConfig().defaultSort;
    await loadIndex();
    renderPlayerOptions();
    await loadPlayerData();
  });
  document.querySelector("#pvp-run").addEventListener("click", async () => {
    pvpState.activePlayerId = document.querySelector("#pvp-player").value;
    await loadPlayerData();
  });
  document.querySelector("#pvp-player").addEventListener("change", async (event) => {
    pvpState.activePlayerId = event.target.value;
    await loadPlayerData();
  });
  document.querySelector("#pvp-sort").addEventListener("change", (event) => {
    pvpState.activeSort = event.target.value;
    render();
  });
  document.querySelector("#pvp-min-pa").addEventListener("change", (event) => {
    pvpState.minPa = Number(event.target.value) || 0;
    render();
  });
  document.querySelector("#pvp-limit").addEventListener("change", (event) => {
    pvpState.limit = event.target.value;
    render();
  });
  document.querySelector("#pvp-bottom-limit").addEventListener("change", (event) => {
    pvpState.bottomLimit = event.target.value;
    render();
  });
  document.querySelectorAll("[data-pvp-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      pvpState.activeSort = button.dataset.pvpSort;
      render();
    });
  });
  document.querySelector("#copy-pvp-link").addEventListener("click", copyLink);
}

async function initializePlayerVsPitchers() {
  try {
    await loadIndex();
    if (!pvpState.players.some((player) => player.id === pvpState.activePlayerId)) {
      pvpState.activePlayerId = pvpState.players[0]?.id || modeConfig().defaultId;
    }
    if (!["hr", "h", "rbi", "bb", "so", "ops", "avg", "ab", "pa"].includes(pvpState.activeSort)) {
      pvpState.activeSort = modeConfig().defaultSort;
    }
    if (!["10", "20", "50", "all"].includes(pvpState.limit)) {
      pvpState.limit = "10";
    }
    if (!["hidden", "10", "20", "50", "all"].includes(pvpState.bottomLimit)) {
      pvpState.bottomLimit = pvpState.limit;
    }
    renderPlayerOptions();
    bindEvents();
    await loadPlayerData();
  } catch (error) {
    document.querySelector("#pvp-status").textContent = "Could not load damage board data.";
    document.querySelector("#pvp-full-status").textContent = "No rows loaded.";
    document.querySelector("#pvp-leaderboard-table").innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    document.querySelector("#pvp-table").innerHTML = `<tr><td colspan="10">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function loadIndex() {
  const index = await fetchJson(modeConfig().indexPath);
  pvpState.players = index.players || [];
}

initializePlayerVsPitchers();
