(() => {
  const panel = document.querySelector("#pitcher-pitch-mix");
  const teamSelect = document.querySelector("#team-filter");
  const seasonSelect = document.querySelector("#season-select");
  const playerSelect = document.querySelector("#pitch-mix-player");
  const table = document.querySelector("#pitch-mix-table");
  const status = document.querySelector("#pitch-mix-status");
  const note = document.querySelector("#pitch-mix-note");
  const body = document.querySelector("#pitch-mix-body");
  const toggle = document.querySelector("#pitch-mix-toggle");

  if (!panel || !teamSelect || !seasonSelect || !playerSelect || !table || !status || !note || !body || !toggle) return;

  const teamCodesById = {
    108: "LAA", 109: "ARI", 110: "BAL", 111: "BOS", 112: "CHC", 113: "CIN",
    114: "CLE", 115: "COL", 116: "DET", 117: "HOU", 118: "KC", 119: "LAD",
    120: "WSH", 121: "NYM", 133: "ATH", 134: "PIT", 135: "SD", 136: "SEA",
    137: "SF", 138: "STL", 139: "TB", 140: "TEX", 141: "TOR", 142: "MIN",
    143: "PHI", 144: "ATL", 145: "CWS", 146: "MIA", 147: "NYY", 158: "MIL"
  };

  let rows = [];
  let requestNumber = 0;
  let optionObserverTimer;

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function rate(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(3).replace(/^0/, "") : "—";
  }

  function percent(value) {
    const number = Number(value);
    return Number.isFinite(number) ? `${number.toFixed(1)}%` : "—";
  }

  function whole(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number).toLocaleString("en-US") : "—";
  }

  function currentMode() {
    return document.querySelector(".range-panel")?.dataset.activeMode || "single";
  }

  function selectedTeamCode() {
    return teamCodesById[teamSelect.value] || "";
  }

  function pitcherTotals() {
    const totals = new Map();
    rows.forEach((row) => {
      const current = totals.get(row.playerId) || { id: row.playerId, name: row.name, pitches: 0 };
      current.pitches += Number(row.pitches) || 0;
      totals.set(row.playerId, current);
    });
    return Array.from(totals.values()).sort((a, b) => b.pitches - a.pitches || a.name.localeCompare(b.name));
  }

  function renderPitcherOptions(previousPlayer = "") {
    const pitchers = pitcherTotals();
    playerSelect.innerHTML = pitchers.map((pitcher) => (
      `<option value="${escapeHtml(pitcher.id)}">${escapeHtml(pitcher.name)}</option>`
    )).join("");
    playerSelect.value = pitchers.some((pitcher) => pitcher.id === previousPlayer) ? previousPlayer : pitchers[0]?.id || "";
  }

  function renderTable() {
    const playerId = playerSelect.value;
    const pitcherRows = rows
      .filter((row) => row.playerId === playerId)
      .sort((a, b) => (Number(b.pitch_usage) || 0) - (Number(a.pitch_usage) || 0));
    const pitcherName = pitcherRows[0]?.name || "Selected pitcher";
    const totalPitches = pitcherRows.reduce((sum, row) => sum + (Number(row.pitches) || 0), 0);

    note.textContent = pitcherRows.length
      ? `${seasonSelect.value} arsenal · ${whole(totalPitches)} tracked pitches · Baseball Savant`
      : `No ${seasonSelect.value} pitch-level data is available for this pitcher.`;
    status.textContent = pitcherRows.length
      ? `${pitcherName} throws ${pitcherRows.length} tracked pitch ${pitcherRows.length === 1 ? "type" : "types"}.`
      : "No pitch mix rows available.";
    table.innerHTML = pitcherRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.pitchName || row.pitchType)}</td>
        <td>${percent(row.pitch_usage)}</td>
        <td>${whole(row.pitches)}</td>
        <td>${whole(row.pa)}</td>
        <td>${rate(row.ba)}</td>
        <td>${rate(row.slg)}</td>
        <td>${rate(row.est_woba)}</td>
        <td>${percent(row.whiff_percent)}</td>
        <td>${percent(row.k_percent)}</td>
        <td>${whole(row.homeRuns)}</td>
      </tr>
    `).join("") || `<tr><td colspan="10" class="empty-row">No pitch-level data is available.</td></tr>`;
  }

  function hidePanel() {
    panel.hidden = true;
    rows = [];
  }

  async function loadPitchMix() {
    const team = selectedTeamCode();
    if (teamSelect.value === "all" || !team || currentMode() !== "single") {
      hidePanel();
      return;
    }

    const thisRequest = ++requestNumber;
    const previousPlayer = playerSelect.value;
    panel.hidden = false;
    status.textContent = "Loading pitch mix...";
    note.textContent = `${seasonSelect.value} pitch-level data for ${teamSelect.selectedOptions[0]?.textContent || team}.`;
    table.innerHTML = `<tr><td colspan="10" class="empty-row">Loading arsenal data...</td></tr>`;

    try {
      const params = new URLSearchParams({ type: "pitcher", year: seasonSelect.value, team });
      const response = await fetch(`/.netlify/functions/pitch-types?${params.toString()}`);
      if (!response.ok) throw new Error(`Pitch data returned ${response.status}`);
      const data = await response.json();
      if (thisRequest !== requestNumber) return;
      rows = Array.isArray(data.rows) ? data.rows : [];
      if (!rows.length) {
        playerSelect.innerHTML = "";
        renderTable();
        return;
      }
      renderPitcherOptions(previousPlayer);
      renderTable();
    } catch (error) {
      if (thisRequest !== requestNumber) return;
      rows = [];
      playerSelect.innerHTML = "";
      status.textContent = "Pitch mix could not be loaded.";
      note.textContent = "The regular pitching leaderboard is still available above.";
      table.innerHTML = `<tr><td colspan="10" class="empty-row">Please try the pitch mix again shortly.</td></tr>`;
    }
  }

  teamSelect.addEventListener("change", loadPitchMix);
  seasonSelect.addEventListener("change", loadPitchMix);
  playerSelect.addEventListener("change", renderTable);
  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
    window.setTimeout(loadPitchMix, 0);
  }));
  toggle.addEventListener("click", () => {
    const collapsed = !body.hidden;
    body.hidden = collapsed;
    toggle.textContent = collapsed ? "Expand" : "Collapse";
    toggle.setAttribute("aria-expanded", String(!collapsed));
  });

  const observer = new MutationObserver(() => {
    clearTimeout(optionObserverTimer);
    optionObserverTimer = setTimeout(loadPitchMix, 0);
  });
  observer.observe(teamSelect, { childList: true });
  loadPitchMix();
})();
