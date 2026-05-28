const feeds = [
  { source: "MLB.com", url: "https://www.mlb.com/feeds/news/rss.xml" },
  { source: "CBS Sports", url: "https://www.cbssports.com/rss/headlines/mlb/" }
];

exports.handler = async () => {
  try {
    const batches = await Promise.allSettled(feeds.map(loadFeed));
    const stories = batches
      .flatMap((batch) => batch.status === "fulfilled" ? batch.value : [])
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 60);

    return json(200, {
      generatedAt: new Date().toISOString(),
      stories
    });
  } catch (error) {
    return json(500, { stories: [], error: "Could not load baseball news." });
  }
};

async function loadFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      "User-Agent": "MLB Statline news reader"
    }
  });
  if (!response.ok) throw new Error(`${feed.source} returned ${response.status}`);
  const xml = await response.text();
  return parseItems(xml).map((item) => ({ ...item, source: feed.source }));
}

function parseItems(xml) {
  return Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map((match) => {
    const item = match[0];
    return {
      title: clean(readTag(item, "title")),
      link: clean(readTag(item, "link")),
      description: clean(readTag(item, "description")),
      pubDate: clean(readTag(item, "pubDate")),
      creator: clean(readTag(item, "dc:creator")),
      image: readImage(item)
    };
  }).filter((item) => item.title && item.link);
}

function readTag(item, tag) {
  const escaped = tag.replace(":", "\\:");
  const match = item.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match?.[1] || "";
}

function readImage(item) {
  const mlbImage = item.match(/<image[^>]+href="([^"]+)"/i);
  if (mlbImage) return decodeEntities(mlbImage[1]);
  const enclosure = item.match(/<enclosure[^>]+url="([^"]+)"/i);
  return enclosure ? decodeEntities(enclosure[1]) : "";
}

function clean(value = "") {
  return decodeEntities(value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeEntities(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300"
    },
    body: JSON.stringify(body)
  };
}
