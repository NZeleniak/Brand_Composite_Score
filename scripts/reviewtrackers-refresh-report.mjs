import fs from "node:fs";
import path from "node:path";

const API_BASE = "https://api.reviewtrackers.com";
const USER_AGENT = "ChartwellBrandCompositeScore/1.0";
const DEFAULT_REPORT_PATH = "Brand Composite Score.html";
const DEFAULT_OUTPUT_JSON = "data/reviewtrackers-report-data.json";
const ACCEPT_HAL = "application/hal+json";
const propertySheetPattern = /^Property_Data_Sheet_(\d{4})\.csv$/i;

const sourceNameMap = {
  google: "Google",
  yelp: "Yelp",
  facebook: "Facebook",
  caring: "Caring",
  senioradvisor: "SeniorAdvisor",
  "a-place-for-mom": "APlaceForMom",
  aplaceformom: "APlaceForMom",
  glassdoor: "Glassdoor",
  indeed: "Indeed"
};

const nonResidenceSources = new Set(["Glassdoor", "Indeed"]);
const outsideOperatingRegionLabel = "Outside operating-region groups";
const operatingRegionPriority = [
  "Ontario East - OE",
  "Ontario West - OW",
  "Quebec - QC",
  "British Columbia - BC",
  "Alberta - AB",
  "West"
];

function loadEnvFile(filePath = ".env") {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readSavedToken() {
  return readJsonIfExists("reviewtrackers-token.json", {});
}

function basicAuth(email, token) {
  return `Basic ${Buffer.from(`${email}:${token}`, "utf8").toString("base64")}`;
}

function parseArgs(argv) {
  const options = {
    publishedAfter: isoDateMonthsAgo(24),
    publishedBefore: new Date().toISOString().slice(0, 10),
    perPage: "250",
    reportPath: DEFAULT_REPORT_PATH,
    outputJson: DEFAULT_OUTPUT_JSON,
    residenceMaster: "data/residence-master.json",
    propertyDataSheet: "",
    useReviewTrackersGroups: true,
    includePerformanceScore: true,
    includeCompetitors: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--published-after") options.publishedAfter = next, index += 1;
    else if (arg === "--published-before") options.publishedBefore = next, index += 1;
    else if (arg === "--report") options.reportPath = next, index += 1;
    else if (arg === "--output-json") options.outputJson = next, index += 1;
    else if (arg === "--residence-master") options.residenceMaster = next, index += 1;
    else if (arg === "--property-data-sheet") options.propertyDataSheet = next, index += 1;
    else if (arg === "--account-id") options.accountId = next, index += 1;
    else if (arg === "--no-groups") options.useReviewTrackersGroups = false;
    else if (arg === "--no-performance-score") options.includePerformanceScore = false;
    else if (arg === "--no-competitors") options.includeCompetitors = false;
  }

  return options;
}

function discoverPropertyDataSheet(explicitPath = "") {
  if (explicitPath) return fs.existsSync(explicitPath) ? explicitPath : "";

  const candidates = [
    ".",
    "data",
    process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "Downloads") : ""
  ].filter(Boolean);

  const matches = [];
  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const match = entry.name.match(propertySheetPattern);
      if (!match) continue;
      const fullPath = path.resolve(dir, entry.name);
      matches.push({
        path: fullPath,
        year: Number(match[1]),
        mtimeMs: fs.statSync(fullPath).mtimeMs
      });
    }
  }

  matches.sort((a, b) => b.year - a.year || b.mtimeMs - a.mtimeMs);
  return matches[0]?.path || "";
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function cleanText(value) {
  return String(value ?? "").replace(/\uFFFD/g, "e").trim();
}

