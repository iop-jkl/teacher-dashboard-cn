import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";

const require = createRequire(import.meta.url);
const blake3 = require(
  "C:/Users/lenovo/AppData/Roaming/npm/node_modules/wrangler/node_modules/blake3-wasm",
);

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

const [projectName, dirArg, branch = "main"] = process.argv.slice(2);
if (!projectName || !dirArg) {
  console.error("usage: node cf-pages-upload.mjs <project> <distDir> [branch]");
  process.exit(1);
}

const accountId = "36a55119832bd1352228e99a09a749ba";
const base = "https://api.cloudflare.com/client/v4";
const configPath =
  "C:/Users/lenovo/AppData/Roaming/xdg.config/.wrangler/config/default.toml";
const outDir = resolve(".cf-deploy", projectName);
mkdirSync(outDir, { recursive: true });

const configText = readFileSync(configPath, "utf8");
const oauthMatch = configText.match(/^oauth_token\s*=\s*"([^"]+)"/m);
if (!oauthMatch) throw new Error("oauth_token not found in wrangler config");
const oauthToken = oauthMatch[1];

function walk(dir, start, map = new Map()) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(start, full).split(sep).join("/");
    if (isIgnored(rel)) {
      continue;
    }
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, start, map);
    } else {
      map.set(rel, full);
    }
  }
  return map;
}

function isIgnored(rel) {
  const rootOnly = new Set([
    "_worker.js",
    "_redirects",
    "_headers",
    "_routes.json",
    "404.html",
    "functions",
    ".wrangler",
  ]);
  if (rootOnly.has(rel)) return true;
  const parts = rel.split("/");
  return (
    parts.includes("node_modules") ||
    parts.includes(".git") ||
    parts.includes(".DS_Store")
  );
}

function fileHash(filePath) {
  const contents = readFileSync(filePath);
  const base64Contents = contents.toString("base64");
  const extension = extname(filePath).substring(1);
  return blake3.hash(base64Contents + extension).toString("hex").slice(0, 32);
}

const startDir = resolve(dirArg);
const files = walk(startDir, startDir);
const records = [...files.entries()].map(([rel, full]) => ({
  rel,
  path: full,
  contentType:
    CONTENT_TYPES[extname(full).toLowerCase()] || "application/octet-stream",
  hash: fileHash(full),
}));

const manifest = Object.fromEntries(records.map((r) => [`/${r.rel}`, r.hash]));
const hashes = records.map((r) => r.hash);
const payload = records.map((r) => ({
  key: r.hash,
  value: readFileSync(r.path).toString("base64"),
  metadata: { contentType: r.contentType },
  base64: true,
}));

writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest));
writeFileSync(join(outDir, "hashes.json"), JSON.stringify({ hashes }));
writeFileSync(join(outDir, "payload.json"), JSON.stringify(payload));

function curl(args, showBody = true) {
  const stdout = execFileSync("curl.exe", ["-s", "-w", "\n%{http_code}", ...args], {
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
  });
  const idx = stdout.lastIndexOf("\n");
  const body = stdout.slice(0, idx);
  const code = stdout.slice(idx + 1).trim();
  if (showBody) console.log(body);
  return { body, code };
}

console.log(`files: ${records.length}`);
console.log("getting upload token...");
const tokenRes = curl([
  "-H",
  `Authorization: Bearer ${oauthToken}`,
  `${base}/accounts/${accountId}/pages/projects/${projectName}/upload-token`,
]);
const jwt = JSON.parse(tokenRes.body).result.jwt;

console.log("check-missing...");
const missingRes = curl([
  "-X",
  "POST",
  "-H",
  "Content-Type: application/json",
  "-H",
  `Authorization: Bearer ${jwt}`,
  "-d",
  `@${join(outDir, "hashes.json")}`,
  `${base}/pages/assets/check-missing`,
]);
const missing = JSON.parse(missingRes.body).result;

console.log(`missing: ${missing.length}/${hashes.length}`);
if (missing.length > 0) {
  const missingPayload = payload.filter((p) => missing.includes(p.key));
  writeFileSync(join(outDir, "payload-missing.json"), JSON.stringify(missingPayload));
  console.log("uploading assets...");
  curl(
    [
      "-X",
      "POST",
      "-H",
      "Content-Type: application/json",
      "-H",
      `Authorization: Bearer ${jwt}`,
      "-d",
      `@${join(outDir, "payload-missing.json")}`,
      `${base}/pages/assets/upload`,
    ],
    false,
  );
}

console.log("upsert-hashes...");
curl([
  "-X",
  "POST",
  "-H",
  "Content-Type: application/json",
  "-H",
  `Authorization: Bearer ${jwt}`,
  "-d",
  `@${join(outDir, "hashes.json")}`,
  `${base}/pages/assets/upsert-hashes`,
]);

console.log("creating deployment...");
const formArgs = [
  "-X",
  "POST",
  "-H",
  `Authorization: Bearer ${oauthToken}`,
  "-F",
  `manifest=${JSON.stringify(manifest)}`,
  "-F",
  `branch=${branch}`,
];
const redirectsPath = join(startDir, "_redirects");
try {
  statSync(redirectsPath);
  formArgs.push("-F", `_redirects=@${redirectsPath};type=text/plain`);
  console.log(`attaching _redirects from ${redirectsPath}`);
} catch {}
curl([...formArgs, `${base}/accounts/${accountId}/pages/projects/${projectName}/deployments`]);
