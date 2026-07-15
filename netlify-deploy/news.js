const teams = [
  ["all", "All MLB", []],
  ["ARI", "Arizona Diamondbacks", ["diamondbacks", "d-backs", "ari", "arizona"]],
  ["ATL", "Atlanta Braves", ["braves", "atl", "atlanta"]],
  ["BAL", "Baltimore Orioles", ["orioles", "bal", "baltimore"]],
  ["BOS", "Boston Red Sox", ["red sox", "bos", "boston"]],
  ["CHC", "Chicago Cubs", ["cubs", "chc", "wrigley"]],
  ["CWS", "Chicago White Sox", ["white sox", "cws"]],
  ["CIN", "Cincinnati Reds", ["reds", "cin", "cincinnati"]],
  ["CLE", "Cleveland Guardians", ["guardians", "cle", "cleveland"]],
  ["COL", "Colorado Rockies", ["rockies", "col", "colorado"]],
  ["DET", "Detroit Tigers", ["tigers", "det", "detroit"]],
  ["HOU", "Houston Astros", ["astros", "hou", "houston"]],
  ["KC", "Kansas City Royals", ["royals", "kc", "kansas city"]],
  ["LAA", "Los Angeles Angels", ["angels", "laa", "anaheim"]],
  ["LAD", "Los Angeles Dodgers", ["dodgers", "lad"]],
  ["MIA", "Miami Marlins", ["marlins", "mia", "miami"]],
  ["MIL", "Milwaukee Brewers", ["brewers", "mil", "milwaukee"]],
  ["MIN", "Minnesota Twins", ["twins", "min", "minnesota"]],
  ["NYM", "New York Mets", ["mets", "nym"]],
  ["NYY", "New York Yankees", ["yankees", "nyy"]],
  ["ATH", "Athletics", ["athletics", "a's", "ath"]],
  ["PHI", "Philadelphia Phillies", ["phillies", "phi", "philadelphia"]],
  ["PIT", "Pittsburgh Pirates", ["pirates", "pit", "pittsburgh"]],
  ["SD", "San Diego Padres", ["padres", "sd", "san diego"]],
  ["SF", "San Francisco Giants", ["giants", "sf", "san francisco"]],
  ["SEA", "Seattle Mariners", ["mariners", "sea", "seattle"]],
  ["STL", "St. Louis Cardinals", ["cardinals", "stl", "st. louis"]],
  ["TB", "Tampa Bay Rays", ["rays", "tb", "tampa bay"]],
  ["TEX", "Texas Rangers", ["rangers", "tex", "texas"]],
  ["TOR", "Toronto Blue Jays", ["blue jays", "tor", "toronto"]],
  ["WSH", "Washington Nationals", ["nationals", "nats", "wsh", "washington"]]
];

let stories = [];
let activeTeam = new URLSearchParams(window.location.search).get("team") || "all";
let activeSource = "all";
let activeTopic = "all";

