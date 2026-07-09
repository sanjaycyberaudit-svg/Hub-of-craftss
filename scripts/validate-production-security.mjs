#!/usr/bin/env node
/**
 * Post-deploy smoke test for SSR Tex production security + core routes.
 * Usage: node scripts/validate-production-security.mjs [baseUrl]
 */

const BASE = (process.argv[2] ?? "https://www.sairaghavendratex.com").replace(
  /\/$/,
  "",
);

const REQUIRED_HEADERS = [
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "content-security-policy",
];

const FORBIDDEN_HEADERS = ["x-powered-by"];

const ROUTES = [
  { path: "/", expectStatus: 200, expectBody: "SRI SAI RAGHAVENDRA TEX" },
  { path: "/sign-in", expectStatus: 200, expectBody: "Sign" },
  { path: "/forgot-password", expectStatus: 200, expectBody: "password" },
  { path: "/shop", expectStatus: 200 },
  { path: "/api/health", expectStatus: 200, expectBody: "ok" },
  {
    path: "/api/storefront/products?mode=featured&first=4",
    expectStatus: 200,
    expectBody: "productsCollection",
  },
];

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

async function checkHeaders() {
  const res = await fetch(`${BASE}/`, { redirect: "follow" });
  const headers = Object.fromEntries(
    [...res.headers.entries()].map(([k, v]) => [k.toLowerCase(), v]),
  );

  for (const name of REQUIRED_HEADERS) {
    if (!headers[name]) {
      fail(`Missing header ${name} on ${BASE}/`);
    } else {
      pass(`${name}: ${headers[name].slice(0, 80)}${headers[name].length > 80 ? "…" : ""}`);
    }
  }

  for (const name of FORBIDDEN_HEADERS) {
    if (headers[name]) {
      fail(`Leaking header ${name}: ${headers[name]}`);
    } else {
      pass(`No ${name} header`);
    }
  }

  if (res.status !== 200) {
    fail(`Homepage status ${res.status}`);
  } else {
    pass(`Homepage HTTP ${res.status}`);
  }
}

async function checkRoute(route) {
  const url = `${BASE}${route.path}`;
  const res = await fetch(url, { redirect: "follow" });
  if (res.status !== route.expectStatus) {
    fail(`${route.path} returned ${res.status}, expected ${route.expectStatus}`);
    return;
  }

  const body = await res.text();
  if (route.expectBody && !body.toLowerCase().includes(route.expectBody.toLowerCase())) {
    fail(`${route.path} missing expected content "${route.expectBody}"`);
    return;
  }

  pass(`${route.path} → ${res.status}`);
}

async function checkHttpsRedirect() {
  const res = await fetch("http://www.sairaghavendratex.com/", {
    redirect: "manual",
  });
  if (![301, 308, 302, 307].includes(res.status)) {
    fail(`HTTP redirect status unexpected: ${res.status}`);
    return;
  }
  const location = res.headers.get("location") ?? "";
  if (!location.startsWith("https://")) {
    fail(`HTTP redirect location not HTTPS: ${location}`);
    return;
  }
  pass(`HTTP → HTTPS redirect (${res.status})`);
}

async function main() {
  console.log(`Validating ${BASE}\n`);
  await checkHttpsRedirect();
  console.log("");
  await checkHeaders();
  console.log("");
  for (const route of ROUTES) {
    await checkRoute(route);
  }

  if (process.exitCode) {
    console.log("\nValidation completed with failures.");
    process.exit(process.exitCode);
  }
  console.log("\nAll production security checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
