/**
 * Vercel 빌드 시 환경 변수로 js/config.js 생성
 * Vercel Project Settings → Environment Variables:
 *   SUPABASE_URL, SUPABASE_ANON_KEY
 */
const fs = require("fs");
const path = require("path");

const url = (process.env.SUPABASE_URL || "").trim();
const key = (process.env.SUPABASE_ANON_KEY || "").trim();

if (!url || !key) {
  console.warn(
    "Warning: SUPABASE_URL or SUPABASE_ANON_KEY missing. Copy js/config.example.js to js/config.js for local dev."
  );
}

const content =
  "window.LUMEN_CONFIG = {\n" +
  '  SUPABASE_URL: "' +
  url.replace(/\\/g, "\\\\").replace(/"/g, '\\"') +
  '",\n' +
  '  SUPABASE_ANON_KEY: "' +
  key.replace(/\\/g, "\\\\").replace(/"/g, '\\"') +
  '",\n' +
  "};\n";

const outPath = path.join(__dirname, "..", "js", "config.js");
fs.writeFileSync(outPath, content, "utf8");
console.log("Wrote", outPath);
