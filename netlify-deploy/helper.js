const statlineBaseUrl = "https://www.statlinebaseball.com";
const currentSeason = new Date().getFullYear();
const linkMap = {
  batting: "/batting",
  pitching: "/pitching",
  matchups: "/matchups",
  compare: "/compare",
  career: "/career",
  age: "/age",
  starts: "/starts"
};

const examples = {
  "pitcher-run": {
    topic: "A pitcher is on a dominant run and people are reacting to the latest start.",
    subject: "Jacob Misiorowski",
    stat: "1 earned run allowed since May 1",
    context: "works well with a pitching leaderboard screenshot",
    link: "pitching",
    tone: "x-reply"
  },
  "team-offense": {
    topic: "A fan is talking about how flat a lineup has looked lately.",
    subject: "Red Sox offense",
    stat: "well behind the Yankees in runs, HR, AVG, and OPS",
    context: "team comparison screenshot",
    link: "batting",
    tone: "x-reply"
  },
  "hot-hitter": {
    topic: "A player just homered and fans are talking about whether he is heating up.",
    subject: "Ozzie Albies",
    stat: "best offensive stretch since 2023",
    context: "current-season batting board",
    link: "batting",
    tone: "caption"
  },
  comparison: {
    topic: "Someone is comparing two players and the first few seasons are part of the argument.",
    subject: "first four seasons",
    stat: "one player leads in nearly every category",
    context: "player comparison screenshot",
    link: "compare",
    tone: "forum"
  }
};