function parseNumber(value) {
  const cleaned = cleanText(value).replace(/[$,%\s,]/g, "");
  if (!cleaned || cleaned === "-") return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeResidenceName(name) {
  return cleanText(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(chartwell|retirement|residence|residences|community|résidence|retraites|pour|de|des|le|la|les|the|by)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizePropertyRow(row, year) {
  const occupancyValues = row.slice(33, 45).map(parseNumber).filter((value) => value !== null);
  const occupancyAverage = occupancyValues.length
    ? occupancyValues.reduce((sum, value) => sum + value, 0) / occupancyValues.length
    : null;

  return {
    year,
    propertyNumber: cleanText(row[0]),
    propertyNumberAlt: cleanText(row[1]),
    propertyRegion: cleanText(row[2]),
    residenceName: cleanText(row[3]),
    residentSatisfaction: parseNumber(row[4]),
    residentNps: parseNumber(row[5]),
    employeeEngagement: parseNumber(row[9]),
    employeeNps: parseNumber(row[10]),
    rssOverallPriorYear: parseNumber(row[14]),
    rssOverallCurrentYear: parseNumber(row[15]),
    rssOverallChange: parseNumber(row[16]),
    rssStaffPriorYear: parseNumber(row[17]),
    rssStaffCurrentYear: parseNumber(row[18]),
    rssStaffChange: parseNumber(row[19]),
    rssLifestylePriorYear: parseNumber(row[20]),
    rssLifestyleCurrentYear: parseNumber(row[21]),
    rssLifestyleChange: parseNumber(row[22]),
    lifestyleProgramsManagerHours: parseNumber(row[23]),
    activityAideHours: parseNumber(row[24]),
    driverHours: parseNumber(row[25]),
    monthlyBudget: parseNumber(row[32]),
    occupancyAverage,
    occupancyMonthly: {
      Jan: parseNumber(row[33]),
      Feb: parseNumber(row[34]),
      Mar: parseNumber(row[35]),
      Apr: parseNumber(row[36]),
      May: parseNumber(row[37]),
      Jun: parseNumber(row[38]),
      Jul: parseNumber(row[39]),
      Aug: parseNumber(row[40]),
      Sep: parseNumber(row[41]),
      Oct: parseNumber(row[42]),
      Nov: parseNumber(row[43]),
      Dec: parseNumber(row[44])
    }
  };
}

function loadPropertyData(options) {
  const propertyPath = discoverPropertyDataSheet(options.propertyDataSheet);
  if (!propertyPath) {
    return {
      sourceFile: null,
      year: null,
      rows: []
    };
  }

  const year = Number(path.basename(propertyPath).match(propertySheetPattern)?.[1] || new Date().getFullYear());
  const text = fs.readFileSync(propertyPath, "utf8");
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((row) => {
    return cleanText(row[0]).toLowerCase() === "property #" &&
      cleanText(row[2]).toLowerCase() === "region" &&
      cleanText(row[3]).toLowerCase() === "residence";
  });

  if (headerIndex === -1) {
    throw new Error(`Could not find the Property Data Sheet header row in ${propertyPath}`);
  }

  return {
    sourceFile: propertyPath,
    year,
    rows: rows
      .slice(headerIndex + 1)
      .filter((row) => cleanText(row[0]) && cleanText(row[3]))
      .map((row) => normalizePropertyRow(row, year))
  };
}

function isoDateMonthsAgo(months) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

async function fetchJson(pathname, { email, token, accept = ACCEPT_HAL } = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    headers: {
      accept,
      authorization: basicAuth(email, token),
      "user-agent": USER_AGENT
    }
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    throw new Error(`ReviewTrackers GET ${pathname} failed: HTTP ${response.status}\n${typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)}`);
  }

  return parsed;
}

function collectionItems(payload, resourceName) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload[resourceName])) return payload[resourceName];
  if (payload._embedded) {
    for (const value of Object.values(payload._embedded)) {
      if (Array.isArray(value)) return value;
    }
  }
  if (payload.id || payload.resource) return [payload];
  return [];
}

async function fetchOffsetCollection(pathname, { email, token, resourceName, accept, perPage = 500 }) {
  const rows = [];
  let page = 1;

  while (true) {
    const separator = pathname.includes("?") ? "&" : "?";
    const pagePath = `${pathname}${separator}per_page=${perPage}&page=${page}`;
    const payload = await fetchJson(pagePath, { email, token, accept });
    const items = collectionItems(payload, resourceName);
    rows.push(...items);

    const totalPages = Number(payload._total_pages || 0);
    if (totalPages && page < totalPages) {
      page += 1;
      continue;
    }
    if (!totalPages && items.length === perPage) {
      page += 1;
      continue;
    }
    break;
  }

  return rows;
}

async function fetchLocations(context) {
  return fetchOffsetCollection(`/locations?account_id=${encodeURIComponent(context.accountId)}`, {
    ...context,
    resourceName: "locations",
    accept: "application/vnd.rtx.location.v2.hal+json;charset=utf-8"
  });
}

async function fetchGroups(context) {
  return fetchOffsetCollection(`/groups?account_id=${encodeURIComponent(context.accountId)}`, {
    ...context,
    resourceName: "groups",
    accept: "application/vnd.rtx.group.v2.hal+json;charset=utf-8"
  });
}

