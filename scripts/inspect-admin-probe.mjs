import { readFileSync, writeFileSync } from "node:fs";

const t = readFileSync("scripts/.admin-probe.html", "utf8");
const i = t.indexOf("digest");
console.log("around digest:\n", t.slice(Math.max(0, i - 250), i + 350));
const digests = [...t.matchAll(/"digest"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
console.log("digests", digests);
const errBits = [...t.matchAll(/[^\n]{0,80}(TypeError|ReactCurrentOwner|Admin could not)[^\n]{0,80}/g)];
console.log("err bits", errBits.map((m) => m[0]));
writeFileSync(
  "scripts/.admin-probe-snippet.txt",
  t.slice(Math.max(0, i - 250), i + 350),
);
