import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { loadProjectIdentity } from "./lib/load-project-identity.mjs";

const identity = loadProjectIdentity();
const accountId = identity.cloudflare.accountId;
const bucket = identity.cloudflare.r2.mediaBucket;
const toml = readFileSync(
  join(process.env.APPDATA, "xdg.config/.wrangler/config/default.toml"),
  "utf8",
);
const oauth = (toml.match(/oauth_token\s*=\s*"([^"]+)"/) || [])[1];
if (!oauth) {
  console.error("No wrangler oauth_token found");
  process.exit(1);
}

const pgRes = await fetch(
  "https://api.cloudflare.com/client/v4/user/tokens/permission_groups",
  { headers: { Authorization: `Bearer ${oauth}` } },
);
const pgJson = await pgRes.json();
const r2 = (pgJson.result || []).filter((p) => /r2/i.test(p.name));
console.log(
  JSON.stringify({
    permGroupsStatus: pgRes.status,
    r2Count: r2.length,
    names: r2.map((p) => `${p.id} | ${p.name}`),
  }),
);

const writePg = r2.find((p) => /Bucket Item Write/i.test(p.name));
const readPg = r2.find((p) => /Bucket Item Read/i.test(p.name));
const storageWrite = r2.find((p) =>
  /Workers R2 Storage Write$/i.test(p.name),
);

const permission_groups = [];
if (writePg) permission_groups.push({ id: writePg.id });
if (readPg) permission_groups.push({ id: readPg.id });
if (!permission_groups.length && storageWrite) {
  permission_groups.push({ id: storageWrite.id });
}

const body = {
  name: `vercel-r2-s3-${Date.now()}`,
  policies: [
    {
      effect: "allow",
      resources: writePg
        ? {
            [`com.cloudflare.edge.r2.bucket.${accountId}_default_${bucket}`]:
              "*",
          }
        : {
            [`com.cloudflare.api.account.${accountId}`]: "*",
          },
      permission_groups,
    },
  ],
};

async function tryCreate(url, label) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${oauth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  console.log(
    JSON.stringify({
      label,
      status: res.status,
      success: json.success,
      errors: json.errors?.slice?.(0, 3) || json.errors,
    }),
  );
  return json;
}

let created = await tryCreate(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens`,
  "account",
);
if (!created.success) {
  created = await tryCreate(
    "https://api.cloudflare.com/client/v4/user/tokens",
    "user",
  );
}

if (!created.success || !created.result?.id || !created.result?.value) {
  process.exit(2);
}

const accessKeyId = created.result.id;
const secretAccessKey = createHash("sha256")
  .update(created.result.value)
  .digest("hex");

const out = {
  accessKeyId,
  secretAccessKey,
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  bucket,
  tokenName: body.name,
};
writeFileSync("scripts/.r2-creds.tmp.json", JSON.stringify(out));
console.log(
  JSON.stringify({
    wrote: "scripts/.r2-creds.tmp.json",
    accessKeyLen: accessKeyId.length,
    secretLen: secretAccessKey.length,
    tokenName: body.name,
  }),
);