function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function cleanSentence(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function selectedLink() {
  const key = $("#helper-link").value;
  return key ? `${statlineBaseUrl}${linkMap[key]}` : "";
}

function linkLabel() {
  const key = $("#helper-link").value;
  return key ? linkMap[key] : "No link";
}

function withPeriod(value) {
  const clean = cleanSentence(value);
  if (!clean) return "";
  return /[.!?]$/.test(clean) ? clean : `${clean}.`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function compactNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value || "0";
  return number.toLocaleString();
}

function formatRate(value) {
  if (value === undefined || value === null || value === "") return ".000";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toFixed(3).replace(/^0/, "");
}

function playerSearchName(person, query) {
  const cleanQuery = cleanSentence(query).toLowerCase();
  const peopleName = cleanSentence(person?.fullName).toLowerCase();
  return peopleName === cleanQuery || peopleName.includes(cleanQuery) || cleanQuery.includes(peopleName);
}

function statFromResponse(data) {
  return data?.stats?.[0]?.splits?.[0]?.stat || null;
}

async function loadPlayerStats(person, group, statType = "season") {
  const seasonParam = statType === "season" ? `&season=${currentSeason}` : "";
  const url = `https://statsapi.mlb.com/api/v1/people/${person.id}/stats?stats=${statType}&group=${group}&sportId=1${seasonParam}`;
  const data = await fetchJson(url);
  return statFromResponse(data);
}

function makeStatIdeas(person, stat, group, label) {
  const name = person.fullName;
  const ideas = [];
  if (group === "pitching") {
    if (stat.era || stat.whip || stat.inningsPitched) {
      ideas.push({
        link: "pitching",
        text: `${name}: ${stat.era || "0.00"} ERA, ${stat.whip || "0.00"} WHIP, ${stat.inningsPitched || "0.0"} IP ${label}.`
      });
    }
    if (stat.strikeOuts || stat.gamesStarted || stat.wins || stat.losses) {
      ideas.push({
        link: "pitching",
        text: `${name} has ${compactNumber(stat.strikeOuts)} SO, ${stat.gamesStarted || 0} GS, and a ${stat.wins || 0}-${stat.losses || 0} record ${label}.`
      });
    }
    if (stat.saves || stat.blownSaves) {
      ideas.push({
        link: "pitching",
        text: `${name} has ${stat.saves || 0} saves and ${stat.blownSaves || 0} blown saves ${label}.`
      });
    }
  } else {
    if (stat.avg || stat.ops || stat.slg) {
      ideas.push({
        link: "batting",
        text: `${name}: ${formatRate(stat.avg)} AVG, ${formatRate(stat.ops)} OPS, ${formatRate(stat.slg)} SLG ${label}.`
      });
    }
    if (stat.homeRuns || stat.rbi || stat.hits) {
      ideas.push({
        link: "batting",
        text: `${name} has ${stat.homeRuns || 0} HR, ${stat.rbi || 0} RBI, and ${compactNumber(stat.hits)} hits ${label}.`
      });
    }
    if (stat.stolenBases || stat.strikeOuts || stat.plateAppearances) {
      ideas.push({
        link: "batting",
        text: `${name} has ${stat.stolenBases || 0} SB and ${compactNumber(stat.strikeOuts)} SO in ${compactNumber(stat.plateAppearances)} PA ${label}.`
      });
    }
  }
  return ideas.filter((idea, index, list) => idea.text && list.findIndex((item) => item.text === idea.text) === index).slice(0, 4);
}

function renderStatIdeas(ideas) {
  const container = $("#helper-stat-ideas");
  if (!ideas.length) {
    container.innerHTML = `<p class="data-note">No clean stat angles found for that player yet. Try the exact player name.</p>`;
    return;
  }
  container.innerHTML = ideas.map((idea, index) => `
    <article class="helper-stat-idea">
      <p>${escapeHtml(idea.text)}</p>
      <button type="button" data-use-stat="${index}">Use this</button>
    </article>
  `).join("");
  document.querySelectorAll("[data-use-stat]").forEach((button) => {
    button.addEventListener("click", () => {
      const idea = ideas[Number(button.dataset.useStat)];
      if (!idea) return;
      $("#helper-stat").value = idea.text;
      $("#helper-link").value = idea.link;
      $("#helper-link-preview").textContent = linkLabel();
      renderDrafts();
    });
  });
}

async function findStatAngles() {
  const query = cleanSentence($("#helper-subject").value);
  const status = $("#helper-stat-status");
  const container = $("#helper-stat-ideas");
  if (!query) {
    status.textContent = "Type a player name first.";
    container.innerHTML = "";
    return;
  }
  status.textContent = "Looking up player stats...";
  container.innerHTML = "";
  try {
    const search = await fetchJson(`https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(query)}`);
    const people = search.people || [];
    const person = people.find((item) => playerSearchName(item, query)) || people[0];
    if (!person) {
      status.textContent = "No player found. Try the full name.";
      return;
    }
    $("#helper-subject").value = person.fullName;
    const isPitcher = person.primaryPosition?.abbreviation === "P";
    const preferredGroup = isPitcher ? "pitching" : "hitting";
    let group = preferredGroup;
    let stat = await loadPlayerStats(person, group, "season");
    let label = `in ${currentSeason}`;

    if (!stat) {
      stat = await loadPlayerStats(person, group, "career");
      label = "for his career";
    }
    if (!stat && group === "hitting") {
      group = "pitching";
      stat = await loadPlayerStats(person, group, "season");
      label = `in ${currentSeason}`;
    }
    if (!stat && group === "pitching") {
      group = "hitting";
      stat = await loadPlayerStats(person, group, "season");
      label = `in ${currentSeason}`;
    }
    if (!stat) {
      status.textContent = `${person.fullName} was found, but no usable MLB stat line came back.`;
      return;
    }
    const ideas = makeStatIdeas(person, stat, group, label);
    status.textContent = `${person.fullName} found. Pick one angle, or type your own.`;
    renderStatIdeas(ideas);
  } catch (error) {
    status.textContent = "The stat lookup did not load. Try again in a moment.";
    console.error(error);
  }
}

function makeDrafts() {
  const topic = cleanSentence($("#helper-topic").value);
  const tone = $("#helper-tone").value;
  const subject = cleanSentence($("#helper-subject").value);
  const stat = cleanSentence($("#helper-stat").value);
  const context = cleanSentence($("#helper-context").value);
  const link = selectedLink();
  const linkLine = link ? `\n\n${link}` : "";
  const sourceLine = link ? `\n\nPulled from Statline: ${link}` : "";
  const subjectText = subject || "This";
  const statText = stat || "the numbers back it up";
  const topicText = topic ? `That thread made me look this up. ` : "";
  const contextText = context ? ` ${withPeriod(context)}` : "";

  const drafts = [
    {
      title: "Natural reply",
      text: `${topicText}${subjectText} jumps out here. ${withPeriod(statText)}${contextText}${sourceLine}`
    },
    {
      title: "Cleaner stat-first",
      text: `${withPeriod(statText)} ${subject ? `${subject} is the reason this caught my eye.` : "That is the piece that caught my eye."}${contextText}${linkLine}`
    },
    {
      title: "Softer forum style",
      text: `${topic ? "That is a good baseball rabbit hole. " : ""}I checked it against the Statline board. ${subject ? `${subject}: ` : ""}${withPeriod(statText)}${contextText}${linkLine}`
    },
    {
      title: "Screenshot caption",
      text: `${subject ? `${subject} -- ` : ""}${withPeriod(statText)}${context ? ` ${context}` : ""}${link ? `\n\nSearch it here: ${link}` : ""}`
    }
  ];

  if (tone === "debate") {
    drafts.unshift({
      title: "Debate starter",
      text: `${subjectText} is a fun argument because ${statText}. Am I reading that right, or is there a better way to frame it?${linkLine}`
    });
  }

  if (tone === "caption") {
    drafts.unshift({
      title: "Short caption",
      text: `${subject ? `${subject}: ` : ""}${withPeriod(statText)}${context ? ` ${context}` : ""}`
    });
  }

  if (tone === "forum") {
    drafts.unshift({
      title: "Forum version",
      text: `I looked this up because it seemed like a good rabbit hole. ${subject ? `${subject}: ` : ""}${withPeriod(statText)}${contextText}${link ? `\n\nThe page lets you swap the player, team, season, or range: ${link}` : ""}`
    });
  }

  return drafts;
}

function renderDrafts() {
  $("#helper-link-preview").textContent = linkLabel();
  const drafts = makeDrafts();
  $("#helper-drafts").innerHTML = drafts.map((draft, index) => `
    <article class="helper-draft">
      <div>
        <span>${escapeHtml(draft.title)}</span>
        <button type="button" data-copy-draft="${index}">Copy</button>
      </div>
      <textarea readonly rows="5">${escapeHtml(draft.text)}</textarea>
    </article>
  `).join("");
  document.querySelectorAll("[data-copy-draft]").forEach((button) => {
    button.addEventListener("click", async () => {
      const text = drafts[Number(button.dataset.copyDraft)]?.text || "";
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 1400);
      } catch {
        button.textContent = "Select text";
      }
    });
  });
}

function applyExample(name) {
  const example = examples[name];
  if (!example) return;
  $("#helper-topic").value = example.topic;
  $("#helper-subject").value = example.subject;
  $("#helper-stat").value = example.stat;
  $("#helper-context").value = example.context;
  $("#helper-link").value = example.link;
  $("#helper-tone").value = example.tone;
  renderDrafts();
}

function bindHelper() {
  $("#helper-generate").addEventListener("click", renderDrafts);
  $("#helper-find-stats").addEventListener("click", findStatAngles);
  ["helper-tone", "helper-link"].forEach((id) => {
    $(`#${id}`).addEventListener("change", renderDrafts);
  });
  document.querySelectorAll("[data-helper-example]").forEach((button) => {
    button.addEventListener("click", () => applyExample(button.dataset.helperExample));
  });
  applyExample("pitcher-run");
}

bindHelper();
