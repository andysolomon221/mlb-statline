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
    return [...normalizedTeams.values()].find((team) => team.name.toLowerCase() === clean || team.abbr.toLowerCase() === clean) || null;
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
    const route = destination.value === "splits" ? "splits.html" : destination.value === "compare" ? "compare.html" : "career.html";
    const parameter = destination.value === "compare" ? "playerA" : "player";
    window.location.href = `${route}?${parameter}=${encodeURIComponent(query)}`;
  });
})();
