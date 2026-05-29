const firstSplitSeason = 1901;
const lastSplitSeason = 2026;
const splitCache = new Map();
const peopleCache = new Map();
const splitCodes = {
  common: ["h", "a", "vl", "vr", "d", "n"],
  location: ["h", "a"],
  handedness: ["vl", "vr"],
  time: ["d", "n"]
};

const columns = {
  hitting: [
    ["gamesPlayed", "G"],
    ["atBats", "AB"],
    ["hits", "H"],
    ["homeRuns", "HR"],
    ["rbi", "RBI"],
    ["avg", "AVG"],
    ["obp", "OBP"],
    ["slg", "SLG"],
    ["ops", "OPS"]
  ],
  pitching: [
    ["gamesPlayed", "G"],
    ["gamesStarted", "GS"],
    ["inningsPitched", "IP"],
    ["hits", "H"],
    ["earnedRuns", "ER"],
    ["strikeOuts", "SO"],
    ["baseOnBalls", "BB"],
    ["era", "ERA"],
    ["whip", "WHIP"]
  ]
};

let selectedPlayer = { id: 660271, fullName: "Shohei Ohtani" };
let activeSeason = "2023";
let activeMode = "single";
let activeRange = { start: 2021, end: 2023 };
let activeGroup = "hitting";
let activeSplitSet = "common";
let activeRequestId = 0;
let playerCandidates = [{ ...selectedPlayer, position: "DH" }];
let splitSearchTimer;

function baseballReferenceSearchUrl(name) {
  return `https://www.baseball-reference.com/search/search.fcgi?search=${encodeURIComponent(name)}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function populateSeasonSelect() {
  const select = document.querySelector("#split-season");
  const years = [];
  for (let year = lastSplitSeason; year >= firstSplitSeason; year -= 1) {
    years.push(`<option value="${year}">${year}</option>`);
  }
  select.innerHTML = years.join("");
  select.value = activeSeason;
  document.querySelector("#split-range-start").innerHTML = years.join("");
  document.querySelector("#split-range-end").innerHTML = years.join("");
  document.querySelector("#split-range-start").value = activeRange.start;
  document.querySelector("#split-range-end").value = activeRange.end;
}

function yearList(start, end) {
  const low = Math.min(Number(start), Number(end));
  const high = Math.max(Number(start), Number(end));
  return Array.from({ length: high - low + 1 }, (_, index) => low + index);
}

function currentScopeLabel() {
  if (activeMode === "single") return activeSeason;
  return activeRange.start === activeRange.end ? String(activeRange.start) : `${activeRange.start}-${activeRange.end}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`MLB Stats API returned ${response.status}`);
  return response.json();
}

async function searchPeople(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];
  const cacheKey = cleanQuery.toLowerCase();
  if (peopleCache.has(cacheKey)) return peopleCache.get(cacheKey);
  const url = `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(cleanQuery)}`;
  const data = await fetchJson(url);
  const people = (data.people || []).map((person) => ({
    id: person.id,
    fullName: person.fullName,
    position: person.primaryPosition?.abbreviation || "MLB",
    team: person.currentTeam?.abbreviation || "",
    teamName: person.currentTeam?.name || ""
  }));
  peopleCache.set(cacheKey, people);
  return people;
}

function renderPlayerAutocomplete(people) {
  playerCandidates = Array.from(new Map(people.map((person) => [Number(person.id), person])).values());
  document.querySelector("#split-player-options").innerHTML = playerCandidates.map((person) => `
    <option value="${escapeHtml(displayPlayerOption(person))}" label="${escapeHtml(person.fullName)}"></option>
  `).join("");
}

function displayPlayerOption(person) {
  const teamText = person.teamName || person.team ? ` - ${person.teamName || person.team}` : "";
  return `${person.fullName}${teamText}${person.position ? ` (${person.position})` : ""}`;
}

function cleanPlayerInput(value) {
  return value.replace(/\s+-\s+[^()]+(?:\s+\([^)]+\))?$/, "").replace(/\s+\([^)]+\)$/, "").trim();
}

