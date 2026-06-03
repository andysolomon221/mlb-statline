const menuProviders = [
  { match: "dutchie.com", provider: "Dutchie menu" },
  { match: "dutchieplus.com", provider: "Dutchie menu" },
  { match: "iheartjane.com", provider: "Jane menu" },
  { match: "weedmaps.com", provider: "Weedmaps menu" },
  { match: "leafly.com", provider: "Leafly menu" },
  { match: "cannmenus.com", provider: "CannMenus" },
  { match: "treez.io", provider: "Treez menu" },
  { match: "ecom.tymber.io", provider: "Tymber menu" },
  { match: "sweede.io", provider: "Sweede menu" },
  { match: "dispenseapp.com", provider: "Dispense menu" },
];

const menuPaths = [
  "/menu",
  "/menus",
  "/shop",
  "/order",
  "/order-online",
  "/online-ordering",
  "/dispensary-menu",
  "/recreational-menu",
  "/medical-menu",
  "/pickup",
];

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const { places = [] } = JSON.parse(event.body || "{}");
    const sources = {};
    const limitedPlaces = places.slice(0, 18);

    await Promise.all(
      limitedPlaces.map(async (place) => {
        const source = await discoverMenu(place);
        if (!source) return;
        sources[place.id] = source;
        sources[String(place.name || "").toLowerCase()] = source;
      }),
    );

    return json(200, { sources });
  } catch (error) {
    return json(500, { error: error.message || "Menu discovery failed" });
  }
};

async function discoverMenu(place) {
  const website = normalizeUrl(place.officialWebsite);
  if (!website) return null;

  const directProvider = providerFor(website);
  if (directProvider) {
    return { url: website, provider: directProvider.provider };
  }

  const html = await fetchText(website);
  const htmlLinks = html ? extractLinks(html, website) : [];
  const providerLink = htmlLinks.find((link) => providerFor(link));
  if (providerLink) {
    return { url: providerLink, provider: providerFor(providerLink).provider };
  }

  const menuLink = htmlLinks.find((link) => looksLikeMenuUrl(link));
  if (menuLink) {
    return { url: menuLink, provider: providerFor(menuLink)?.provider || "Official menu" };
  }

  const candidates = buildCandidateUrls(website);
  for (const candidate of candidates) {
    if (await urlExists(candidate)) {
      return { url: candidate, provider: providerFor(candidate)?.provider || "Official menu" };
    }
  }

  return null;
}

function normalizeUrl(url) {
  try {
    if (!url) return "";
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.href;
  } catch {
    return "";
  }
}

async function fetchText(url) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": "AC-Andys-Dispensary-Finder/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    const type = response.headers.get("content-type") || "";
    if (!response.ok || !type.includes("text/html")) return "";
    return response.text();
  } catch {
    return "";
  }
}

function extractLinks(html, baseUrl) {
  const links = new Set();
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefPattern.exec(html))) {
    try {
      const url = new URL(match[1], baseUrl);
      if (url.protocol === "http:" || url.protocol === "https:") {
        links.add(url.href);
      }
    } catch {
      // Ignore malformed links.
    }
  }
  return [...links];
}

function buildCandidateUrls(website) {
  const parsed = new URL(website);
  return menuPaths.map((path) => `${parsed.origin}${path}`);
}

function looksLikeMenuUrl(url) {
  const lower = url.toLowerCase();
  return menuProviders.some((provider) => lower.includes(provider.match)) ||
    menuPaths.some((path) => lower.includes(path.slice(1)));
}

function providerFor(url) {
  const lower = url.toLowerCase();
  return menuProviders.find((provider) => lower.includes(provider.match));
}

async function urlExists(url) {
  try {
    const response = await fetchWithTimeout(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": "AC-Andys-Dispensary-Finder/1.0" },
    });
    if (response.ok) return true;
    if (response.status === 405) {
      const getResponse = await fetchWithTimeout(url, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "AC-Andys-Dispensary-Finder/1.0" },
      });
      return getResponse.ok;
    }
    return false;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
