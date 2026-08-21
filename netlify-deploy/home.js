(function () {
  const form = document.querySelector("#home-finder");
  if (!form) return;

  const input = document.querySelector("#home-finder-query");
  const options = document.querySelector("#home-finder-options");
  const destination = document.querySelector("#home-finder-destination");
  const status = document.querySelector("#home-finder-status");
  const rabbitQuestion = document.querySelector("#rabbit-hole-question");
  const rabbitNote = document.querySelector("#rabbit-hole-note");
  const rabbitLink = document.querySelector("#rabbit-hole-open");
  const rabbitNext = document.querySelector("#rabbit-hole-next");
  const teamNames = {
    "Arizona Diamondbacks": "ARI", "Athletics": "ATH", "Atlanta Braves": "ATL",
    "Baltimore Orioles": "BAL", "Boston Red Sox": "BOS", "Chicago Cubs": "CHC",
    "Chicago White Sox": "CWS", "Cincinnati Reds": "CIN", "Cleveland Guardians": "CLE",
    "Colorado Rockies": "COL", "Detroit Tigers": "DET", "Houston Astros": "HOU",
    "Kansas City Royals": "KC", "Los Angeles Angels": "LAA", "Los Angeles Dodgers": "LAD",
    "Miami Marlins": "MIA", "Milwaukee Brewers": "MIL", "Minnesota Twins": "MIN",
    "New York Mets": "NYM", "New York Yankees": "NYY", "Philadelphia Phillies": "PHI",
    "Pittsburgh Pirates": "PIT", "San Diego Padres": "SD", "San Francisco Giants": "SF",
    "Seattle Mariners": "SEA", "St. Louis Cardinals": "STL", "Tampa Bay Rays": "TB",
    "Texas Rangers": "TEX", "Toronto Blue Jays": "TOR", "Washington Nationals": "WSH"
  };
  const normalizedTeams = new Map(Object.entries(teamNames).map(([name, abbr]) => [name.toLowerCase(), { name, abbr }]));
  let timer = 0;
  const rabbitHoles = [
    { question: "Who hit the most home runs before age 25?", note: "Rank every qualifying hitter by career production accumulated before his age-25 season.", href: "age.html?group=hitting&metric=homeRuns&rule=before&age=25&start=1901&end=2026&min=auto" },
    { question: "Who hit the most home runs in his first two MLB seasons?", note: "Compare early-career production across eras, then switch between hitters and pitchers.", href: "starts.html?example=mlb-hr-2" },
    { question: "Judge or Trout: who owns the stronger career line?", note: "Put two modern stars side by side and change the window from career to individual seasons.", href: "compare.html?playerA=Aaron%20Judge&playerB=Mike%20Trout&mode=career" },
    { question: "Who led MLB in strikeouts during the 1990s?", note: "Open the decade board, then jump to another era or pitching statistic.", href: "pitching.html?mode=range&start=1990&end=1999&metric=strikeouts" },
    { question: "What was Kyle Schwarber’s best five-game power stretch?", note: "Use the Span Finder to investigate a player’s hottest rolling stretch.", href: "span.html?player=Kyle%20Schwarber&games=5&metric=homeRuns" },
    { question: "Which lineup has the best context against tonight’s starter?", note: "Start with probable pitchers, then open the roster history and Decision Lens.", href: "probable-pitcher-matchups-today.html" }
  ];
  let rabbitIndex = Math.floor(Date.now() / 86400000) % rabbitHoles.length;

  function teamSearchTerms(team) {
    const words = team.name.toLowerCase().split(" ");
    return [team.name.toLowerCase(), team.abbr.toLowerCase(), words[words.length - 1], words.slice(-2).join(" ")];
  }

  function renderRabbitHole() {
    const item = rabbitHoles[rabbitIndex];
    if (!item || !rabbitQuestion || !rabbitNote || !rabbitLink) return;
    rabbitQuestion.textContent = item.question;
    rabbitNote.textContent = item.note;
    rabbitLink.href = item.href;
  }

  renderRabbitHole();
  rabbitNext?.addEventListener("click", () => {
    rabbitIndex = (rabbitIndex + 1) % rabbitHoles.length;
    renderRabbitHole();
  });

  function teamMatch(query) {
    const clean = query.trim().toLowerCase();
    if (!clean) return null;
    return [...normalizedTeams.values()].find((team) => teamSearchTerms(team).includes(clean)) || null;
  }

  function questionRoute(query) {
    const clean = query.trim();
    const lower = clean.toLowerCase().replace(/[?]/g, "");
    const comparison = clean.split(/\s+vs\.?\s+/i).map((name) => name.trim()).filter(Boolean);
    if (comparison.length === 2) {
      return `compare.html?playerA=${encodeURIComponent(comparison[0])}&playerB=${encodeURIComponent(comparison[1])}&mode=career`;
    }
    const decade = lower.match(/\b(19|20)(\d)0s\b/);
    if (decade && /(leader|most|top)/.test(lower)) {
      const start = Number(`${decade[1]}${decade[2]}0`);
      const end = start + 9;
      if (/(strikeout|\bso\b)/.test(lower)) return `pitching.html?mode=range&start=${start}&end=${end}&metric=strikeouts`;
      const metric = /(average|\bavg\b)/.test(lower) ? "avg" : /(hit)/.test(lower) && !/(home run|\bhr\b)/.test(lower) ? "hits" : "hr";
      return `batting.html?mode=range&start=${start}&end=${end}&metric=${metric}`;
    }
    const age = lower.match(/(?:before|through) age (\d{2})/);
    if (age && /(most|leader|who)/.test(lower)) {
      const group = /(strikeout|save|era|whip)/.test(lower) ? "pitching" : "hitting";
      const metric = /(strikeout)/.test(lower) ? "strikeOuts" : /(save)/.test(lower) ? "saves" : /(hit)/.test(lower) && !/(home run|\bhr\b)/.test(lower) ? "hits" : "homeRuns";
      const rule = lower.includes("through age") ? "through" : "before";
      return `age.html?group=${group}&metric=${metric}&rule=${rule}&age=${age[1]}&start=1901&end=2026&min=auto`;
    }
    if (/(probable pitcher|today'?s probable|tonight'?s matchup)/.test(lower)) return "probable-pitcher-matchups-today.html";
    if (/(home run|power) matchup/.test(lower)) return "home-run-matchups-today.html";
    const matchedTeam = [...normalizedTeams.values()].find((team) => teamSearchTerms(team).some((term) => term.length > 2 && lower.includes(term)));
    if (matchedTeam && /(team|news|standing|stats)/.test(lower)) return `teams.html?team=${encodeURIComponent(matchedTeam.abbr)}`;
    if (lower.endsWith(" splits")) return `splits.html?player=${encodeURIComponent(clean.replace(/\s+splits$/i, ""))}`;
    if (lower.endsWith(" career")) return `career.html?player=${encodeURIComponent(clean.replace(/\s+career$/i, ""))}`;
    return "";
  }

  async function loadSuggestions() {
    const query = input.value.trim();
    const teamSuggestions = [...normalizedTeams.values()]
      .filter((team) => team.name.toLowerCase().includes(query.toLowerCase()) || team.abbr.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 6);
    if (query.length < 2) {
      options.innerHTML = teamSuggestions.map((team) => `<option value="${team.name}">${team.abbr} · Team hub</option>`).join("");
      return;
    }
    try {
      const response = await fetch(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(query)}&sportIds=1`);
      if (!response.ok) throw new Error("Player search unavailable");
      const data = await response.json();
      options.innerHTML = [
        ...teamSuggestions.map((team) => `<option value="${team.name}">${team.abbr} · Team hub</option>`),
        ...(data.people || []).slice(0, 10).map((person) => `<option value="${person.fullName}">${person.primaryPosition?.abbreviation || "MLB"} · Player</option>`)
      ].join("");
    } catch (error) {
      options.innerHTML = teamSuggestions.map((team) => `<option value="${team.name}">${team.abbr} · Team hub</option>`).join("");
    }
  }

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = window.setTimeout(loadSuggestions, 180);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
      status.textContent = "Enter a player or team.";
      input.focus();
      return;
    }
    const team = teamMatch(query);
    if (team) {
      window.location.href = `teams.html?team=${encodeURIComponent(team.abbr)}`;
      return;
    }
    const routedQuestion = questionRoute(query);
    if (routedQuestion) {
      window.location.href = routedQuestion;
      return;
    }
    const route = destination.value === "splits" ? "splits.html" : destination.value === "compare" ? "compare.html" : "career.html";
    const parameter = destination.value === "compare" ? "playerA" : "player";
    window.location.href = `${route}?${parameter}=${encodeURIComponent(query)}`;
  });

  document.querySelectorAll("[data-home-question]").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.homeQuestion;
      form.requestSubmit();
    });
  });
})();
