const realMenuSources = [
  {
    match: "wildflower market",
    url: "https://njdispo.com/stores/the-wildflower-market",
    provider: "Official menu",
  },
  {
    match: "honorable plant",
    url: "https://njdispo.com/stores/the-honorable-plant",
    provider: "Official menu",
  },
  {
    match: "shipwreck",
    url: "https://weedmaps.com/dispensaries/shipwreck-d",
    provider: "Weedmaps live menu",
  },
  {
    match: "canopy crossroad",
    url: "https://weedmaps.com/dispensaries/canopy-crossroad",
    provider: "Weedmaps live menu",
  },
  {
    match: "fresh dispensary",
    url: "https://www.leafly.com/dispensary-info/fresh-dispensary-eatontown-llc",
    provider: "Leafly menu",
  },
  {
    match: "east coasting",
    url: "https://cannmenus.com/dispensaries/new-jersey/eatontown/20912-east-coasting-cannabis-dispensary-eatontown",
    provider: "CannMenus",
  },
  {
    match: "zen leaf",
    url: "https://zenleafdispensaries.com/locations/neptune/recreational-menu/",
    provider: "Official menu",
  },
  {
    match: "legal leaf",
    url: "https://legalleafap.company.site/",
    provider: "Official shop",
  },
  {
    match: "frosted nug",
    url: "https://frostednug.com/menu/red-bank",
    provider: "Official menu",
  },
  {
    match: "ayr",
    url: "https://ayrdispensaries.com/new-jersey/dispensary/ayr-dispensary-eatontown-adult-use/",
    provider: "Official menu",
  },
  {
    match: "monteverde",
    url: "https://www.leafly.com/dispensary-info/monteverde-nj-inc",
    provider: "Leafly menu",
  },
  {
    match: "nj leaf",
    url: "https://www.leafly.com/dispensary-info/nj-leaf-medical",
    provider: "Leafly menu",
  },
];

const menuProviderPatterns = [
  { host: "dutchie.com", provider: "Dutchie menu" },
  { host: "dutchieplus.com", provider: "Dutchie menu" },
  { host: "iheartjane.com", provider: "Jane menu" },
  { host: "weedmaps.com", provider: "Weedmaps menu" },
  { host: "leafly.com", provider: "Leafly menu" },
  { host: "cannmenus.com", provider: "CannMenus" },
  { host: "shopflorist.com", provider: "Florist menu" },
  { host: "treez.io", provider: "Treez menu" },
  { host: "ecom.tymber.io", provider: "Tymber menu" },
  { host: "sweede.io", provider: "Sweede menu" },
  { host: "dispenseapp.com", provider: "Dispense menu" },
  { path: "menu", provider: "Official menu" },
  { path: "shop", provider: "Official shop" },
  { path: "order", provider: "Official order menu" },
  { path: "pickup", provider: "Official pickup menu" },
];

const sponsoredPlacement = {
  title: "Featured spot available",
  body: "Dispensaries can promote verified menus, pickup links, and local offers to shoppers searching nearby.",
  action: "Advertise here",
  email: "andysolomon1124@gmail.com",
};

const state = {
  places: [],
  source: "Choose area",
  area: "Use my location",
  rating: 0,
  distance: 5,
  isLoading: false,
  openOnly: false,
  sort: "rating",
  center: { lat: 45.5152, lng: -122.6784 },
};

const elements = {
  form: document.querySelector("#search-form"),
  locationInput: document.querySelector("#location-input"),
  nearMeButton: document.querySelector("#near-me-button"),
  ratingFilter: document.querySelector("#rating-filter"),
  ratingLabel: document.querySelector("#rating-label"),
  distanceFilter: document.querySelector("#distance-filter"),
  distanceLabel: document.querySelector("#distance-label"),
  openFilter: document.querySelector("#open-filter"),
  sortSelect: document.querySelector("#sort-select"),
  results: document.querySelector("#results"),
  status: document.querySelector("#status"),
  areaHeading: document.querySelector("#area-heading"),
  countHeading: document.querySelector("#count-heading"),
  sourcePill: document.querySelector("#source-pill"),
  resultKicker: document.querySelector("#result-kicker"),
  markers: document.querySelector("#map-markers"),
  mapWrap: document.querySelector(".map-wrap"),
  googleMap: document.querySelector("#google-map"),
  apiKeyInput: document.querySelector("#api-key-input"),
  saveKeyButton: document.querySelector("#save-key-button"),
  testKeyButton: document.querySelector("#test-key-button"),
  discoverMenusButton: document.querySelector("#discover-menus-button"),
  clearKeyButton: document.querySelector("#clear-key-button"),
  apiKeyStatus: document.querySelector("#api-key-status"),
  menuDiscoveryStatus: document.querySelector("#menu-discovery-status"),
};

