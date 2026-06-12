const teams = [
  { id: "ARI", name: "Arizona Diamondbacks", league: "National League", division: "NL West", mlb: "dbacks", bref: "ARI", communities: [["Diamondbacks Reddit", "https://www.reddit.com/r/azdiamondbacks/"]] },
  { id: "ATL", name: "Atlanta Braves", league: "National League", division: "NL East", mlb: "braves", bref: "ATL", communities: [["Braves Reddit", "https://www.reddit.com/r/Braves/"]] },
  { id: "BAL", name: "Baltimore Orioles", league: "American League", division: "AL East", mlb: "orioles", bref: "BAL", communities: [["Orioles Reddit", "https://www.reddit.com/r/orioles/"]] },
  { id: "BOS", name: "Boston Red Sox", league: "American League", division: "AL East", mlb: "redsox", bref: "BOS", communities: [["Red Sox Reddit", "https://www.reddit.com/r/redsox/"], ["Sons of Sam Horn", "https://sonsofsamhorn.net/"]] },
  { id: "CHC", name: "Chicago Cubs", league: "National League", division: "NL Central", mlb: "cubs", bref: "CHC", communities: [["Cubs Reddit", "https://www.reddit.com/r/CHICubs/"]] },
  { id: "CWS", name: "Chicago White Sox", league: "American League", division: "AL Central", mlb: "whitesox", bref: "CHW", communities: [["White Sox Reddit", "https://www.reddit.com/r/whitesox/"]] },
  { id: "CIN", name: "Cincinnati Reds", league: "National League", division: "NL Central", mlb: "reds", bref: "CIN", communities: [["Reds Reddit", "https://www.reddit.com/r/Reds/"]] },
  { id: "CLE", name: "Cleveland Guardians", league: "American League", division: "AL Central", mlb: "guardians", bref: "CLE", communities: [["Guardians Reddit", "https://www.reddit.com/r/ClevelandGuardians/"]] },
  { id: "COL", name: "Colorado Rockies", league: "National League", division: "NL West", mlb: "rockies", bref: "COL", communities: [["Rockies Reddit", "https://www.reddit.com/r/ColoradoRockies/"]] },
  { id: "DET", name: "Detroit Tigers", league: "American League", division: "AL Central", mlb: "tigers", bref: "DET", communities: [["Tigers Reddit", "https://www.reddit.com/r/motorcitykitties/"]] },
  { id: "HOU", name: "Houston Astros", league: "American League", division: "AL West", mlb: "astros", bref: "HOU", communities: [["Astros Reddit", "https://www.reddit.com/r/Astros/"]] },
  { id: "KC", name: "Kansas City Royals", league: "American League", division: "AL Central", mlb: "royals", bref: "KCR", communities: [["Royals Reddit", "https://www.reddit.com/r/KCRoyals/"]] },
  { id: "LAA", name: "Los Angeles Angels", league: "American League", division: "AL West", mlb: "angels", bref: "LAA", communities: [["Angels Reddit", "https://www.reddit.com/r/angelsbaseball/"]] },
  { id: "LAD", name: "Los Angeles Dodgers", league: "National League", division: "NL West", mlb: "dodgers", bref: "LAD", communities: [["Dodgers Reddit", "https://www.reddit.com/r/Dodgers/"]] },
  { id: "MIA", name: "Miami Marlins", league: "National League", division: "NL East", mlb: "marlins", bref: "MIA", communities: [["Marlins Reddit", "https://www.reddit.com/r/letsgofish/"]] },
  { id: "MIL", name: "Milwaukee Brewers", league: "National League", division: "NL Central", mlb: "brewers", bref: "MIL", communities: [["Brewers Reddit", "https://www.reddit.com/r/Brewers/"]] },
  { id: "MIN", name: "Minnesota Twins", league: "American League", division: "AL Central", mlb: "twins", bref: "MIN", communities: [["Twins Reddit", "https://www.reddit.com/r/minnesotatwins/"]] },
  { id: "NYM", name: "New York Mets", league: "National League", division: "NL East", mlb: "mets", bref: "NYM", communities: [["Mets Reddit", "https://www.reddit.com/r/NewYorkMets/"]] },
  { id: "NYY", name: "New York Yankees", league: "American League", division: "AL East", mlb: "yankees", bref: "NYY", communities: [["Yankees Reddit", "https://www.reddit.com/r/NYYankees/"]] },
  { id: "ATH", name: "Athletics", league: "American League", division: "AL West", mlb: "athletics", bref: "OAK", communities: [["Athletics Reddit", "https://www.reddit.com/r/OaklandAthletics/"]] },
  { id: "PHI", name: "Philadelphia Phillies", league: "National League", division: "NL East", mlb: "phillies", bref: "PHI", communities: [["Phillies Reddit", "https://www.reddit.com/r/phillies/"]] },
  { id: "PIT", name: "Pittsburgh Pirates", league: "National League", division: "NL Central", mlb: "pirates", bref: "PIT", communities: [["Pirates Reddit", "https://www.reddit.com/r/buccos/"]] },
  { id: "SD", name: "San Diego Padres", league: "National League", division: "NL West", mlb: "padres", bref: "SDP", communities: [["Padres Reddit", "https://www.reddit.com/r/Padres/"]] },
  { id: "SF", name: "San Francisco Giants", league: "National League", division: "NL West", mlb: "giants", bref: "SFG", communities: [["Giants Reddit", "https://www.reddit.com/r/SFGiants/"]] },
  { id: "SEA", name: "Seattle Mariners", league: "American League", division: "AL West", mlb: "mariners", bref: "SEA", communities: [["Mariners Reddit", "https://www.reddit.com/r/Mariners/"]] },
  { id: "STL", name: "St. Louis Cardinals", league: "National League", division: "NL Central", mlb: "cardinals", bref: "STL", communities: [["Cardinals Reddit", "https://www.reddit.com/r/Cardinals/"]] },
  { id: "TB", name: "Tampa Bay Rays", league: "American League", division: "AL East", mlb: "rays", bref: "TBR", communities: [["Rays Reddit", "https://www.reddit.com/r/tampabayrays/"]] },
  { id: "TEX", name: "Texas Rangers", league: "American League", division: "AL West", mlb: "rangers", bref: "TEX", communities: [["Rangers Reddit", "https://www.reddit.com/r/TexasRangers/"]] },
  { id: "TOR", name: "Toronto Blue Jays", league: "American League", division: "AL East", mlb: "bluejays", bref: "TOR", communities: [["Blue Jays Reddit", "https://www.reddit.com/r/Torontobluejays/"]] },
  { id: "WSH", name: "Washington Nationals", league: "National League", division: "NL East", mlb: "nationals", bref: "WSN", communities: [["Nationals Reddit", "https://www.reddit.com/r/Nationals/"]] }
];