async function fetchItems(context) {
  return fetchOffsetCollection(`/items?account_id=${encodeURIComponent(context.accountId)}&container_type=group&resource_type=location`, {
    ...context,
    resourceName: "items",
    accept: "application/vnd.rtx.item.v2.hal+json;charset=utf-8"
  });
}

async function fetchPerformanceScores(context, options) {
  const rows = [];
  let page = 1;
  let aggregateScore = null;
  let lagAggregateScore = null;

  while (true) {
    const pathname = `/location_score/${encodeURIComponent(context.accountId)}/locations?start_date=${encodeURIComponent(options.publishedAfter)}&end_date=${encodeURIComponent(options.publishedBefore)}&per_page=500&page=${page}`;
    const payload = await fetchJson(pathname, { ...context, accept: ACCEPT_HAL });
    aggregateScore ||= payload._embedded?.aggregate_score || null;
    lagAggregateScore ||= payload._embedded?.lag_aggregate_score || null;
    rows.push(...(payload._embedded?.location_scores || []));

    const totalPages = Number(payload._total_pages || 0);
    if (totalPages && page < totalPages) {
      page += 1;
      continue;
    }
    break;
  }

  return { rows, aggregateScore, lagAggregateScore };
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.max(1, Math.round((end - start) / 86400000));
}

function priorPeriod(options) {
  const days = daysBetween(options.publishedAfter, options.publishedBefore);
  const currentStart = new Date(`${options.publishedAfter}T00:00:00Z`);
  const priorEnd = new Date(currentStart);
  const priorStart = new Date(currentStart);
  priorStart.setUTCDate(priorStart.getUTCDate() - days);
  return {
    publishedAfter: priorStart.toISOString().slice(0, 10),
    publishedBefore: priorEnd.toISOString().slice(0, 10)
  };
}

async function fetchMetricsOverviewBreakdown(context, options) {
  const params = new URLSearchParams({
    account_id: context.accountId,
    start_date: options.publishedAfter,
    end_date: options.publishedBefore,
    time_interval: "monthly"
  });
  return fetchJson(`/metrics/overview/breakdown?${params.toString()}`, {
    ...context,
    accept: "application/vnd.rtx.v2.hal+json"
  });
}

function normalizeCompetitorSource(source) {
  return {
    source: sourceNameMap[source?.source] || source?.source || "",
    avgRating: source?.avg_rating ?? null,
    totalReviews: source?.total_reviews ?? 0,
    urlPath: source?.url_path || "",
    lastFetchedAt: source?.last_fetched_at || null
  };
}

function normalizeCompetitorRow(row) {
  return {
    id: String(row.competitor_id || row.resource_id || row.google_place_id || row.name || ""),
    name: row.name || "Unnamed competitor",
    address: row.address || "",
    avgRating: row.avg_rating ?? null,
    totalReviews: row.total_reviews ?? 0,
    isSuggestedCompetitor: Boolean(row.is_suggested_competitor),
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
    sources: Array.isArray(row.sources) ? row.sources.map(normalizeCompetitorSource) : []
  };
}