const storageKey = "dispensaryFinder.googleMapsKey";
const defaultGoogleMapsKey = "AIzaSyApb7GYelQ4U9Fm1GhnmTo3bVI8uKP7njg";
const menuCacheKey = "dispensaryFinder.menuSources";
let googleMapsLoad;
let googleMap;
let googleMarkers = [];
let distanceSearchTimer;
let areaAutocomplete;
let activeSearchId = 0;

function init() {
  elements.apiKeyInput.value = localStorage.getItem(storageKey) || "";
  wireEvents();
  updateApiKeyStatus();
  enableAreaAutocomplete();
  const params = new URLSearchParams(window.location.search);
  const initialArea = params.get("location");
  const initialDistance = Number(params.get("distance"));
  if (initialDistance >= 1) {
    state.distance = Math.min(initialDistance, 25);
  }
  if (initialArea) {
    elements.locationInput.value = initialArea;
    searchArea(initialArea);
  } else {
    elements.locationInput.value = "";
    useCurrentLocation({ automatic: true });
    render();
  }
}

function wireEvents() {
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    searchArea(elements.locationInput.value.trim() || state.area || "Long Branch, NJ");
  });

  elements.locationInput.addEventListener("focus", enableAreaAutocomplete);
  elements.nearMeButton.addEventListener("click", useCurrentLocation);
  elements.ratingFilter.addEventListener("input", () => {
    state.rating = Number(elements.ratingFilter.value);
    render();
  });
  elements.distanceFilter.addEventListener("input", () => {
    state.distance = Number(elements.distanceFilter.value);
    render();
    scheduleDistanceSearch();
  });
  elements.distanceFilter.addEventListener("change", () => {
    runDistanceSearch();
  });
  elements.openFilter.addEventListener("change", () => {
    state.openOnly = elements.openFilter.checked;
    render();
  });
  elements.sortSelect.addEventListener("change", () => {
    state.sort = elements.sortSelect.value;
    render();
  });
  elements.saveKeyButton.addEventListener("click", () => {
    if (saveApiKeyFromInput()) {
      setStatus("Key saved. Search an area to load live Google ratings.");
    }
  });
  elements.apiKeyInput.addEventListener("input", () => {
    const key = elements.apiKeyInput.value.trim();
    if (key) {
      localStorage.setItem(storageKey, key);
      enableAreaAutocomplete();
    } else {
      localStorage.removeItem(storageKey);
    }
    updateApiKeyStatus();
  });
  elements.testKeyButton.addEventListener("click", () => {
    const typedKey = elements.apiKeyInput.value.trim();
    if (typedKey) {
      saveApiKeyFromInput();
    } else if (!getGoogleMapsKey()) {
      setStatus("Paste a Google Maps API key first.");
      return;
    }
    const area = elements.locationInput.value.trim() || state.area || "Long Branch, NJ";
    searchArea(area);
  });
  elements.discoverMenusButton.addEventListener("click", () => {
    discoverMenusForCurrentResults();
  });
  elements.clearKeyButton.addEventListener("click", () => {
    localStorage.removeItem(storageKey);
    elements.apiKeyInput.value = "";
    updateApiKeyStatus();
    setStatus("Saved key cleared. The site key is still enabled for live Google results.");
  });
}

function scheduleDistanceSearch() {
  window.clearTimeout(distanceSearchTimer);
  distanceSearchTimer = window.setTimeout(runDistanceSearch, 700);
}

function runDistanceSearch() {
  window.clearTimeout(distanceSearchTimer);
  if (state.source !== "Google Places" || !getGoogleMapsKey()) {
    return;
  }
  searchArea(elements.locationInput.value.trim() || state.area || "Portland, OR");
}

async function enableAreaAutocomplete() {
  const apiKey = getGoogleMapsKey();
  if (!apiKey || areaAutocomplete || window.location.protocol === "file:") {
    return;
  }
  try {
    await loadGoogleMaps(apiKey);
    areaAutocomplete = new google.maps.places.Autocomplete(elements.locationInput, {
      componentRestrictions: { country: "us" },
      fields: ["formatted_address", "geometry", "name"],
      types: ["(cities)"],
    });
    areaAutocomplete.addListener("place_changed", () => {
      const place = areaAutocomplete.getPlace();
      const area = place.formatted_address || place.name || elements.locationInput.value.trim();
      if (!area) return;
      elements.locationInput.value = area;
      if (place.geometry?.location) {
        state.center = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
      }
      searchArea(area);
    });
  } catch (error) {
    setStatus(`${friendlyGoogleError(error)} Type a city, state, or ZIP code to search.`);
  }
}