let activeTeamId = new URLSearchParams(window.location.search).get("team") || "BOS";

function team() {
  return teams.find((club) => club.id === activeTeamId) || teams[3];
}

function linkButton(label, url) {
  return `<a class="news-source-link" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

function renderSelectedTeam() {
  const club = team();
  document.querySelector("#team-select").value = club.id;
  document.querySelector("#current-team-card").textContent = club.name;
  document.querySelector("#current-team-meta").textContent = club.division;
  document.querySelector("#team-hub-title").textContent = club.name;
  document.querySelector("#team-hub-status").textContent = club.division;
  document.querySelector("#team-badge").textContent = club.id;
  document.querySelector("#team-league").textContent = club.league;
  document.querySelector("#team-name").textContent = club.name;
  document.querySelector("#team-division").textContent = club.division;
  document.querySelector("#team-primary-links").innerHTML = [
    linkButton("Official team site", `https://www.mlb.com/${club.mlb}`),
    linkButton("Baseball Reference", `https://www.baseball-reference.com/teams/${club.bref}/`),
    linkButton("Team news", `news.html?team=${club.id}`)
  ].join("");
  document.querySelector("#team-community-links").innerHTML = club.communities.map(([label, url]) => linkButton(label, url)).join("");
  document.querySelector("#team-tool-links").innerHTML = [
    linkButton("Batting leaders", `batting.html?team=${club.id}`),
    linkButton("Pitching leaders", `pitching.html?team=${club.id}`),
    linkButton("Advanced board", `advanced.html?team=${club.id}`),
    linkButton("Statcast board", `statcast.html?team=${club.id}`),
    linkButton("Matchup Lab", "matchups.html"),
    linkButton("Fantasy board", `fantasy.html?team=${club.id}`),
    linkButton("Player splits", "splits.html")
  ].join("");
  document.querySelectorAll(".team-directory-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.team === club.id);
  });
}

function renderControls() {
  document.querySelector("#team-select").innerHTML = teams.map((club) => `<option value="${club.id}">${club.name}</option>`).join("");
  document.querySelector("#team-community-count").textContent = teams.filter((club) => club.communities.length).length;
}

function renderDirectory() {
  const query = document.querySelector("#team-search").value.trim().toLowerCase();
  const filtered = teams.filter((club) => {
    const haystack = `${club.id} ${club.name} ${club.league} ${club.division}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  document.querySelector("#team-directory-grid").innerHTML = filtered.map((club) => `
    <button class="team-directory-card" type="button" data-team="${club.id}">
      <span class="club-badge">${club.id}</span>
      <span>
        <strong>${club.name}</strong>
        <small>${club.division}</small>
      </span>
    </button>
  `).join("") || `<div class="empty-state">No teams match this search.</div>`;
  document.querySelectorAll(".team-directory-card").forEach((card) => {
    card.addEventListener("click", () => {
      activeTeamId = card.dataset.team;
      renderSelectedTeam();
      document.querySelector("#team-hub").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  renderSelectedTeam();
}

document.querySelector("#team-search").addEventListener("input", renderDirectory);
document.querySelector("#team-select").addEventListener("change", (event) => {
  activeTeamId = event.target.value;
  renderSelectedTeam();
});

renderControls();
renderDirectory();
