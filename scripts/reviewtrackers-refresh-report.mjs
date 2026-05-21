import fs from "node:fs";
import path from "node:path";

const API_BASE = "https://api.reviewtrackers.com";
const USER_AGENT = "ChartwellBrandCompositeScore/1.0";
const DEFAULT_REPORT_PATH = "Brand Composite Score.html";
const DEFAULT_OUTPUT_JSON = "data/reviewtrackers-report-data.json";
const ACCEPT_HAL = "application/hal+json";

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
    useReviewTrackersGroups: true,
    includePerformanceScore: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--published-after") options.publishedAfter = next, index += 1;
    else if (arg === "--published-before") options.publishedBefore = next, index += 1;
    else if (arg === "--report") options.reportPath = next, index += 1;
    else if (arg === "--output-json") options.outputJson = next, index += 1;
    else if (arg === "--residence-master") options.residenceMaster = next, index += 1;
    else if (arg === "--account-id") options.accountId = next, index += 1;
    else if (arg === "--no-groups") options.useReviewTrackersGroups = false;
    else if (arg === "--no-performance-score") options.includePerformanceScore = false;
  }

  return options;
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

  while (true) {
    const pathname = `/location_score/${encodeURIComponent(context.accountId)}/locations?start_date=${encodeURIComponent(options.publishedAfter)}&end_date=${encodeURIComponent(options.publishedBefore)}&per_page=500&page=${page}`;
    const payload = await fetchJson(pathname, { ...context, accept: ACCEPT_HAL });
    rows.push(...(payload._embedded?.location_scores || []));

    const totalPages = Number(payload._total_pages || 0);
    if (totalPages && page < totalPages) {
      page += 1;
      continue;
    }
    break;
  }

  return rows;
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
  return operatingRegionPriority.find((region) => groups.includes(region)) || "Unmapped";
}

function aggregateReviews(reviews, options, referenceData = {}) {
  const masterRows = readJsonIfExists(options.residenceMaster, []);
  const masterByLocationId = new Map(masterRows.map((row) => [row.reviewtrackers_location_id, row]));
  const locationsById = new Map((referenceData.locations || []).filter((location) => !location.deleted_at).map((location) => [location.id, location]));
  const groupsByLocationId = buildGroupMembershipMap(referenceData.groups || [], referenceData.items || []);
  const performanceByLocationId = new Map((referenceData.performanceScores || []).map((score) => [score.location_id, score]));
  const locationMap = new Map();
  const bucketMap = new Map();
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
      continue;
    }
    const groups = groupsByLocationId.get(review.location_id) || [];
    const operatingRegion = master?.region || master?.operatingRegion || deriveOperatingRegion(groups);

    if (!locationMap.has(review.location_id)) {
      locationMap.set(review.location_id, {
        id: master?.residence_id || review.location_id,
        reviewtrackersLocationId: review.location_id,
        name: master?.name || apiLocation?.public_name || apiLocation?.name || review.location_name || "Unknown Location",
        city: master?.city || [apiLocation?.city, apiLocation?.state].filter(Boolean).join(", ") || normalizeCity(review),
        region: operatingRegion,
        operatingRegion,
        groups,
        careType: master?.careType || "Unmapped",
        active: master?.active ?? apiLocation?.open_status !== "inactive",
        reviewTrackersPerformanceScore: performance?.location_score ?? performance?.score?.overall_score ?? null,
        reviewTrackersResponseRate: performance?.completed_rate ?? null
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

  return { residences, reviewSnapshots, excludedSourceCounts };
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
  const [reviews, locations, groups, items, performanceScores] = await Promise.all([
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
      return [];
    }) : []
  ]);
  const aggregated = aggregateReviews(reviews, options, { locations, groups, items, performanceScores });
  const operatingRegionCounts = Object.fromEntries(
    [...aggregated.residences.reduce((counts, residence) => {
      const region = residence.operatingRegion || residence.region || "Unmapped";
      counts.set(region, (counts.get(region) || 0) + 1);
      return counts;
    }, new Map())].sort((a, b) => a[0].localeCompare(b[0]))
  );
  const reportData = {
    asOfDate: options.publishedBefore,
    residences: aggregated.residences,
    reviewSnapshots: aggregated.reviewSnapshots,
    employerBrand: [
      { source: "Glassdoor", ratingRaw: 3.8, ratingScale: 5, reviewCount: 1, snapshotDate: options.publishedBefore },
      { source: "Indeed", ratingRaw: 3.8, ratingScale: 5, reviewCount: 1, snapshotDate: options.publishedBefore }
    ],
    trustFriction: {
      bbbRatingRaw: 3.8,
      bbbRatingScale: 5,
      complaintCount: 0,
      complaintWindowMonths: 12,
      snapshotDate: options.publishedBefore
    },
    monthlyTrend: buildMonthlyTrend(reviews, options),
    validation: {
      totalResidences: aggregated.residences.length,
      totalReviewSnapshots: aggregated.reviewSnapshots.length,
      operatingRegionCounts,
      unmappedCount: operatingRegionCounts.Unmapped || 0,
      excludedNonResidenceSources: aggregated.excludedSourceCounts
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
  console.log("Operating region counts:");
  for (const [region, count] of Object.entries(operatingRegionCounts)) {
    console.log(`  ${region}: ${count}`);
  }
  console.log(`Unmapped: ${reportData.validation.unmappedCount}`);
  console.log(`Excluded non-residence sources: ${JSON.stringify(aggregated.excludedSourceCounts)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