async function loadSplits() {
  const requestId = ++activeRequestId;
  setStatus("Loading MLB splits...");
  renderLoading();
  updateSummary();

  try {
    const years = activeMode === "single" ? [Number(activeSeason)] : yearList(activeRange.start, activeRange.end);
    const payloads = await Promise.all(years.map(fetchYearPayload));
    const payload = activeMode === "single" ? payloads[0] : aggregatePayloads(payloads);
    if (requestId !== activeRequestId) return;
    renderSplits(payload.rows, payload.total);
    setStatus(payload.rows.length ? `${payload.rows.length} splits loaded for ${currentScopeLabel()}` : "No splits found");
  } catch (error) {
    if (requestId !== activeRequestId) return;
    document.querySelector("#split-table").innerHTML = `<tr><td colspan="12" class="empty-row">Could not load MLB split data. Check the player, season, or connection and try again.</td></tr>`;
    setStatus("Could not load splits");
  }
}

async function fetchYearPayload(year) {
  const cacheKey = [selectedPlayer.id, year, activeGroup, activeSplitSet].join(":");
  if (splitCache.has(cacheKey)) return splitCache.get(cacheKey);
  const params = new URLSearchParams({
    stats: "statSplits",
    group: activeGroup,
    season: String(year),
    sitCodes: splitCodes[activeSplitSet].join(",")
  });
  const totalParams = new URLSearchParams({
    stats: "season",
    group: activeGroup,
    season: String(year)
  });
  const [splitData, totalData] = await Promise.all([
    fetchJson(`https://statsapi.mlb.com/api/v1/people/${selectedPlayer.id}/stats?${params.toString()}`),
    fetchJson(`https://statsapi.mlb.com/api/v1/people/${selectedPlayer.id}/stats?${totalParams.toString()}`)
  ]);
  const payload = {
    rows: (splitData.stats?.[0]?.splits || []).map(mapSplitRow),
    total: mapTotalRow(totalData.stats?.[0]?.splits || [])
  };
  splitCache.set(cacheKey, payload);
  return payload;
}

function aggregatePayloads(payloads) {
  const rowsBySplit = new Map();
  payloads.flatMap((payload) => payload.rows).forEach((row) => {
    const key = row.code || row.label;
    const existing = rowsBySplit.get(key) || {
      label: row.label,
      code: row.code,
      sortOrder: row.sortOrder,
      teams: new Set(),
      statRows: []
    };
    existing.teams.add(row.team);
    existing.statRows.push(row.stat);
    rowsBySplit.set(key, existing);
  });
  const totalRows = payloads.map((payload) => payload.total).filter(Boolean);
  return {
    rows: Array.from(rowsBySplit.values())
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((row) => ({
        label: row.label,
        code: row.code,
        team: row.teams.size === 1 ? Array.from(row.teams)[0] : "Multiple",
        stat: aggregateStatRows(row.statRows)
      })),
    total: totalRows.length ? {
      label: "Range total",
      team: new Set(totalRows.map((row) => row.team)).size === 1 ? totalRows[0].team : "Multiple",
      stat: aggregateStatRows(totalRows.map((row) => row.stat))
    } : null
  };
}

function mapSplitRow(split) {
  return {
    label: split.split?.description || split.split?.code || "Split",
    code: split.split?.code || split.split?.description || "split",
    sortOrder: split.split?.sortOrder || 0,
    team: split.team?.abbreviation || split.team?.teamName || split.team?.name || "MLB",
    stat: split.stat || {}
  };
}

function mapTotalRow(splits) {
  if (!splits.length) return null;
  if (splits.length === 1) return mapSplitRow({ ...splits[0], split: { description: "Season total" } });
  return {
    label: "Season total",
    team: "Multiple",
    stat: aggregateStatRows(splits.map((split) => split.stat || {}))
  };
}

function aggregateTotalStat(key, splits) {
  if (["avg", "obp", "slg", "ops", "era", "whip"].includes(key)) return "-";
  if (key === "inningsPitched") {
    const outs = splits.reduce((total, split) => total + inningsToOuts(split.stat?.inningsPitched), 0);
    return outsToInnings(outs);
  }
  return splits.reduce((total, split) => total + toNumber(split.stat?.[key]), 0);
}

function aggregateStatRows(rows) {
  const stat = {};
  columns[activeGroup].forEach(([key]) => {
    stat[key] = aggregateStatValue(key, rows);
  });
  return stat;
}

