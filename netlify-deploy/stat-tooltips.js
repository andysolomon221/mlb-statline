(function () {
  const STAT_TOOLTIPS = new Map([
    ["AB", "At-bats"],
    ["AVG", "Batting average"],
    ["AVG ALLOWED", "Batting average allowed"],
    ["BA", "Batting average"],
    ["BARREL%", "Barrel rate"],
    ["BB", "Walks"],
    ["BB%", "Walk rate"],
    ["BF", "Batters faced"],
    ["BS", "Blown saves"],
    ["ER", "Earned runs"],
    ["ERA", "Earned run average"],
    ["EST. WOBA", "Estimated weighted on-base average"],
    ["EV", "Exit velocity"],
    ["EV ALLOWED", "Exit velocity allowed"],
    ["G", "Games"],
    ["GS", "Games started"],
    ["H", "Hits"],
    ["H-AB", "Hits-at-bats"],
    ["HARD-HIT %", "Hard-hit rate"],
    ["HARD-HIT%", "Hard-hit rate"],
    ["HR", "Home runs"],
    ["HR/9", "Home runs per nine innings"],
    ["HR/PA", "Home runs per plate appearance"],
    ["IP", "Innings pitched"],
    ["K%", "Strikeout rate"],
    ["L", "Losses"],
    ["LA", "Launch angle"],
    ["LA ALLOWED", "Launch angle allowed"],
    ["OBP", "On-base percentage"],
    ["OPS", "On-base plus slugging"],
    ["OPS+", "Adjusted on-base plus slugging"],
    ["OPS AGAINST", "On-base plus slugging allowed"],
    ["P/PA", "Pitches per plate appearance"],
    ["PA", "Plate appearances"],
    ["R", "Runs"],
    ["RBI", "Runs batted in"],
    ["SB", "Stolen bases"],
    ["SLG", "Slugging percentage"],
    ["SO", "Strikeouts"],
    ["SV", "Saves"],
    ["W", "Wins"],
    ["WAR", "Wins above replacement"],
    ["WHIFF%", "Whiff rate"],
    ["WHIP", "Walks plus hits per inning pitched"],
    ["WOBA", "Weighted on-base average"],
    ["XBA", "Expected batting average"],
    ["XBA ALLOWED", "Expected batting average allowed"],
    ["XSLG", "Expected slugging percentage"],
    ["XSLG ALLOWED", "Expected slugging percentage allowed"],
    ["XWOBA", "Expected weighted on-base average"],
    ["XWOBA ALLOWED", "Expected weighted on-base average allowed"],
  ]);

  const TARGET_SELECTOR = [
    "th",
    "label",
    "button",
    ".metric-label",
    ".stat-label",
    ".snapshot-label",
    ".roster-snapshot-label",
    ".pitch-mix-label",
    ".leaderboard-label",
    ".score-card span",
    ".score-card small",
    ".summary-card span",
    ".summary-card small",
  ].join(",");

  const stripSortMarks = (text) =>
    text
      .replace(/[↑↓↕]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

  function tooltipFor(text) {
    const key = stripSortMarks(text);
    if (STAT_TOOLTIPS.has(key)) return STAT_TOOLTIPS.get(key);

    const withoutYear = key.replace(/^20\d{2}\s+/, "");
    return STAT_TOOLTIPS.get(withoutYear) || "";
  }

  function decorateElement(element) {
    if (!element) return;

    const text = element.textContent || "";
    if (text.length > 40) return;

    const tooltip = tooltipFor(text);
    if (!tooltip) return;

    element.title = tooltip;
    element.classList.add("stat-tooltip-label");
  }

  function decorateStatTooltips(root) {
    if (!root || !root.querySelectorAll) return;

    if (root.matches && root.matches(TARGET_SELECTOR)) {
      decorateElement(root);
    }

    root.querySelectorAll(TARGET_SELECTOR).forEach(decorateElement);
  }

  let pending = false;
  function scheduleDecorate() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(() => {
      pending = false;
      decorateStatTooltips(document.body || document);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleDecorate, { once: true });
  } else {
    scheduleDecorate();
  }

  const observer = new MutationObserver(scheduleDecorate);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
