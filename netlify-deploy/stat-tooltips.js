(function () {
  const STAT_TOOLTIPS = new Map([
    ["AB", "At-bats"],
    ["AVG", "Batting average"],
    ["AVG ALLOWED", "Batting average allowed"],
    ["AVG EV", "Average exit velocity"],
    ["BA", "Batting average"],
    ["BABIP", "Batting average on balls in play"],
    ["BARREL %", "Barrel rate"],
    ["BARREL % ALLOWED", "Barrel rate allowed"],
    ["BARREL%", "Barrel rate"],
    ["BARREL% ALLOWED", "Barrel rate allowed"],
    ["BB", "Walks"],
    ["BB%", "Walk rate"],
    ["BB/9", "Walks per nine innings"],
    ["BF", "Batters faced"],
    ["BS", "Blown saves"],
    ["CSW%", "Called strikes plus whiffs rate"],
    ["ER", "Earned runs"],
    ["ERA", "Earned run average"],
    ["EST. WOBA", "Estimated weighted on-base average"],
    ["EV", "Exit velocity"],
    ["EV ALLOWED", "Exit velocity allowed"],
    ["FIP", "Fielding independent pitching"],
    ["G", "Games"],
    ["GS", "Games started"],
    ["H", "Hits"],
    ["H-AB", "Hits-at-bats"],
    ["HARD-HIT %", "Hard-hit rate"],
    ["HARD-HIT % ALLOWED", "Hard-hit rate allowed"],
    ["HARD-HIT%", "Hard-hit rate"],
    ["HARD-HIT% ALLOWED", "Hard-hit rate allowed"],
    ["HR", "Home runs"],
    ["HR/9", "Home runs per nine innings"],
    ["HR/PA", "Home runs per plate appearance"],
    ["IP", "Innings pitched"],
    ["ISO", "Isolated power"],
    ["K %", "Strikeout rate"],
    ["K-BB%", "Strikeout rate minus walk rate"],
    ["K%", "Strikeout rate"],
    ["K/9", "Strikeouts per nine innings"],
    ["L", "Losses"],
    ["LA", "Launch angle"],
    ["LA ALLOWED", "Launch angle allowed"],
    ["MAX EV", "Maximum exit velocity"],
    ["MOST PA", "Most plate appearances"],
    ["OBP", "On-base percentage"],
    ["OPS", "On-base plus slugging"],
    ["OPS+", "Adjusted on-base plus slugging"],
    ["OPS AGAINST", "On-base plus slugging allowed"],
    ["P/PA", "Pitches per plate appearance"],
    ["PA", "Plate appearances"],
    ["PA/BF", "Plate appearances or batters faced"],
    ["PITCH %", "Share of pitches in the selected pitch group"],
    ["PITCH % SEEN", "Share of pitches seen in the selected pitch group"],
    ["PITCH % THROWN", "Share of pitches thrown in the selected pitch group"],
    ["PITCH TYPE", "Pitch classification"],
    ["PITCHES", "Pitches"],
    ["R", "Runs"],
    ["RBI", "Runs batted in"],
    ["SB", "Stolen bases"],
    ["SLG", "Slugging percentage"],
    ["SLG ALLOWED", "Slugging percentage allowed"],
    ["SO", "Strikeouts"],
    ["SV", "Saves"],
    ["USAGE", "Pitch usage rate"],
    ["USAGE %", "Pitch usage rate"],
    ["W", "Wins"],
    ["WAR", "Wins above replacement"],
    ["WHIFF %", "Whiff rate"],
    ["WHIFF%", "Whiff rate"],
    ["WHIP", "Walks plus hits per inning pitched"],
    ["WOBA", "Weighted on-base average"],
    ["WOBA ALLOWED", "Weighted on-base average allowed"],
    ["WRC+", "Weighted runs created plus"],
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
    "[data-sort]",
    "[data-team-sort]",
    "[data-career-sort]",
    "[data-pvp-sort]",
    "[data-fantasy-sort]",
    ".metric-label",
    ".stat-label",
    ".snapshot-label",
    ".roster-snapshot-label",
    ".pitch-mix-label",
    ".leaderboard-label",
    ".stat-card span",
    ".stat-card small",
    ".stat-card strong",
    ".metric-card span",
    ".metric-card small",
    ".metric-card strong",
    ".score-card span",
    ".score-card small",
    ".score-card strong",
    ".summary-card span",
    ".summary-card small",
    ".summary-card strong",
  ].join(",");

  const LEAF_SELECTOR = [
    "a",
    "abbr",
    "b",
    "button",
    "div",
    "dt",
    "em",
    "label",
    "li",
    "p",
    "small",
    "span",
    "strong",
    "td",
    "th",
  ].join(",");

  const SKIP_SELECTOR = [
    "canvas",
    "input",
    "noscript",
    "option",
    "script",
    "select",
    "style",
    "svg",
    "textarea",
  ].join(",");

  const stripSortMarks = (text) =>
    text
      .replace(/[↑↓↕]/g, "")
      .replace(/:$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

  function statKeys(text) {
    const key = stripSortMarks(text);
    const keys = [key];

    const withoutYear = key.replace(/^20\d{2}\s+/, "");
    if (withoutYear !== key) keys.push(withoutYear);

    const withoutCareer = withoutYear.replace(/^CAREER\s+/, "");
    if (withoutCareer !== withoutYear) keys.push(withoutCareer);

    const compactPercent = withoutCareer.replace(/\s+%/g, "%");
    if (compactPercent !== withoutCareer) keys.push(compactPercent);

    return keys;
  }

  function tooltipFor(text) {
    const keys = statKeys(text);
    for (const key of keys) {
      if (STAT_TOOLTIPS.has(key)) return STAT_TOOLTIPS.get(key);
    }
    return "";
  }

  function isLeafLabel(element) {
    if (!element || element.matches(SKIP_SELECTOR)) return false;
    if (element.querySelector(SKIP_SELECTOR)) return false;

    const text = (element.textContent || "").trim();
    if (!text || text.length > 40) return false;

    for (const child of element.children) {
      if ((child.textContent || "").trim()) return false;
    }

    return Boolean(tooltipFor(text));
  }

  function decorateElement(element) {
    if (!element) return;
    if (element.matches(SKIP_SELECTOR)) return;

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
    root.querySelectorAll(LEAF_SELECTOR).forEach((element) => {
      if (isLeafLabel(element)) decorateElement(element);
    });
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