async function fetchCompetitors(context, options, residences) {
  const comparableResidences = residences
    .filter((residence) => residence.active && residence.reviewtrackersLocationId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const batchSize = 40;
  const comparisons = [];
  const errors = [];

  for (let index = 0; index < comparableResidences.length; index += batchSize) {
    const batch = comparableResidences.slice(index, index + batchSize);
    const residenceByRtxId = new Map(batch.map((residence) => [residence.reviewtrackersLocationId, residence]));
    const params = new URLSearchParams({
      start_date: options.publishedAfter,
      end_date: options.publishedBefore
    });
    params.set("sort[by]", "avg_rating");
    params.set("sort[order]", "desc");
    for (const residence of batch) {
      params.append("location_ids[]", residence.reviewtrackersLocationId);
    }

    try {
      const payload = await fetchJson(`/intel/locations?${params.toString()}`, {
        ...context,
        accept: "application/json"
      });
      const locations = Array.isArray(payload?.locations) ? payload.locations : [];
      for (const location of locations) {
        const rtxId = location.rtx_id || location.resource_id;
        const residence = residenceByRtxId.get(rtxId);
        if (!residence) continue;
        const competitors = Array.isArray(location.competitors) ? location.competitors.map(normalizeCompetitorRow) : [];
        comparisons.push({
          residenceId: residence.id,
          reviewtrackersLocationId: residence.reviewtrackersLocationId,
          residenceName: residence.name,
          avgRating: location.avg_rating ?? null,
          totalReviews: location.total_reviews ?? 0,
          sources: Array.isArray(location.sources) ? location.sources.map(normalizeCompetitorSource) : [],
          competitors
        });
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  const competitorRows = comparisons.reduce((sum, comparison) => sum + comparison.competitors.length, 0);
  return {
    comparisons: comparisons.sort((a, b) => a.residenceName.localeCompare(b.residenceName)),
    validation: {
      requestedLocations: comparableResidences.length,
      locationsWithCompetitors: comparisons.filter((comparison) => comparison.competitors.length > 0).length,
      competitorRows,
      errors
    }
  };
}

function weightedMetric(rows, field) {
  let weighted = 0;
  let weight = 0;
  for (const row of rows) {
    const value = Number(row[field]);
    const reviews = Number(row.total_reviews || 0);
    if (!Number.isFinite(value) || reviews <= 0) continue;
    weighted += value * reviews;
    weight += reviews;
  }
  return weight ? weighted / weight : null;
}

function summarizeMetricsOverview(payload) {
  const rows = Array.isArray(payload?.overview) ? payload.overview : [];
  const totalReviews = rows.reduce((sum, row) => sum + Number(row.total_reviews || 0), 0);
  return {
    avgRating: weightedMetric(rows, "avg_rating"),
    avgRatingMaximum: payload?.avg_rating_maximum || rows.find((row) => row.avg_rating_maximum)?.avg_rating_maximum || 5,
    totalReviews,
    responseRate: weightedMetric(rows, "response_rate"),
    avgResponseTimeMs: weightedMetric(rows, "avg_response_time"),
    periods: rows
  };
}

function percentDelta(current, previous) {
  if (current === null || current === undefined || previous === null || previous === undefined || Number(previous) === 0) return null;
  return ((Number(current) - Number(previous)) / Number(previous)) * 100;
}

function buildReviewTrackersDashboardMetrics(currentPayload, previousPayload, performancePayload) {
  const current = summarizeMetricsOverview(currentPayload);
  const previous = summarizeMetricsOverview(previousPayload);
  const score = performancePayload?.aggregateScore?.overall_score ?? null;
  const lagScore = performancePayload?.lagAggregateScore?.overall_score ?? null;

  return {
    source: "ReviewTrackers metrics/performance endpoints",
    performanceScore: score,
    performanceScorePrevious: lagScore,
    performanceScoreDeltaPercent: percentDelta(score, lagScore),
    averageRating: current.avgRating,
    averageRatingMaximum: current.avgRatingMaximum,
    averageRatingPrevious: previous.avgRating,
    averageRatingDeltaPercent: percentDelta(current.avgRating, previous.avgRating),
    totalReviews: current.totalReviews,
    totalReviewsPrevious: previous.totalReviews,
    totalReviewsDeltaPercent: percentDelta(current.totalReviews, previous.totalReviews),
    responseRate: current.responseRate,
    responseRatePrevious: previous.responseRate,
    responseRateDeltaPercent: percentDelta(current.responseRate, previous.responseRate),
    avgResponseTimeMs: current.avgResponseTimeMs,
    avgResponseTimePreviousMs: previous.avgResponseTimeMs,
    avgResponseTimeDeltaPercent: percentDelta(current.avgResponseTimeMs, previous.avgResponseTimeMs),
    currentPeriods: current.periods,
    previousPeriods: previous.periods
  };
}

async function fetchReviews({ email, token, accountId, publishedAfter, publishedBefore, perPage }) {
  const reviews = [];
  let after = "";

  do {
    const params = new URLSearchParams({
      account_id: accountId,
      per_page: perPage,
      published_after: publishedAfter,
      published_before: publishedBefore,
      "sort[by]": "published_at",
      "sort[order]": "desc"
    });
    if (after) params.set("after", after);

    const url = `${API_BASE}/v2/reviews?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        accept: "application/hal+json",
        authorization: basicAuth(email, token),
        "user-agent": USER_AGENT
      }
    });

    const body = await response.text();
    let parsed;
    try {
      parsed = body ? JSON.parse(body) : {};
    } catch {
      parsed = body;
    }

    if (!response.ok) {
      throw new Error(`ReviewTrackers reviews request failed: HTTP ${response.status}\n${typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)}`);
    }

    reviews.push(...(parsed.data || []));
    after = parsed.paging?.cursors?.after || "";
    console.log(`Fetched ${reviews.length} reviews${after ? "..." : "."}`);
  } while (after);

  return reviews;
}

function canonicalSource(review) {
  const code = String(review.source_code || review.source_name || "unknown").toLowerCase().replace(/\s+/g, "");
  return sourceNameMap[code] || review.source_name || review.source_code || "Unknown";
}

function reviewDate(review) {
  return review.origin_published_at || review.published_at || review.published_on || review.created_at;
}

function normalizeCity(review) {
  const parts = [review.location_city, review.location_state].filter(Boolean);
  return parts.join(", ") || review.location_address || "Unknown";
}

function buildGroupMembershipMap(groups, items) {
  const groupNameById = new Map(groups.filter((group) => !group.deleted_at).map((group) => [group.id, group.name]));
  const groupsByLocationId = new Map();

  for (const item of items) {
    if (item.deleted_at || item.container_type !== "group" || item.resource_type !== "location") continue;
    const groupName = groupNameById.get(item.container_id);
    if (!groupName) continue;
    const existing = groupsByLocationId.get(item.resource_id) || [];
    if (!existing.includes(groupName)) {
      existing.push(groupName);
      groupsByLocationId.set(item.resource_id, existing);
    }
  }

  return groupsByLocationId;
}

function deriveOperatingRegion(groups = []) {
  return operatingRegionPriority.find((region) => groups.includes(region)) || outsideOperatingRegionLabel;
}

function aggregateReviews(reviews, options, referenceData = {}) {
  const masterRows = readJsonIfExists(options.residenceMaster, []);
  const masterByLocationId = new Map(masterRows.map((row) => [row.reviewtrackers_location_id, row]));
  const locationsById = new Map((referenceData.locations || []).filter((location) => !location.deleted_at).map((location) => [location.id, location]));
  const groupsByLocationId = buildGroupMembershipMap(referenceData.groups || [], referenceData.items || []);
  const performanceByLocationId = new Map((referenceData.performanceScores || []).map((score) => [score.location_id, score]));
  const propertyByName = new Map((referenceData.propertyData?.rows || []).map((row) => [normalizeResidenceName(row.residenceName), row]));
  const locationMap = new Map();
  const bucketMap = new Map();
  const employerBucketMap = new Map();
  const excludedSourceCounts = {};

  for (const review of reviews) {
    if (review.deleted_at || review.origin_deleted_at) continue;
    if (!review.location_id || review.rating === null || review.rating === undefined) continue;

    const master = masterByLocationId.get(review.location_id);
    const apiLocation = locationsById.get(review.location_id);
    const performance = performanceByLocationId.get(review.location_id);
    const source = canonicalSource(review);
    if (nonResidenceSources.has(source)) {
      excludedSourceCounts[source] = (excludedSourceCounts[source] || 0) + 1;
      const employerBucket = employerBucketMap.get(source) || {
        source,
        ratingTotal: 0,
        reviewCount: 0,
        lastReviewDate: reviewDate(review),
        snapshotDate: options.publishedBefore
      };
      employerBucket.ratingTotal += Number(review.rating);
      employerBucket.reviewCount += 1;
      if (new Date(reviewDate(review)) > new Date(employerBucket.lastReviewDate)) employerBucket.lastReviewDate = reviewDate(review);
      employerBucketMap.set(source, employerBucket);
      continue;
    }
    const groups = groupsByLocationId.get(review.location_id) || [];
    const operatingRegion = master?.region || master?.operatingRegion || deriveOperatingRegion(groups);
    const locationName = master?.name || apiLocation?.public_name || apiLocation?.name || review.location_name || "Unknown Location";
    const propertyData = propertyByName.get(normalizeResidenceName(locationName)) || null;

    if (!locationMap.has(review.location_id)) {
      locationMap.set(review.location_id, {
        id: master?.residence_id || review.location_id,
        reviewtrackersLocationId: review.location_id,
        name: locationName,
        city: master?.city || [apiLocation?.city, apiLocation?.state].filter(Boolean).join(", ") || normalizeCity(review),
        region: operatingRegion,
        operatingRegion,
        groups,
        careType: master?.careType || propertyData?.propertyRegion || "",
        active: master?.active ?? apiLocation?.open_status !== "inactive",
        reviewTrackersPerformanceScore: performance?.location_score ?? performance?.score?.overall_score ?? null,
        reviewTrackersResponseRate: performance?.completed_rate ?? null,
        reviewTrackersResponseTimeMs: performance?.overall_avg_response_time ?? null,
        propertyData
      });
    }

    const bucketKey = `${review.location_id}::${source}`;
    const bucket = bucketMap.get(bucketKey) || {
      residenceId: locationMap.get(review.location_id).id,
      source,
      ratingTotal: 0,
      reviewCount: 0,
      lastReviewDate: reviewDate(review),
      snapshotDate: options.publishedBefore
    };

    bucket.ratingTotal += Number(review.rating);
    bucket.reviewCount += 1;
    if (new Date(reviewDate(review)) > new Date(bucket.lastReviewDate)) bucket.lastReviewDate = reviewDate(review);
    bucketMap.set(bucketKey, bucket);
  }

  const residences = [...locationMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  const reviewSnapshots = [...bucketMap.values()].map((bucket) => ({
    residenceId: bucket.residenceId,
    source: bucket.source,
    ratingRaw: Number((bucket.ratingTotal / bucket.reviewCount).toFixed(3)),
    ratingScale: 5,
    reviewCount: bucket.reviewCount,
    lastReviewDate: bucket.lastReviewDate.slice(0, 10),
    snapshotDate: options.publishedBefore
  })).sort((a, b) => a.residenceId.localeCompare(b.residenceId) || a.source.localeCompare(b.source));
  const employerSnapshots = [...employerBucketMap.values()].map((bucket) => ({
    source: bucket.source,
    ratingRaw: Number((bucket.ratingTotal / bucket.reviewCount).toFixed(3)),
    ratingScale: 5,
    reviewCount: bucket.reviewCount,
    lastReviewDate: bucket.lastReviewDate.slice(0, 10),
    snapshotDate: options.publishedBefore
  })).sort((a, b) => a.source.localeCompare(b.source));

  return { residences, reviewSnapshots, employerSnapshots, excludedSourceCounts };
}

function buildMonthlyTrend(reviews, options) {
  const months = [];
  const end = new Date(`${options.publishedBefore}T00:00:00Z`);
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
    months.push({
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleString("en-CA", { month: "short", timeZone: "UTC" })
    });
  }

  return months.map((month) => {
    const monthReviews = reviews.filter((review) => String(reviewDate(review)).startsWith(month.key));
    const avg = monthReviews.length
      ? monthReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / monthReviews.length * 20
      : null;

    return {
      month: month.label,
      residentExperience: avg === null ? null : Number(avg.toFixed(1)),
      employerBrand: 76,
      trustFriction: 74
    };
  });
}

function injectReportData(reportPath, reportData) {
  const html = fs.readFileSync(reportPath, "utf8");
  const replacement = `const sampleData = ${JSON.stringify(reportData, null, 6)};`;
  const updated = html.replace(/const sampleData = [\s\S]*?;\n\n    const sourceWeights/, `${replacement}\n\n    const sourceWeights`);

  if (updated === html) {
    throw new Error("Could not find the sampleData block in the HTML report.");
  }

  fs.writeFileSync(reportPath, updated);
}

async function main() {
  loadEnvFile();
  const options = parseArgs(process.argv.slice(2));
  const savedToken = readSavedToken();
  const email = process.env.REVIEWTRACKERS_EMAIL || savedToken.email;
  const token = process.env.REVIEWTRACKERS_TOKEN || savedToken.token;
  const accountId = options.accountId || process.env.REVIEWTRACKERS_ACCOUNT_ID || savedToken.account_id;

  if (!email || !token || !accountId) {
    throw new Error("Missing ReviewTrackers credentials. Create a token first, then ensure email, token, and account_id are available.");
  }

  const context = { email, token, accountId };
  const propertyData = loadPropertyData(options);
  const previousOptions = priorPeriod(options);
  const [reviews, locations, groups, items, performanceScoresPayload, metricsPayload, previousMetricsPayload] = await Promise.all([
    fetchReviews({ ...options, email, token, accountId }),
    fetchLocations(context).catch((error) => {
      console.warn(`Skipping locations lookup: ${error.message}`);
      return [];
    }),
    options.useReviewTrackersGroups ? fetchGroups(context).catch((error) => {
      console.warn(`Skipping groups lookup: ${error.message}`);
      return [];
    }) : [],
    options.useReviewTrackersGroups ? fetchItems(context).catch((error) => {
      console.warn(`Skipping group items lookup: ${error.message}`);
      return [];
    }) : [],
    options.includePerformanceScore ? fetchPerformanceScores(context, options).catch((error) => {
      console.warn(`Skipping performance score lookup: ${error.message}`);
      return { rows: [], aggregateScore: null, lagAggregateScore: null };
    }) : { rows: [], aggregateScore: null, lagAggregateScore: null },
    fetchMetricsOverviewBreakdown(context, options).catch((error) => {
      console.warn(`Skipping metrics overview lookup: ${error.message}`);
      return null;
    }),
    fetchMetricsOverviewBreakdown(context, previousOptions).catch((error) => {
      console.warn(`Skipping previous metrics overview lookup: ${error.message}`);
      return null;
    })
  ]);
  const reviewTrackersDashboardMetrics = buildReviewTrackersDashboardMetrics(metricsPayload, previousMetricsPayload, performanceScoresPayload);
  const aggregated = aggregateReviews(reviews, options, { locations, groups, items, performanceScores: performanceScoresPayload.rows, propertyData });
  const competitorData = options.includeCompetitors
    ? await fetchCompetitors(context, options, aggregated.residences).catch((error) => {
      console.warn(`Skipping competitors lookup: ${error.message}`);
      return {
        comparisons: [],
        validation: {
          requestedLocations: aggregated.residences.filter((residence) => residence.active && residence.reviewtrackersLocationId).length,
          locationsWithCompetitors: 0,
          competitorRows: 0,
          errors: [error.message]
        }
      };
    })
    : {
      comparisons: [],
      validation: {
        requestedLocations: 0,
        locationsWithCompetitors: 0,
        competitorRows: 0,
        errors: []
      }
    };
  const operatingRegionCounts = Object.fromEntries(
    [...aggregated.residences.reduce((counts, residence) => {
      const region = residence.operatingRegion || residence.region || outsideOperatingRegionLabel;
      counts.set(region, (counts.get(region) || 0) + 1);
      return counts;
    }, new Map())].sort((a, b) => a[0].localeCompare(b[0]))
  );
  const propertyMatches = aggregated.residences.filter((residence) => residence.propertyData).length;
  const propertyNpsScored = aggregated.residences.filter((residence) => {
    return residence.propertyData &&
      residence.propertyData.residentNps !== null &&
      residence.propertyData.employeeNps !== null;
  }).length;
  const outsideOperatingRegionGroups = Object.fromEntries(
    [...aggregated.residences
      .filter((residence) => (residence.operatingRegion || residence.region) === outsideOperatingRegionLabel)
      .reduce((counts, residence) => {
        const groupsForResidence = residence.groups?.length ? residence.groups : ["No ReviewTrackers group"];
        for (const group of groupsForResidence) {
          counts.set(group, (counts.get(group) || 0) + 1);
        }
        return counts;
      }, new Map())]
      .sort((a, b) => a[0].localeCompare(b[0]))
  );
  const reportData = {
    publishedAfter: options.publishedAfter,
    publishedBefore: options.publishedBefore,
    asOfDate: options.publishedBefore,
    priorPeriod: previousOptions,
    reviewTrackersDashboardMetrics,
    reviewTrackersPerformanceAggregate: performanceScoresPayload.aggregateScore,
    reviewTrackersLagPerformanceAggregate: performanceScoresPayload.lagAggregateScore,
    residences: aggregated.residences,
    reviewSnapshots: aggregated.reviewSnapshots,
    employerSnapshots: aggregated.employerSnapshots,
    competitorComparisons: competitorData.comparisons,
    propertyData: {
      sourceFile: propertyData.sourceFile ? path.basename(propertyData.sourceFile) : null,
      year: propertyData.year,
      rows: propertyData.rows
    },
    employerBrand: aggregated.employerSnapshots,
    trustFriction: null,
    documentLogicConfig: {
      defaultScoringModel: "full",
      weights: {
        residentExperience: 0.6,
        npsComponent: 0.3,
        employerBrand: 0.1
      },
      scoringModels: {
        full: {
          label: "Full score",
          description: "Resident Experience 60% + Resident NPS 30% + Employer Brand 10%",
          weights: {
            residentExperience: 0.6,
            npsComponent: 0.3,
            employerBrand: 0.1
          },
          includeEmployerBrand: true
        },
        resident: {
          label: "Resident only",
          description: "Resident Experience 60% + Resident NPS 40%",
          weights: {
            residentExperience: 0.6,
            npsComponent: 0.4,
            employerBrand: 0
          },
          includeEmployerBrand: false
        }
      },
      residenceSourceWeights: {
        Google: 1,
        Yelp: 0.8,
        Facebook: 0.7,
        SeniorAdvisor: 0.6,
        APlaceForMom: 0.6,
        Caring: 0.6
      },
      employerSources: ["Glassdoor", "Indeed"],
      employerBrandSignals: ["employeeNpsScore", "Glassdoor", "Indeed"],
      npsScale: "-100_to_100",
      npsComponent: "residentNpsScore",
      ratingFormula: "rating_100 = (rating_raw / rating_scale) * 100",
      volumeWeightFormula: "ln(1 + review_count)",
      recencyWeights: [
        { maxAgeMonths: 12, weight: 1 },
        { maxAgeMonths: 24, weight: 0.7 },
        { maxAgeMonths: null, weight: 0.5 }
      ],
      confidenceGrades: [
        { grade: "A", criteria: ">=120 reviews and >=2 sources" },
        { grade: "B", criteria: "60-119 reviews and >=2 sources" },
        { grade: "C", criteria: "20-59 reviews or 1 source" },
        { grade: "D", criteria: "<20 reviews" }
      ],
      trustFrictionSubstitute: "residentNpsScore"
    },
    monthlyTrend: buildMonthlyTrend(reviews, options),
    validation: {
      totalResidences: aggregated.residences.length,
      totalReviewSnapshots: aggregated.reviewSnapshots.length,
      operatingRegionCounts,
      outsideOperatingRegionCount: operatingRegionCounts[outsideOperatingRegionLabel] || 0,
      outsideOperatingRegionGroups,
      excludedNonResidenceSources: aggregated.excludedSourceCounts,
      employerSnapshots: aggregated.employerSnapshots.length,
      propertyDataSourceFile: propertyData.sourceFile ? path.basename(propertyData.sourceFile) : null,
      propertyRows: propertyData.rows.length,
      propertyMatches,
      propertyNpsScored,
      propertyMissingNps: propertyMatches - propertyNpsScored,
      competitors: competitorData.validation
    }
  };

  fs.mkdirSync(path.dirname(options.outputJson), { recursive: true });
  fs.writeFileSync(options.outputJson, JSON.stringify(reportData, null, 2));
  injectReportData(options.reportPath, reportData);

  console.log(`Wrote ${options.outputJson}`);
  console.log(`Updated ${options.reportPath}`);
  console.log(`Locations: ${reportData.residences.length}`);
  console.log(`Source snapshots: ${reportData.reviewSnapshots.length}`);
  console.log(`ReviewTrackers location records: ${locations.length}`);
  console.log(`ReviewTrackers groups: ${groups.length}`);
  console.log(`ReviewTrackers dashboard performance score: ${reviewTrackersDashboardMetrics.performanceScore ?? "not available"}`);
  console.log(`ReviewTrackers dashboard total reviews: ${reviewTrackersDashboardMetrics.totalReviews ?? "not available"}`);
  console.log(`Competitor locations requested: ${reportData.validation.competitors.requestedLocations}`);
  console.log(`Competitor locations with data: ${reportData.validation.competitors.locationsWithCompetitors}`);
  console.log(`Competitor rows: ${reportData.validation.competitors.competitorRows}`);
  if (reportData.validation.competitors.errors.length) {
    console.log(`Competitor lookup errors: ${reportData.validation.competitors.errors.length}`);
  }
  console.log(`Employer snapshots: ${aggregated.employerSnapshots.length}`);
  console.log("Operating region counts:");
  for (const [region, count] of Object.entries(operatingRegionCounts)) {
    console.log(`  ${region}: ${count}`);
  }
  console.log(`Outside operating-region groups: ${reportData.validation.outsideOperatingRegionCount}`);
  if (reportData.validation.outsideOperatingRegionCount) {
    console.log("Outside operating-region group detail:");
    for (const [group, count] of Object.entries(outsideOperatingRegionGroups)) {
      console.log(`  ${group}: ${count}`);
    }
  }
  console.log(`Excluded non-residence sources: ${JSON.stringify(aggregated.excludedSourceCounts)}`);
  console.log(`Property data sheet: ${propertyData.sourceFile || "not found"}`);
  console.log(`Property rows: ${propertyData.rows.length}`);
  console.log(`Property matches: ${reportData.validation.propertyMatches}`);
  console.log(`Property NPS-scored matches: ${reportData.validation.propertyNpsScored}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
