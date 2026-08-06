import { writeFileSync } from "fs";
import { AwsClient } from "aws4fetch";
import { loadProjectIdentity } from "./lib/load-project-identity.mjs";

const identity = loadProjectIdentity();
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const endpoint = identity.cloudflare.r2.s3Endpoint.replace(/\/$/, "");
const bucket = identity.cloudflare.r2.mediaBucket;

if (!accessKeyId || !secretAccessKey) {
  console.error("missing_creds");
  process.exit(1);
}

const key = `healthcheck/direct-r2-${Date.now()}.txt`;
const url = `${endpoint}/${bucket}/${key}`;
const client = new AwsClient({
  accessKeyId,
  secretAccessKey,
  service: "s3",
  region: "auto",
});

const put = await client.fetch(url, {
  method: "PUT",
  headers: { "Content-Type": "text/plain" },
  body: "direct-ok",
});
const putBody = await put.text().catch(() => "");
console.log(JSON.stringify({ put: put.status, ok: put.ok, body: putBody.slice(0, 120) }));

if (!put.ok) process.exit(2);

const get = await client.fetch(url, { method: "GET" });
const getText = await get.text();
console.log(JSON.stringify({ get: get.status, text: getText }));

const del = await client.fetch(url, { method: "DELETE" });
console.log(JSON.stringify({ del: del.status }));

writeFileSync(
  "scripts/.r2-direct-ok.tmp",
  JSON.stringify({ validatedAt: new Date().toISOString(), put: put.status }),
);