function saveApiKeyFromInput() {
  const key = elements.apiKeyInput.value.trim();
  if (!key) {
    setStatus("Paste a Google Maps API key first.");
    return false;
  }
  localStorage.setItem(storageKey, key);
  updateApiKeyStatus();
  return true;
}

async function searchArea(area) {
  const searchId = ++activeSearchId;
  state.area = area;
  state.places = [];
  state.isLoading = true;
  setStatus(`Searching for cannabis dispensaries near ${area}...`);
  render();

  const apiKey = getGoogleMapsKey();
  if (apiKey) {
    if (window.location.protocol === "file:") {
      state.places = [];
      state.source = "Live search unavailable";
      state.isLoading = false;
      setStatus("Google Places will not run from a file URL. Open http://localhost:4174/ to use the saved API key.");
      render();
      return;
    }
    try {
      const places = await searchGooglePlaces(area, apiKey);
      if (searchId !== activeSearchId) return;
      state.places = places.length ? hydrateMenuSources(places) : [];
      state.source = places.length ? "Google Places" : "No live results";
      state.isLoading = false;
      setStatus(places.length ? "" : `No live cannabis dispensaries found near ${area}.`);
      updateMenuDiscoveryStatus();
    } catch (error) {
      if (searchId !== activeSearchId) return;
      state.places = [];
      state.source = "Live search failed";
      state.isLoading = false;
      setStatus(friendlyGoogleError(error));
      updateMenuDiscoveryStatus();
    }
  } else {
    if (searchId !== activeSearchId) return;
    state.places = [];
    state.source = "Live search unavailable";
    state.isLoading = false;
    setStatus("Add a Google Maps API key to pull real nearby ratings.");
    updateMenuDiscoveryStatus();
  }

  render();
}

function useCurrentLocation(options = {}) {
  if (!navigator.geolocation) {
    if (options.automatic) {
      state.places = [];
      state.source = "Choose area";
      state.isLoading = false;
      state.area = "Choose an area";
      render();
    }
    setStatus(options.automatic ? "Type a city, state, or ZIP code to search nearby dispensaries." : "This browser does not support location lookup.");
    return;
  }

  state.isLoading = true;
  state.area = "Your area";
  setStatus(options.automatic ? "Use your location to show nearby dispensaries, or type an area to search." : "Finding your location...");
  render();
  let locationSettled = false;
  const fallbackTimer = window.setTimeout(() => {
    if (!locationSettled) {
      locationSettled = true;
      if (options.automatic) {
        state.places = [];
        state.source = "Choose area";
        state.isLoading = false;
        setStatus("Type a city, state, or ZIP code to search nearby dispensaries.");
        state.area = "Choose an area";
        render();
      } else {
        fallbackToTypedArea("Browser location did not respond");
      }
    }
  }, 4500);

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      if (locationSettled) return;
      locationSettled = true;
      window.clearTimeout(fallbackTimer);
      state.center = { lat: coords.latitude, lng: coords.longitude };
      state.area = "Current location";
      elements.locationInput.value = "Current location";
      await searchCoordinates(coords.latitude, coords.longitude);
    },
    () => {
      if (locationSettled) return;
      locationSettled = true;
      window.clearTimeout(fallbackTimer);
      if (options.automatic) {
        state.places = [];
        state.source = "Choose area";
        state.isLoading = false;
        setStatus("Location permission was blocked. Type a city, state, or ZIP code to search.");
        state.area = "Choose an area";
        render();
      } else {
        fallbackToTypedArea("Browser location permission was blocked");
      }
    },
    { enableHighAccuracy: true, maximumAge: 60000, timeout: 4000 },
  );
}

async function fallbackToTypedArea(reason) {
  const fallbackArea = elements.locationInput.value.trim() || state.area || "Portland, OR";
  await searchArea(fallbackArea);
  setStatus(`${reason}. Showing results for ${fallbackArea} instead.`);
}

async function searchCoordinates(lat, lng) {
  const apiKey = getGoogleMapsKey();
  if (!apiKey) {
    state.places = [];
    state.source = "Live search unavailable";
    state.isLoading = false;
    setStatus("Exact location found. Add a Google Maps API key to pull live Google results.");
    render();
    return;
  }

  try {
    setStatus("Searching near your location...");
    const places = await searchGooglePlacesAt({ lat, lng }, apiKey);
    state.places = hydrateMenuSources(places);
    state.source = "Google Places";
    state.isLoading = false;
    setStatus("");
    updateMenuDiscoveryStatus();
  } catch (error) {
    state.places = [];
    state.source = "Live search failed";
    state.isLoading = false;
    setStatus(`Live search could not load: ${error.message}.`);
    updateMenuDiscoveryStatus();
  }
  render();
}

