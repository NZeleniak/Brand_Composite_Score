import fs from "node:fs";

const API_BASE = "https://api-gateway.reviewtrackers.com";
const ACCEPT = "application/vnd.rtx.authorization.v2.hal+json;charset=utf-8";

function loadEnvFile(path = ".env") {
  if (!fs.existsSync(path)) return;

  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);
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

function basicAuth(email, secret) {
  return `Basic ${Buffer.from(`${email}:${secret}`, "utf8").toString("base64")}`;
}

async function reviewTrackersRequest(path, { method = "GET", email, secret } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      accept: ACCEPT,
      "content-type": "application/json",
      authorization: basicAuth(email, secret),
      "user-agent": "ChartwellBrandCompositeScore/1.0"
    }
  });

  if (response.status === 204) return null;

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message = typeof body === "string" ? body : JSON.stringify(body, null, 2);
    throw new Error(`ReviewTrackers ${method} ${path} failed: HTTP ${response.status}\n${message}`);
  }

  return body;
}

async function createToken() {
  const email = process.env.REVIEWTRACKERS_EMAIL;
  const password = process.env.REVIEWTRACKERS_PASSWORD;
  if (!email || !password) {
    throw new Error("Set REVIEWTRACKERS_EMAIL and REVIEWTRACKERS_PASSWORD in .env before creating a token.");
  }

  const token = await reviewTrackersRequest("/auth", {
    method: "POST",
    email,
    secret: password
  });

  const safeTokenInfo = {
    account_id: token.account_id,
    email: token.email,
    expires_at: token.expires_at,
    token: token.token,
    user_agent: token.user_agent
  };

  fs.writeFileSync("reviewtrackers-token.json", JSON.stringify(safeTokenInfo, null, 2));
  console.log(`Created token for ${safeTokenInfo.email}`);
  console.log(`Account ID: ${safeTokenInfo.account_id}`);
  console.log(`Expires at: ${safeTokenInfo.expires_at}`);
  console.log("Saved token to reviewtrackers-token.json");
}

async function validateToken() {
  const email = process.env.REVIEWTRACKERS_EMAIL;
  const token = process.env.REVIEWTRACKERS_TOKEN || readSavedToken();
  if (!email || !token) {
    throw new Error("Set REVIEWTRACKERS_EMAIL and REVIEWTRACKERS_TOKEN, or create reviewtrackers-token.json first.");
  }

  const validation = await reviewTrackersRequest("/auth", {
    method: "GET",
    email,
    secret: token
  });

  console.log(`Valid token for ${validation.email}`);
  console.log(`Account ID: ${validation.account_id}`);
  console.log(`Expires at: ${validation.expires_at}`);
}

function readSavedToken() {
  if (!fs.existsSync("reviewtrackers-token.json")) return "";
  const saved = JSON.parse(fs.readFileSync("reviewtrackers-token.json", "utf8"));
  return saved.token || "";
}

async function main() {
  loadEnvFile();

  const command = process.argv[2];
  if (command === "create-token") {
    await createToken();
    return;
  }
  if (command === "validate-token") {
    await validateToken();
    return;
  }

  console.log("Usage:");
  console.log("  node scripts/reviewtrackers-auth.mjs create-token");
  console.log("  node scripts/reviewtrackers-auth.mjs validate-token");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
