const initialParams = new URLSearchParams(window.location.search);
const requestedTopLimit = initialParams.get("limit") || "10";
const pvpState = {
  players: [],
  activePlayerId: initialParams.get("player") || "bondb001",
  activeSort: initialParams.get("sort") || "hr",
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

async function fetchJson(url) {
  const response = await fetch(url);
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
    return String(a.pitcher).localeCompare(String(b.pitcher));
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
    pa: "PA"
  }[key] || key.toUpperCase();
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
  document.querySelector("#pvp-player-name").textContent = player.name;
  document.querySelector("#pvp-player-note").textContent = `${player.seasons} regular season`;
  document.querySelector("#pvp-pitchers-faced").textContent = fmtNumber(data.summary.pitchersFaced);
  document.querySelector("#pvp-data-through").textContent = data.player.dataThrough;
  document.querySelector("#pvp-total-hr").textContent = fmtNumber(data.summary.homeRuns);
  document.querySelector("#pvp-leader-label").textContent = `Top ${statLabel()}`;
  document.querySelector("#pvp-leader").textContent = leader ? leader.pitcher : "--";
  document.querySelector("#pvp-leader-note").textContent = leader ? `${statLabel()} ${statLabel() === "AVG" || statLabel() === "OPS" ? fmtRate(leader[pvpState.activeSort]) : fmtNumber(leader[pvpState.activeSort])}` : "No rows";
  document.querySelector("#player-vs-pitchers-heading").textContent = `${player.name} ${statLabel()} by opposing pitcher.`;
  const limitLabel = pvpState.limit === "all" ? "All pitchers" : `Top ${pvpState.limit}`;
  document.querySelector("#pvp-leaderboard-title").textContent = `${limitLabel}: ${player.name} ${statLabel()} by opposing pitcher`;
  const bottomLabel = pvpState.bottomLimit === "hidden" ? "Pitcher list" : pvpState.bottomLimit === "all" ? "All pitchers" : `Top ${pvpState.bottomLimit}`;
  document.querySelector("#pvp-table-title").textContent = `${bottomLabel}: ${player.name} ${statLabel()} by opposing pitcher`;
}

function renderTable(rows, targetSelector) {
  const table = document.querySelector(targetSelector);
  if (!rows.length) {
    table.innerHTML = `<tr><td colspan="10">No pitchers match this filter.</td></tr>`;
    return;
  }
  table.innerHTML = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.pitcher)}</td>
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
    board.innerHTML = `<div class="empty-state">No pitchers match this filter.</div>`;
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
          <strong>${escapeHtml(row.pitcher)}</strong>
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
  renderSummary(topRows);
  renderTopBoard(topRows);
  if (pvpState.bottomLimit !== "hidden") {
    renderTable(listRows, "#pvp-table");
  } else {
    document.querySelector("#pvp-table").innerHTML = "";
  }
  document.querySelector("#pvp-status").textContent = pvpState.limit === "all"
    ? `${fmtNumber(topRows.length)} pitchers on top board`
    : `${fmtNumber(topRows.length)} of ${fmtNumber(totalRows)} pitchers on top board`;
  document.querySelector("#pvp-full-status").textContent = pvpState.bottomLimit === "hidden"
    ? `${fmtNumber(allRows.length)} pitchers available`
    : pvpState.bottomLimit === "all"
      ? `${fmtNumber(listRows.length)} pitchers shown`
      : `${fmtNumber(listRows.length)} of ${fmtNumber(allRows.length)} pitchers shown`;
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
  pvpState.data = await fetchJson(`data/player-vs-pitchers/${player.id}.json`);
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
    const index = await fetchJson("data/player-vs-pitchers/index.json");
    pvpState.players = index.players || [];
    if (!pvpState.players.some((player) => player.id === pvpState.activePlayerId)) {
      pvpState.activePlayerId = pvpState.players[0]?.id || "bondb001";
    }
    if (!["hr", "h", "rbi", "bb", "so", "ops", "avg", "pa"].includes(pvpState.activeSort)) {
      pvpState.activeSort = "hr";
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
    document.querySelector("#pvp-status").textContent = "Could not load player-vs-pitchers data.";
    document.querySelector("#pvp-full-status").textContent = "No rows loaded.";
    document.querySelector("#pvp-leaderboard-table").innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    document.querySelector("#pvp-table").innerHTML = `<tr><td colspan="10">${escapeHtml(error.message)}</td></tr>`;
  }
}

initializePlayerVsPitchers();