async function searchGooglePlaces(area, apiKey) {
  await loadGoogleMaps(apiKey);
  const geocoder = new google.maps.Geocoder();
  const { results } = await geocoder.geocode({ address: area });
  if (!results.length) {
    throw new Error("area not found");
  }
  const location = results[0].geometry.location;
  state.center = { lat: location.lat(), lng: location.lng() };
  return searchGooglePlacesAt(state.center, apiKey, area);
}

async function searchGooglePlacesAt(center, apiKey, area = "") {
  await loadGoogleMaps(apiKey);
  const serviceElement = document.createElement("div");
  const service = new google.maps.places.PlacesService(serviceElement);
  const target = area || `${center.lat},${center.lng}`;
  const maxPages = state.distance > 15 ? 2 : 1;
  const detailLimit = state.distance <= 5 ? 18 : state.distance <= 15 ? 24 : 30;
  const searches = [
    `cannabis dispensary near ${target}`,
    `marijuana dispensary near ${target}`,
    `cannabis delivery near ${target}`,
  ];
  const keywordSearches = ["cannabis dispensary", "marijuana dispensary", "cannabis delivery"];
  if (state.distance > 5) {
    searches.push(`recreational cannabis near ${target}`);
    keywordSearches.push("recreational cannabis");
  }
  if (state.distance > 15) {
    searches.push(`weed dispensary near ${target}`, `dispensary within ${state.distance} miles of ${target}`);
  }

  const searchRequests = [
    ...searches.map((query) =>
      textSearchPlaces(
        service,
        {
          query,
          location: new google.maps.LatLng(center.lat, center.lng),
          radius: milesToMeters(state.distance),
        },
        maxPages,
      ),
    ),
    ...keywordSearches.map((keyword) =>
      nearbySearchPlaces(
        service,
        {
          keyword,
          location: new google.maps.LatLng(center.lat, center.lng),
          radius: milesToMeters(state.distance),
        },
        maxPages,
      ),
    ),
  ];
  const searchResults = await Promise.allSettled(searchRequests);
  const results = searchResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  const enrichedPlaces = await Promise.all(
    dedupePlaces(results)
      .filter((place) => {
        const lat = place.geometry?.location?.lat() ?? center.lat;
        const lng = place.geometry?.location?.lng() ?? center.lng;
        return getDistanceMiles(center.lat, center.lng, lat, lng) <= state.distance;
      })
      .slice(0, detailLimit)
      .map((place) => getPlaceDetails(service, place)),
  );

  return enrichedPlaces
    .map((place) => {
      const lat = place.geometry?.location?.lat() ?? center.lat;
      const lng = place.geometry?.location?.lng() ?? center.lng;
      const realMenu = getCachedMenuSource(place) || getRealMenuSource(place.name);
      return {
        name: place.name,
        placeId: place.place_id || "",
        rating: place.rating || 0,
        reviews: place.user_ratings_total || 0,
        address: place.formatted_address || place.vicinity || "Address unavailable",
        cityState: getCityStateFromAddress(place.formatted_address || place.vicinity || ""),
        distance: getDistanceMiles(center.lat, center.lng, lat, lng),
        openNow: place.opening_hours?.open_now ?? null,
        hours: getTodayHours(place.opening_hours),
        weeklyHours: place.opening_hours?.weekday_text || [],
        phone: place.formatted_phone_number || "",
        officialWebsite: place.website || "",
        website: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + " " + (place.formatted_address || ""))}`,
        reviewsUrl: place.place_id
          ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(place.place_id)}`
          : "",
        realMenuUrl: realMenu?.url || "",
        realMenuProvider: realMenu?.provider || "",
        deliveryNote: getDeliveryNote(place),
        lat,
        lng,
      };
    })
    .filter(isDispensaryResult);
}

function isDispensaryResult(place) {
  const nameText = `${place.name || ""} ${place.officialWebsite || ""}`.toLowerCase();
  const text = `${place.name || ""} ${place.address || ""} ${place.officialWebsite || ""}`.toLowerCase();
  const medicalOfficeTerms = [
    "doctor",
    "physician",
    "clinic",
    "certification",
    "certified",
    "medical card",
    "mmj card",
    "recommendation",
    "evaluation",
    "telehealth",
    "telemedicine",
    "urgent care",
    "health center",
  ];
  if (medicalOfficeTerms.some((term) => nameText.includes(term))) {
    return false;
  }
  const blockedTerms = [
    "smoke shop",
    "smokeshop",
    "vape",
    "cigar",
    "hookah",
    "tobacco",
    "cbd shop",
    "cbd store",
    "delta 8",
    "kratom",
  ];
  if (blockedTerms.some((term) => text.includes(term))) {
    return false;
  }
  const dispensaryTerms = ["dispensary", "cannabis store", "marijuana store", "weed dispensary", "adult-use", "recreational cannabis"];
  const deliveryTerms = ["cannabis delivery", "marijuana delivery", "weed delivery", "delivery service"];
  return dispensaryTerms.some((term) => text.includes(term)) || deliveryTerms.some((term) => text.includes(term));
}

