const path = require("path");
const express = require("express");
const cheerio = require("cheerio");

const app = express();
const port = process.env.PORT || 3000;
const publicPath = path.join(__dirname, "public");
const imagesPath = path.join(__dirname, "images");

const JOBS_URL =
  "https://www.jenprace.cz/brigady/kralovehradecky-kraj?ld%5Bkralovehradecky-kraj%5D=0";
const ALZA_PRIMARY_URL = "https://www.alza.cz/";
const ALZA_FALLBACK_URL = "https://www.alza.cz/tv-podstavce/18852647.htm";
const CACHE_TTL = 10 * 60 * 1000;

const cache = {
  jobs: { timestamp: 0, data: [] },
  alza: { timestamp: 0, data: [], source: ALZA_PRIMARY_URL },
};

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept-Language": "cs-CZ,cs;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml",
};

const fetchHtml = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`Fetch failed (${response.status}) for ${url}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const getCached = async (key, loader) => {
  const entry = cache[key];
  const now = Date.now();
  if (entry.data.length > 0 && now - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  const data = await loader();
  entry.data = data;
  entry.timestamp = now;
  return data;
};

const normalizeText = (value) =>
  value.replace(/\s+/g, " ").replace(/\|/g, "").trim();

const parseJobs = (html) => {
  const $ = cheerio.load(html);
  const items = [];
  $(".common-offers article.item").each((_, element) => {
    if (items.length >= 20) {
      return false;
    }
    const title = normalizeText($(element).find(".offer-link").first().text());
    const company = normalizeText($(element).find(".company span").first().text());
    const location = normalizeText($(element).find(".locality span").first().text());
    const reward = normalizeText($(element).find(".rewardLabel").first().text());
    const dateRaw = normalizeText($(element).find(".date-offer-list").text());
    const date = dateRaw.replace("Zveřejněno:", "").trim();
    const url = $(element).find("a.container-link").first().attr("href");

    if (!title) {
      return;
    }
    items.push({
      title,
      company: company || "Neuvedeno",
      location: location || "Neuvedeno",
      reward: reward || "Neuvedeno",
      date: date || "Neuvedeno",
      url,
    });
  });
  return items;
};

const parseAlza = (html) => {
  const $ = cheerio.load(html);
  const items = [];
  $(".box.browsingitem").each((_, element) => {
    if (items.length >= 20) {
      return false;
    }
    const name = normalizeText($(element).find(".name").first().text());
    const price =
      normalizeText($(element).find(".js-price-box__primary-price__value").first().text()) ||
      normalizeText($(element).find(".price-box__price").first().text()) ||
      normalizeText($(element).find(".price").first().text());
    const link = $(element).find("a.browsinglink").first().attr("href");
    const image = $(element).find("img.box-image").first().attr("src");
    const badge = normalizeText($(element).find(".box-recommendation__label").first().text());

    if (!name) {
      return;
    }

    items.push({
      name,
      price: price || "Neuvedeno",
      url: link ? new URL(link, "https://www.alza.cz").toString() : null,
      image,
      badge,
    });
  });
  return items;
};

const loadAlzaOffers = async () => {
  const sources = [ALZA_PRIMARY_URL, ALZA_FALLBACK_URL];
  let lastError = null;
  for (const url of sources) {
    try {
      const items = parseAlza(await fetchHtml(url));
      if (items.length > 0) {
        return { items, source: url };
      }
      lastError = new Error(`Žádné nabídky nebyly nalezeny na ${url}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Nepodařilo se načíst nabídky z Alzy.");
};

const getCachedAlza = async () => {
  const now = Date.now();
  if (cache.alza.data.length > 0 && now - cache.alza.timestamp < CACHE_TTL) {
    return cache.alza;
  }
  const { items, source } = await loadAlzaOffers();
  cache.alza.data = items;
  cache.alza.source = source;
  cache.alza.timestamp = now;
  return cache.alza;
};

app.get("/api/jobs", async (req, res) => {
  try {
    const data = await getCached("jobs", async () => parseJobs(await fetchHtml(JOBS_URL)));
    res.json({
      source: JOBS_URL,
      updatedAt: new Date(cache.jobs.timestamp).toISOString(),
      items: data,
    });
  } catch (error) {
    res.status(502).json({ error: "Nepodařilo se načíst nabídky brigád." });
  }
});

app.get("/api/alza", async (req, res) => {
  try {
    const cached = await getCachedAlza();
    res.json({
      source: cached.source,
      updatedAt: new Date(cached.timestamp).toISOString(),
      items: cached.data,
      fallbackUsed: cached.source !== ALZA_PRIMARY_URL,
    });
  } catch (error) {
    res.status(502).json({ error: "Nepodařilo se načíst nabídky z Alzy." });
  }
});

app.use("/images", express.static(imagesPath));
app.use("/image", express.static(imagesPath));
app.use(express.static(publicPath));

app.use((req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
