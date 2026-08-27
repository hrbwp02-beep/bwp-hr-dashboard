// build.mjs — รวม/แปลง JSX เป็น bundle.js เดียว (ตัด Babel-in-browser ออกจาก production)
// รันบน GitHub Actions: node build.mjs → สร้างโฟลเดอร์ dist/ สำหรับ GitHub Pages
import { transform } from "esbuild";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");

const srcs = [...html.matchAll(/<script[^>]*src="([^"]+\.jsx)"[^>]*><\/script>/g)].map((m) => m[1]);
if (!srcs.length) throw new Error("ไม่พบไฟล์ .jsx ใน index.html");

let bundle = "// build จาก JSX — อย่าแก้ไฟล์นี้โดยตรง (สร้างโดย build.mjs)\n";
for (const f of srcs) {
  const code = await readFile(f, "utf8");
  const res = await transform(code, { loader: "jsx", charset: "utf8", jsx: "transform", target: "es2018" });
  // เลียนแบบ babel-standalone: top-level function ถูกทำเป็น global (บน window)
  // (const/let ไม่ถูกทำ global จึงคงหุ้ม IIFE แยก scope กัน const ซ้ำชนกัน)
  const fnNames = [...new Set([...code.matchAll(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)].map((m) => m[1]))];
  const exposer = fnNames.map((n) => `try{window.${n}=${n};}catch(e){}`).join("");
  bundle += `\n/* ===== ${f} ===== */\n(function(){\n${res.code}\n${exposer}\n})();\n`;
}

await mkdir("dist", { recursive: true });
await writeFile("dist/bundle.js", bundle, "utf8");

const stamp = Date.now();
const out = html
  .replace(/\s*<script[^>]*@babel\/standalone[^>]*><\/script>/g, "")
  .replace(/\s*<script type="text\/babel"[^>]*><\/script>/g, "")
  .replace(/<\/body>/, `<script src="bundle.js?v=${stamp}"></script>\n</body>`);
await writeFile("dist/index.html", out, "utf8");

for (const a of ["styles.css", "logo.svg"]) {
  try { await copyFile(a, `dist/${a}`); } catch (e) { console.warn("ข้ามไฟล์", a, e.message); }
}

console.log(`สร้าง dist/ สำเร็จ · รวม ${srcs.length} ไฟล์ · bundle ${(bundle.length / 1024).toFixed(0)} KB`);