function getDeliveryNote(place) {
  const text = `${place.name || ""} ${place.formatted_address || ""} ${place.vicinity || ""} ${place.website || ""}`.toLowerCase();
  if (text.includes("delivery")) {
    return "Delivery";
  }
  return "";
}

function getCityStateFromAddress(address = "") {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return "";
  const city = parts[parts.length - 3] || parts[parts.length - 2] || "";
  const stateMatch = (parts[parts.length - 2] || "").match(/\b[A-Z]{2}\b/);
  if (!city || !stateMatch) return "";
  return `${city}, ${stateMatch[0]}`;
}

function dedupePlaces(places) {
  const seen = new Set();
  return places.filter((place) => {
    const key = place.place_id || `${place.name}-${place.formatted_address || place.vicinity}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getRealMenuSource(name) {
  const normalized = name.toLowerCase();
  return realMenuSources.find((source) => normalized.includes(source.match));
}

function getCachedMenuSource(place) {
  const cache = getMenuCache();
  return cache[getMenuCacheId(place)] || cache[place.name.toLowerCase()] || discoverMenuSourceForPlace(place);
}

function hydrateMenuSources(places) {
  return places.map((place) => {
    const source = getCachedMenuSource(place);
    if (!source) return place;
    saveMenuSource(place, source);
    return {
      ...place,
      realMenuUrl: source.url,
      realMenuProvider: source.provider,
    };
  });
}

function discoverMenuSourceForPlace(place) {
  const known = getRealMenuSource(place.name);
  if (known) {
    return { url: known.url, provider: known.provider };
  }
  const url = place.officialWebsite || place.website;
  if (!url) return null;
  const normalized = url.toLowerCase();
  const pattern = menuProviderPatterns.find((candidate) => {
    if (candidate.host && normalized.includes(candidate.host)) return true;
    if (candidate.path && normalized.includes(candidate.path)) return true;
    return false;
  });
  return pattern ? { url, provider: pattern.provider } : null;
}

async function discoverMenusForCurrentResults() {
  if (!state.places.length) {
    elements.menuDiscoveryStatus.textContent = "No current results to check.";
    return;
  }
  elements.discoverMenusButton.disabled = true;
  elements.discoverMenusButton.textContent = "Finding...";
  elements.menuDiscoveryStatus.textContent = "Checking current websites for menu links...";
  let found = 0;
  let discoveryNote = "";
  state.places = state.places.map((place) => {
    if (place.realMenuUrl) return place;
    const source = discoverMenuSourceForPlace(place);
    if (!source) return place;
    found += 1;
    saveMenuSource(place, source);
    return { ...place, realMenuUrl: source.url, realMenuProvider: source.provider };
  });

  const remaining = state.places.filter((place) => !place.realMenuUrl && place.officialWebsite);
  if (remaining.length) {
    try {
      const discovered = await requestMenuDiscovery(remaining.slice(0, 18));
      state.places = state.places.map((place) => {
        const source = discovered[getMenuCacheId(place)] || discovered[place.name.toLowerCase()];
        if (!source || place.realMenuUrl) return place;
        found += 1;
        saveMenuSource(place, source);
        return { ...place, realMenuUrl: source.url, realMenuProvider: source.provider };
      });
    } catch {
      discoveryNote = "Deeper menu discovery needs the Netlify function deployment.";
    }
  }

  elements.discoverMenusButton.textContent = "Find menus";
  const foundNote = found ? `Found ${found} new menu ${found === 1 ? "link" : "links"}.` : "";
  updateMenuDiscoveryStatus([foundNote, discoveryNote].filter(Boolean).join(" "));
  render();
  elements.discoverMenusButton.disabled = false;
}

async function requestMenuDiscovery(places) {
  const response = await fetch("/.netlify/functions/discover-menus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      places: places.map((place) => ({
        id: getMenuCacheId(place),
        name: place.name,
        officialWebsite: place.officialWebsite,
      })),
    }),
  });
  if (!response.ok) {
    throw new Error("menu discovery unavailable");
  }
  const data = await response.json();
  return data.sources || {};
}

function updateMenuDiscoveryStatus(prefix = "") {
  const total = state.places.length;
  const withMenus = state.places.filter((place) => place.realMenuUrl).length;
  const summary = total
    ? `${withMenus} of ${total} current results have menu links.`
    : "Known menu links are checked after live results load.";
  elements.menuDiscoveryStatus.textContent = prefix ? `${prefix} ${summary}` : summary;
}

function getMenuCache() {
  try {
    return JSON.parse(localStorage.getItem(menuCacheKey) || "{}");
  } catch {
    return {};
  }
}

function saveMenuSource(place, source) {
  const cache = getMenuCache();
  cache[getMenuCacheId(place)] = source;
  cache[place.name.toLowerCase()] = source;
  localStorage.setItem(menuCacheKey, JSON.stringify(cache));
}

function getMenuCacheId(place) {
  return place.placeId || place.place_id || place.name.toLowerCase();
}

function getPlaceDetails(service, place) {
  if (!place.place_id) {
    return Promise.resolve(place);
  }
  return new Promise((resolve) => {
    service.getDetails(
      {
        placeId: place.place_id,
        fields: [
          "formatted_address",
          "formatted_phone_number",
          "geometry",
          "name",
          "opening_hours",
          "rating",
          "user_ratings_total",
          "vicinity",
          "website",
        ],
      },
      (details, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && details) {
          resolve({ ...place, ...details });
        } else {
          resolve(place);
        }
      },
    );
  });
}

function textSearchPlaces(service, request, maxPages = 1) {
  return new Promise((resolve, reject) => {
    const allPlaces = [];
    let pagesChecked = 0;

    function handleResults(places, status, pagination) {
      if (status === google.maps.places.PlacesServiceStatus.OK && places) {
        pagesChecked += 1;
        allPlaces.push(...places);
        if (pagination?.hasNextPage && pagesChecked < maxPages) {
          window.setTimeout(() => pagination.nextPage(), 2100);
        } else {
          resolve(allPlaces);
        }
      } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve(allPlaces);
      } else if (status === google.maps.places.PlacesServiceStatus.INVALID_REQUEST) {
        resolve(allPlaces);
      } else {
        reject(new Error(status.toLowerCase().replaceAll("_", " ")));
      }
    }

    service.textSearch(request, handleResults);
  });
}

function nearbySearchPlaces(service, request, maxPages = 1) {
  return new Promise((resolve, reject) => {
    const allPlaces = [];
    let pagesChecked = 0;

    function handleResults(places, status, pagination) {
      if (status === google.maps.places.PlacesServiceStatus.OK && places) {
        pagesChecked += 1;
        allPlaces.push(...places);
        if (pagination?.hasNextPage && pagesChecked < maxPages) {
          window.setTimeout(() => pagination.nextPage(), 2100);
        } else {
          resolve(allPlaces);
        }
      } else if (
        status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS ||
        status === google.maps.places.PlacesServiceStatus.INVALID_REQUEST
      ) {
        resolve(allPlaces);
      } else {
        reject(new Error(status.toLowerCase().replaceAll("_", " ")));
      }
    }

    service.nearbySearch(request, handleResults);
  });
}

function loadGoogleMaps(apiKey) {
  if (window.google?.maps?.places) {
    return Promise.resolve();
  }
  if (googleMapsLoad) {
    return googleMapsLoad;
  }

  googleMapsLoad = new Promise((resolve, reject) => {
    const callbackName = `initPlaces${Date.now()}`;
    const previousAuthFailure = window.gm_authFailure;
    const timeout = window.setTimeout(() => {
      delete window[callbackName];
      googleMapsLoad = undefined;
      reject(new Error("Google Maps did not finish loading"));
    }, 12000);

    window.gm_authFailure = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      window.gm_authFailure = previousAuthFailure;
      googleMapsLoad = undefined;
      reject(new Error("referernotallowedmaperror"));
    };

    window[callbackName] = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      window.gm_authFailure = previousAuthFailure;
      resolve();
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      window.gm_authFailure = previousAuthFailure;
      googleMapsLoad = undefined;
      reject(new Error("Google Maps script failed"));
    };
    document.head.append(script);
  });
  return googleMapsLoad;
}

function updateApiKeyStatus() {
  const key = localStorage.getItem(storageKey) || "";
  if (!key) {
    if (defaultGoogleMapsKey) {
      elements.apiKeyStatus.textContent = "Site key enabled for live Google results.";
      return;
    }
    elements.apiKeyStatus.textContent = "No key saved.";
    return;
  }
  elements.apiKeyStatus.textContent = `Key saved (${key.slice(0, 6)}...${key.slice(-4)}).`;
}

function getGoogleMapsKey() {
  return localStorage.getItem(storageKey) || defaultGoogleMapsKey;
}

function friendlyGoogleError(error) {
  const message = error?.message || "unknown error";
  if (message.includes("referernotallowedmaperror")) {
    return "Google rejected the key for this URL. Add this site's URL as an HTTP referrer restriction in Google Cloud.";
  }
  if (message.includes("apikey") || message.includes("api key")) {
    return "Google rejected the API key. Check that the key is correct and not deleted or disabled.";
  }
  if (message.includes("billing")) {
    return "Google rejected the request because billing is not enabled on the project.";
  }
  if (message.includes("not authorized") || message.includes("denied")) {
    return "Google rejected the request. Enable Maps JavaScript API and Places API for this key.";
  }
  if (message.includes("script failed")) {
    return "Google Maps could not load. Check API restrictions, billing, and the allowed website referrer.";
  }
  if (message.includes("did not finish loading")) {
    return "Google Maps did not finish loading. Make sure this exact website is allowed in the key's website restrictions.";
  }
  return `Live search could not load: ${message}.`;
}

function render() {
  const filtered = getFilteredPlaces();
  elements.ratingFilter.value = state.rating;
  elements.distanceFilter.value = state.distance;
  elements.openFilter.checked = state.openOnly;
  elements.sortSelect.value = state.sort;
  updateLoadingControls();
  elements.areaHeading.textContent = state.area;
  elements.sourcePill.textContent = state.source;
  elements.resultKicker.textContent = state.isLoading ? "Searching" : state.source === "Google Places" ? "Live results" : state.source;
  elements.ratingLabel.textContent = state.rating ? `${state.rating.toFixed(1)}+ stars` : "Any rating";
  elements.distanceLabel.textContent = `Within ${state.distance} ${state.distance === 1 ? "mile" : "miles"}`;
  elements.countHeading.textContent = state.isLoading
    ? "Searching..."
    : `${filtered.length} ${filtered.length === 1 ? "dispensary" : "dispensaries"}`;
  renderMarkers(filtered);
  renderGoogleMap(filtered);
  renderCards(filtered);
}

function updateLoadingControls() {
  elements.form.querySelector("button[type='submit']").disabled = state.isLoading;
  elements.nearMeButton.disabled = state.isLoading;
  elements.testKeyButton.disabled = state.isLoading;
  elements.discoverMenusButton.disabled = state.isLoading;
}

function getFilteredPlaces() {
  return [...state.places]
    .filter((place) => place.rating >= state.rating)
    .filter((place) => place.distance <= state.distance)
    .filter((place) => !state.openOnly || place.openNow === true)
    .sort((a, b) => {
      if (state.sort === "reviews") return b.reviews - a.reviews;
      if (state.sort === "distance") return a.distance - b.distance;
      return b.rating - a.rating || b.reviews - a.reviews;
    });
}

function renderCards(places) {
  if (state.isLoading) {
    elements.results.innerHTML = `
      <article class="loading-card">
        <span class="spinner" aria-hidden="true"></span>
        <div>
          <h3>Searching ${escapeHtml(state.area)}</h3>
          <p>Checking Google Places, ratings, hours, map pins, and menu links.</p>
        </div>
      </article>
    `;
    return;
  }
  elements.results.innerHTML = [sponsoredPlacement]
    .concat(places)
    .map(
      (place) =>
        place === sponsoredPlacement
          ? renderSponsoredPlacement()
          : `
        <article class="place-card">
          <div class="place-top">
            <div>
              <h3>${escapeHtml(place.name)}</h3>
              <div class="rating" aria-label="${place.rating.toFixed(1)} stars">
                <span class="stars">${stars(place.rating)}</span>
                <span>${place.rating ? place.rating.toFixed(1) : "N/A"}</span>
              </div>
            </div>
            ${renderReviewBadge(place)}
          </div>
          <div class="meta">
            ${place.cityState ? `<span class="city-state">${escapeHtml(place.cityState)}</span>` : ""}
            <span>${escapeHtml(place.address)}</span>
            <span>${place.distance.toFixed(1)} mi away</span>
            <span class="${place.openNow ? "open" : "closed"}">${openLabel(place.openNow)}</span>
            ${place.deliveryNote ? `<span class="delivery-line">${escapeHtml(place.deliveryNote)}</span>` : ""}
            <span class="hours-line">${escapeHtml(place.hours || "Hours unavailable")}</span>
            ${place.phone ? `<span>${escapeHtml(place.phone)}</span>` : ""}
          </div>
          <div class="card-actions">
            <a href="${place.website}" target="_blank" rel="noreferrer">Map</a>
            ${renderRealMenuLink(place)}
          </div>
        </article>
      `,
    )
    .join("");
}

function renderSponsoredPlacement() {
  const subject = encodeURIComponent("Advertising on AC Andy's Dispensary Finder");
  const body = encodeURIComponent("Hi Andy,\n\nI'm interested in advertising on AC Andy's Dispensary Finder.");
  const href = `mailto:${sponsoredPlacement.email}?subject=${subject}&body=${body}`;
  return `
    <article class="place-card sponsored-card">
      <div class="sponsor-label">Sponsored</div>
      <div>
        <h3>${escapeHtml(sponsoredPlacement.title)}</h3>
        <p>${escapeHtml(sponsoredPlacement.body)}</p>
      </div>
      <a class="sponsor-action" href="${href}">${escapeHtml(sponsoredPlacement.action)}</a>
    </article>
  `;
}

function renderReviewBadge(place) {
  const label = `${place.reviews.toLocaleString()} reviews`;
  if (!place.reviewsUrl) {
    return `<span class="badge">${label}</span>`;
  }
  return `<a class="badge review-link" href="${place.reviewsUrl}" target="_blank" rel="noreferrer" aria-label="Open Google reviews for ${escapeHtml(place.name)}">${label}</a>`;
}

function renderRealMenuLink(place) {
  if (!place.realMenuUrl) {
    return "";
  }
  return `<a href="${place.realMenuUrl}" target="_blank" rel="noreferrer">Menu</a>`;
}

function renderGoogleMap(places) {
  const canRenderMap = state.source === "Google Places" && window.google?.maps && places.length;
  elements.mapWrap.classList.toggle("has-real-map", Boolean(canRenderMap));
  clearGoogleMarkers();
  if (!canRenderMap) {
    return;
  }

  if (!googleMap) {
    googleMap = new google.maps.Map(elements.googleMap, {
      center: state.center,
      clickableIcons: false,
      fullscreenControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      zoom: 12,
    });
  }

  const bounds = new google.maps.LatLngBounds();
  places.forEach((place, index) => {
    const position = { lat: place.lat, lng: place.lng };
    bounds.extend(position);
    const marker = new google.maps.Marker({
      position,
      map: googleMap,
      label: {
        text: String(index + 1),
        color: "#ffffff",
        fontWeight: "800",
      },
      title: place.name,
    });
    marker.addListener("click", () => focusPlaceCard(index));
    googleMarkers.push(marker);
  });

  if (places.length === 1) {
    googleMap.setCenter({ lat: places[0].lat, lng: places[0].lng });
    googleMap.setZoom(14);
  } else {
    googleMap.fitBounds(bounds, 52);
  }
}

function clearGoogleMarkers() {
  googleMarkers.forEach((marker) => marker.setMap(null));
  googleMarkers = [];
}

function focusPlaceCard(index) {
  const cards = [...elements.results.querySelectorAll(".place-card")];
  const card = cards[index];
  if (!card) return;
  cards.forEach((currentCard) => currentCard.classList.remove("is-highlighted"));
  card.classList.add("is-highlighted");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renderMarkers(places) {
  const bounds = getBounds(places);
  elements.markers.innerHTML = places
    .slice(0, 10)
    .map((place, index) => {
      const x = scale(place.lng, bounds.minLng, bounds.maxLng, 14, 86);
      const y = scale(place.lat, bounds.maxLat, bounds.minLat, 18, 82);
      return `<div class="marker" style="left:${x}%; top:${y}%"><span>${index + 1}</span></div>`;
    })
    .join("");
}

function getBounds(places) {
  const lats = places.map((place) => place.lat).filter(Boolean);
  const lngs = places.map((place) => place.lng).filter(Boolean);
  if (!lats.length || !lngs.length) {
    return { minLat: 45.49, maxLat: 45.54, minLng: -122.7, maxLng: -122.54 };
  }
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

function scale(value, min, max, outMin, outMax) {
  if (min === max) return (outMin + outMax) / 2;
  return outMin + ((value - min) / (max - min)) * (outMax - outMin);
}

function stars(rating) {
  const count = Math.round(rating);
  return "★★★★★".slice(0, count).padEnd(5, "☆");
}

function openLabel(openNow) {
  if (openNow === true) return "Open now";
  if (openNow === false) return "Closed now";
  return "Hours unavailable";
}

function getTodayHours(openingHours) {
  const weeklyHours = openingHours?.weekday_text;
  if (!weeklyHours?.length) {
    return "Hours unavailable";
  }
  const today = new Date().getDay();
  const googleDayIndex = today === 0 ? 6 : today - 1;
  return weeklyHours[googleDayIndex] || weeklyHours[0] || "Hours unavailable";
}

function setStatus(message) {
  elements.status.textContent = message;
  elements.status.classList.toggle("is-visible", Boolean(message));
}

function getDistanceMiles(lat1, lng1, lat2, lng2) {
  const radius = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function milesToMeters(miles) {
  return Math.round(miles * 1609.344);
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function hashString(value) {
  return String(value)
    .split("")
    .reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 2166136261);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();