if (!teams.some(([key]) => key === activeTeam)) {
  activeTeam = "all";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const fallbackSources = [
  ["MLB.com News", "https://www.mlb.com/news"],
  ["CBS Sports MLB", "https://www.cbssports.com/mlb/"],
  ["Associated Press MLB", "https://apnews.com/hub/mlb"]
];

const teamForums = {
  ARI: [
    ["Diamondbacks Reddit", "https://www.reddit.com/r/azdiamondbacks/"]
  ],
  ATL: [
    ["Braves Reddit", "https://www.reddit.com/r/Braves/"]
  ],
  BAL: [
    ["Orioles Reddit", "https://www.reddit.com/r/orioles/"]
  ],
  BOS: [
    ["Red Sox Reddit", "https://www.reddit.com/r/redsox/"],
    ["Sons of Sam Horn", "https://sonsofsamhorn.net/"]
  ],
  CHC: [
    ["Cubs Reddit", "https://www.reddit.com/r/CHICubs/"]
  ],
  CWS: [
    ["White Sox Reddit", "https://www.reddit.com/r/whitesox/"]
  ],
  CIN: [
    ["Reds Reddit", "https://www.reddit.com/r/Reds/"]
  ],
  CLE: [
    ["Guardians Reddit", "https://www.reddit.com/r/ClevelandGuardians/"]
  ],
  COL: [
    ["Rockies Reddit", "https://www.reddit.com/r/ColoradoRockies/"]
  ],
  DET: [
    ["Tigers Reddit", "https://www.reddit.com/r/motorcitykitties/"]
  ],
  HOU: [
    ["Astros Reddit", "https://www.reddit.com/r/Astros/"]
  ],
  KC: [
    ["Royals Reddit", "https://www.reddit.com/r/KCRoyals/"]
  ],
  LAA: [
    ["Angels Reddit", "https://www.reddit.com/r/angelsbaseball/"]
  ],
  LAD: [
    ["Dodgers Reddit", "https://www.reddit.com/r/Dodgers/"]
  ],
  MIA: [
    ["Marlins Reddit", "https://www.reddit.com/r/letsgofish/"]
  ],
  MIL: [
    ["Brewers Reddit", "https://www.reddit.com/r/Brewers/"]
  ],
  MIN: [
    ["Twins Reddit", "https://www.reddit.com/r/minnesotatwins/"]
  ],
  NYM: [
    ["Mets Reddit", "https://www.reddit.com/r/NewYorkMets/"]
  ],
  NYY: [
    ["Yankees Reddit", "https://www.reddit.com/r/NYYankees/"]
  ],
  ATH: [
    ["Athletics Reddit", "https://www.reddit.com/r/OaklandAthletics/"]
  ],
  PHI: [
    ["Phillies Reddit", "https://www.reddit.com/r/phillies/"]
  ],
  PIT: [
    ["Pirates Reddit", "https://www.reddit.com/r/buccos/"]
  ],
  SD: [
    ["Padres Reddit", "https://www.reddit.com/r/Padres/"]
  ],
  SF: [
    ["Giants Reddit", "https://www.reddit.com/r/SFGiants/"]
  ],
  SEA: [
    ["Mariners Reddit", "https://www.reddit.com/r/Mariners/"]
  ],
  STL: [
    ["Cardinals Reddit", "https://www.reddit.com/r/Cardinals/"]
  ],
  TB: [
    ["Rays Reddit", "https://www.reddit.com/r/tampabayrays/"]
  ],
  TEX: [
    ["Rangers Reddit", "https://www.reddit.com/r/TexasRangers/"]
  ],
  TOR: [
    ["Blue Jays Reddit", "https://www.reddit.com/r/Torontobluejays/"]
  ],
  WSH: [
    ["Nationals Reddit", "https://www.reddit.com/r/Nationals/"]
  ]
};

function teamRecord() {
  return teams.find(([key]) => key === activeTeam) || teams[0];
}

function formatDate(value) {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function storyMatchesTeam(story) {
  if (activeTeam === "all") return true;
  const [, , terms] = teamRecord();
  const haystack = `${story.title} ${story.description}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function storyMatchesTopic(story) {
  if (activeTopic === "all") return true;
  const topicTerms = {
    fantasy: ["fantasy", "prop", "draft", "odds", "bet"],
    injury: ["injury", "injuries", "injured", "il", "day-to-day"],
    trade: ["trade", "rumor", "deadline", "acquire", "deal"],
    prospect: ["prospect", "minor league", "callup", "call-up", "rookie", "draft"]
  };
  const haystack = `${story.title} ${story.description}`.toLowerCase();
  return (topicTerms[activeTopic] || []).some((term) => haystack.includes(term));
}

function filteredStories() {
  const query = document.querySelector("#news-search").value.trim().toLowerCase();
  return stories.filter((story) => {
    const matchesSource = activeSource === "all" || story.source === activeSource;
    const matchesQuery = !query || `${story.title} ${story.description} ${story.source}`.toLowerCase().includes(query);
    return matchesSource && matchesQuery && storyMatchesTeam(story) && storyMatchesTopic(story);
  });
}

function renderControls() {
  document.querySelector("#news-team").innerHTML = teams.map(([key, name]) => `<option value="${key}">${name}</option>`).join("");
  document.querySelector("#news-team").value = activeTeam;
  const sources = Array.from(new Set(stories.map((story) => story.source))).sort();
  document.querySelector("#news-source").innerHTML = `<option value="all">All sources</option>${sources.map((source) => `<option value="${source}">${source}</option>`).join("")}`;
  document.querySelector("#news-source").value = activeSource;
  document.querySelectorAll("[data-news-topic]").forEach((button) => {
    button.classList.toggle("active", button.dataset.newsTopic === activeTopic);
  });
}

function renderSummary(data) {
  document.querySelector("#news-count").textContent = data.length;
  document.querySelector("#news-count-note").textContent = stories.length ? `${stories.length} total loaded` : "No live feed data";
  document.querySelector("#news-team-card").textContent = teamRecord()[1];
  document.querySelector("#news-source-count").textContent = new Set(stories.map((story) => story.source)).size || fallbackSources.length;
  document.querySelector("#news-updated").textContent = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function renderStories() {
  const data = filteredStories();
  renderSummary(data);
  document.querySelector("#news-title").textContent = activeTeam === "all" ? "Latest baseball stories" : `${teamRecord()[1]} stories`;
  document.querySelector("#news-grid").innerHTML = data.map((story) => `
    <article class="news-card">
      ${story.image ? `<img src="${story.image}" alt="${escapeHtml(story.title)}" loading="lazy" />` : ""}
      <div>
        <span class="news-source">${story.source} | ${formatDate(story.pubDate)}</span>
        <h3><a href="${story.link}" target="_blank" rel="noopener noreferrer">${story.title}</a></h3>
        <p>${story.description || "Open the source story for more details."}</p>
      </div>
    </article>
  `).join("") || `<div class="empty-state">No stories match this filter.</div>`;
}

function renderSourceLinks() {
  document.querySelector("#news-source-list").innerHTML = fallbackSources.map(([name, url]) => `
    <a class="news-source-link" href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>
  `).join("");
}

function renderForumLinks() {
  const [teamKey, teamName] = teamRecord();
  const forums = teamForums[teamKey] || [];
  document.querySelector("#forum-title").textContent = activeTeam === "all" ? "Team community links" : `${teamName} fan communities`;
  document.querySelector("#forum-link-list").innerHTML = forums.length
    ? forums.map(([name, url]) => `<a class="news-source-link" href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`).join("")
    : `<div class="empty-state">Select a team to see public fan community links.</div>`;
}

async function loadNews() {
  document.querySelector("#news-status").textContent = "Loading news...";
  renderSourceLinks();
  try {
    const response = await fetch("/.netlify/functions/news");
    if (!response.ok) throw new Error(`News function returned ${response.status}`);
    const data = await response.json();
    stories = data.stories || [];
    renderControls();
    renderStories();
    document.querySelector("#news-status").textContent = stories.length ? `${stories.length} stories loaded` : "Source links only";
  } catch (error) {
    stories = [];
    renderControls();
    renderStories();
    document.querySelector("#news-grid").innerHTML = `<div class="empty-state">Live headlines could not load here. Use the source links below for free baseball news.</div>`;
    document.querySelector("#news-status").textContent = "Source links only";
  }
}

function bindEvents() {
  document.querySelector("#news-search").addEventListener("input", renderStories);
  document.querySelector("#news-team").addEventListener("change", (event) => {
    activeTeam = event.target.value;
    renderStories();
    renderForumLinks();
  });
  document.querySelector("#news-source").addEventListener("change", (event) => {
    activeSource = event.target.value;
    renderStories();
  });
  document.querySelectorAll("[data-news-topic]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTopic = button.dataset.newsTopic;
      renderControls();
      renderStories();
    });
  });
}

bindEvents();
renderForumLinks();
loadNews();