function aggregateStatValue(key, rows) {
  if (key === "avg") return rate(hittingTotal(rows, "hits"), hittingTotal(rows, "atBats"), 3);
  if (key === "obp") {
    const numerator = hittingTotal(rows, "hits") + hittingTotal(rows, "baseOnBalls") + hittingTotal(rows, "hitByPitch");
    const denominator = hittingTotal(rows, "atBats") + hittingTotal(rows, "baseOnBalls") + hittingTotal(rows, "hitByPitch") + hittingTotal(rows, "sacFlies");
    return rate(numerator, denominator, 3);
  }
  if (key === "slg") return rate(hittingTotal(rows, "totalBases"), hittingTotal(rows, "atBats"), 3);
  if (key === "ops") {
    const obp = Number(aggregateStatValue("obp", rows));
    const slg = Number(aggregateStatValue("slg", rows));
    return Number.isFinite(obp + slg) ? (obp + slg).toFixed(3) : "-";
  }
  if (key === "era") {
    const outs = rows.reduce((total, row) => total + inningsToOuts(row.inningsPitched), 0);
    return outs ? ((hittingTotal(rows, "earnedRuns") * 27) / outs).toFixed(2) : "-";
  }
  if (key === "whip") {
    const outs = rows.reduce((total, row) => total + inningsToOuts(row.inningsPitched), 0);
    return outs ? (((hittingTotal(rows, "hits") + hittingTotal(rows, "baseOnBalls")) * 3) / outs).toFixed(2) : "-";
  }
  if (key === "inningsPitched") {
    const outs = rows.reduce((total, row) => total + inningsToOuts(row.inningsPitched), 0);
    return outsToInnings(outs);
  }
  return hittingTotal(rows, key);
}

function hittingTotal(rows, key) {
  return rows.reduce((total, row) => total + toNumber(row[key]), 0);
}

