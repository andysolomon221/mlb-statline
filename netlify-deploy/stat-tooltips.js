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
    "[data-stat-tooltip]",
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

    const explicitTooltip = element.dataset.statTooltip;
    if (explicitTooltip) {
      element.title = explicitTooltip;
      element.classList.add("stat-tooltip-label");
      return;
    }

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

  function enhanceSiteUi() {
    const rail = document.querySelector(".rail");
    const nav = document.querySelector(".rail-nav");
    if (nav && !nav.dataset.groupedNavigation) {
      nav.dataset.groupedNavigation = "true";
      const primaryHrefs = ["index.html", "matchups.html", "batting.html", "pitching.html", "compare.html", "standings.html"];
      const existingLinks = [...nav.querySelectorAll(":scope > a")];
      const primary = document.createElement("div");
      primary.className = "rail-nav-primary";
      primaryHrefs.forEach((href) => {
        const link = existingLinks.find((candidate) => candidate.getAttribute("href") === href);
        if (link) primary.appendChild(link);
        if (href === "index.html") {
          const tonight = document.createElement("a");
          tonight.href = "probable-pitcher-matchups-today.html";
          tonight.textContent = "Tonight";
          if (window.location.pathname.includes("probable-pitcher-matchups-today")) tonight.classList.add("active");
          primary.appendChild(tonight);
        }
      });
      const history = document.createElement("a");
      history.href = "batting.html?mode=range&start=1901&end=2026&metric=hr";
      history.textContent = "History";
      primary.appendChild(history);

      const more = document.createElement("details");
      more.className = "rail-nav-more";
      const summary = document.createElement("summary");
      summary.textContent = "More Tools";
      const moreLinks = document.createElement("div");
      moreLinks.className = "rail-nav-more-links";
      existingLinks.filter((link) => !primaryHrefs.includes(link.getAttribute("href"))).forEach((link) => moreLinks.appendChild(link));
      if (moreLinks.querySelector(".active")) more.open = true;
      more.append(summary, moreLinks);
      nav.append(primary, more);
    }
    if (rail && nav && !rail.querySelector(".site-menu-toggle")) {
      if (!nav.id) nav.id = "site-primary-navigation";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "site-menu-toggle";
      button.setAttribute("aria-controls", nav.id);
      button.setAttribute("aria-expanded", "false");
      button.textContent = "Menu";
      button.addEventListener("click", () => {
        const open = !document.body.classList.contains("site-nav-open");
        document.body.classList.toggle("site-nav-open", open);
        button.setAttribute("aria-expanded", String(open));
        button.textContent = open ? "Close menu" : "Menu";
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !document.body.classList.contains("site-nav-open")) return;
        document.body.classList.remove("site-nav-open");
        button.setAttribute("aria-expanded", "false");
        button.textContent = "Menu";
        button.focus();
      });
      nav.addEventListener("click", (event) => {
        if (!event.target.closest("a")) return;
        document.body.classList.remove("site-nav-open");
        button.setAttribute("aria-expanded", "false");
        button.textContent = "Menu";
      });
      rail.insertBefore(button, nav);
    }

    document.querySelectorAll(".table-wrap").forEach((wrap) => {
      if (wrap.dataset.scrollHintReady) return;
      wrap.dataset.scrollHintReady = "true";
      const hint = document.createElement("small");
      hint.className = "table-scroll-hint";
      hint.textContent = "Swipe table for more →";
      wrap.parentNode.insertBefore(hint, wrap);
    });

    document.querySelectorAll(".share-action-row").forEach((row) => {
      if (row.dataset.nativeShareReady) return;
      row.dataset.nativeShareReady = "true";
      const label = row.querySelector(".share-action-label");
      if (label) label.textContent = "Share result";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-action native-share-button";
      button.textContent = "Share";
      button.addEventListener("click", async () => {
        const shareData = { title: document.title, text: document.querySelector("h1")?.textContent || document.title, url: window.location.href };
        const status = row.querySelector(".copy-status");
        try {
          if (navigator.share) await navigator.share(shareData);
          else if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(window.location.href);
            if (status) status.textContent = "Link copied";
          }
        } catch (error) {
          if (error?.name !== "AbortError" && status) status.textContent = "Could not share";
        }
      });
      if (label) label.insertAdjacentElement("afterend", button);
      else row.prepend(button);
    });
  }

  let pending = false;
  function scheduleDecorate() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(() => {
      pending = false;
      decorateStatTooltips(document.body || document);
      enhanceSiteUi();
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