function rate(numerator, denominator, decimals) {
  return denominator ? (numerator / denominator).toFixed(decimals) : "-";
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function inningsToOuts(value) {
  const [whole, fraction = "0"] = String(value || "0").split(".");
  return (Number(whole) || 0) * 3 + (Number(fraction) || 0);
}

function outsToInnings(outs) {
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

function formatStat(key, value) {
  if (value === undefined || value === null || value === "") return "-";
  if (["avg", "obp", "slg", "ops", "era", "whip"].includes(key)) return String(value).replace(/^0\./, ".");
  return value;
}

function renderHead() {
  document.querySelector("#split-head").innerHTML = `
    <tr>
      <th>Split</th>
      <th>Club</th>
      ${columns[activeGroup].map(([, label]) => `<th>${label}</th>`).join("")}
    </tr>
  `;
}

function renderLoading() {
  renderHead();
  document.querySelector("#split-table").innerHTML = `<tr><td colspan="12" class="empty-row">Loading MLB splits...</td></tr>`;
}

function renderSplits(rows, totalRow) {
  renderHead();
  document.querySelector("#split-table-title").textContent = `${activeGroup === "hitting" ? "Batting" : "Pitching"} splits`;
  if (!rows.length) {
    document.querySelector("#split-table").innerHTML = `<tr><td colspan="12" class="empty-row">No ${activeGroup} splits found for ${escapeHtml(selectedPlayer.fullName)} in ${currentScopeLabel()}.</td></tr>`;
    return;
  }

  const totalHtml = totalRow ? rowHtml(totalRow, "split-total-row") : "";
  document.querySelector("#split-table").innerHTML = totalHtml + rows.map((row) => rowHtml(row)).join("");
}

function rowHtml(row, className = "") {
  return `
    <tr>
      <td>${escapeHtml(row.label)}</td>
      <td>${escapeHtml(row.team)}</td>
      ${columns[activeGroup].map(([key]) => `<td>${formatStat(key, row.stat[key])}</td>`).join("")}
    </tr>
  `.replace("<tr>", `<tr${className ? ` class="${className}"` : ""}>`);
}

function setStatus(message) {
  document.querySelector("#split-status").textContent = message;
}

function updateSummary() {
  document.querySelector("#selected-player").textContent = selectedPlayer.fullName;
  document.querySelector("#selected-season").textContent = currentScopeLabel();
  document.querySelector("#selected-splits").textContent = document.querySelector(`#split-set option[value="${activeSplitSet}"]`).textContent.replace(" splits", "");
  document.querySelector("#player-reference-link").href = baseballReferenceSearchUrl(selectedPlayer.fullName);
}

async function handleSearch(event) {
  event.preventDefault();
  setStatus("Searching players...");
  const query = document.querySelector("#player-query").value;
  try {
    const people = await searchPeople(query);
    if (!people.length) {
      renderPlayerAutocomplete([]);
      setStatus("No players found");
      return;
    }
    renderPlayerAutocomplete(people);
    selectedPlayer = people[0];
    document.querySelector("#player-query").value = selectedPlayer.fullName;
    loadSplits();
  } catch (error) {
    setStatus("Could not search players");
  }
}

function bindEvents() {
  document.querySelector("#player-query").addEventListener("keydown", (event) => {
    if (event.key === "Enter") handleSearch(event);
  });
  document.querySelector("#player-query").addEventListener("input", () => {
    clearTimeout(splitSearchTimer);
    splitSearchTimer = setTimeout(async () => {
      const query = document.querySelector("#player-query").value;
      if (query.trim().length < 2) return;
      try {
        renderPlayerAutocomplete(await searchPeople(query));
      } catch (error) {
        setStatus("Could not search players");
      }
    }, 180);
  });
  document.querySelector("#player-query").addEventListener("change", () => {
    const query = cleanPlayerInput(document.querySelector("#player-query").value).toLowerCase();
    const match = playerCandidates.find((person) => person.fullName.toLowerCase() === query || displayPlayerOption(person).toLowerCase() === document.querySelector("#player-query").value.trim().toLowerCase());
    if (!match) return;
    selectedPlayer = match;
    loadSplits();
  });
  document.querySelectorAll("[data-split-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      activeMode = button.dataset.splitMode;
      updateSplitModeControls();
      loadSplits();
    });
  });
  document.querySelector("#split-season").addEventListener("change", (event) => {
    activeSeason = event.target.value;
    activeMode = "single";
    updateSplitModeControls();
    loadSplits();
  });
  document.querySelector("#split-range-start").addEventListener("change", (event) => {
    setActiveRange(event.target.value, activeRange.end);
  });
  document.querySelector("#split-range-end").addEventListener("change", (event) => {
    setActiveRange(activeRange.start, event.target.value);
  });
  document.querySelectorAll("[data-split-range-start]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveRange(button.dataset.splitRangeStart, button.dataset.splitRangeEnd);
    });
  });
  document.querySelector("#split-group").addEventListener("change", (event) => {
    activeGroup = event.target.value;
    loadSplits();
  });
  document.querySelector("#split-set").addEventListener("change", (event) => {
    activeSplitSet = event.target.value;
    loadSplits();
  });
}

function setActiveRange(start, end) {
  activeMode = "range";
  activeRange = {
    start: Math.min(Number(start), Number(end)),
    end: Math.max(Number(start), Number(end))
  };
  document.querySelector("#split-range-start").value = activeRange.start;
  document.querySelector("#split-range-end").value = activeRange.end;
  updateSplitModeControls();
  loadSplits();
}

function updateSplitModeControls() {
  document.querySelectorAll("[data-split-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.splitMode === activeMode);
  });
  document.querySelector(".split-controls-panel")?.setAttribute("data-active-mode", activeMode);
  document.querySelectorAll("[data-split-range-start]").forEach((button) => {
    const matches = Number(button.dataset.splitRangeStart) === activeRange.start && Number(button.dataset.splitRangeEnd) === activeRange.end;
    button.classList.toggle("active", activeMode === "range" && matches);
  });
  document.querySelector("#split-season").disabled = activeMode === "range";
  document.querySelector("#split-range-start-value").textContent = activeRange.start;
  document.querySelector("#split-range-end-value").textContent = activeRange.end;
  updateSummary();
}

populateSeasonSelect();
updateSplitModeControls();
renderPlayerAutocomplete([{ ...selectedPlayer, position: "DH" }]);
bindEvents();
loadSplits();
