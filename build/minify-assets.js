#!/usr/bin/env node
// Минифицирует css/*.css и js/*.js в соседние *.min.* файлы — исходники
// остаются человекочитаемыми и редактируемыми, а страницы подключают
// уже минифицированную версию (см. build/version-assets.js, который
// проставляет ?v=<hash> поверх этих же .min.-файлов).
//
// Требует devDependencies (terser, clean-css) — один раз перед первым
// запуском: npm install. Дальше запускать вручную при каждом изменении
// css/style.css, css/home.css или любого js/*.js, перед git push:
//   node build/minify-assets.js
// (или просто npm run build — прогоняет весь цикл: inline-components →
// minify-assets → version-assets)

const fs = require("fs");
const path = require("path");
const CleanCSS = require("clean-css");
const { minify: minifyJs } = require("terser");

const ROOT = path.join(__dirname, "..");

const CSS_FILES = ["css/style.css", "css/home.css"];
const JS_FILES = ["js/app.js", "js/gallery.js", "js/hero3d.js", "js/hero3d-video.js"];

async function minifyCss(rel) {
  const src = path.join(ROOT, rel);
  const dest = src.replace(/\.css$/, ".min.css");
  const input = fs.readFileSync(src, "utf8");
  const output = new CleanCSS({}).minify(input);
  if (output.errors.length) throw new Error(`${rel}: ${output.errors.join("; ")}`);
  fs.writeFileSync(dest, output.styles, "utf8");
  return { rel, before: Buffer.byteLength(input), after: Buffer.byteLength(output.styles) };
}

async function minifyJsFile(rel) {
  const src = path.join(ROOT, rel);
  const dest = src.replace(/\.js$/, ".min.js");
  const input = fs.readFileSync(src, "utf8");
  const result = await minifyJs(input, { module: /hero3d/.test(rel) });
  if (!result.code) throw new Error(`${rel}: terser вернул пустой результат`);
  fs.writeFileSync(dest, result.code, "utf8");
  return { rel, before: Buffer.byteLength(input), after: Buffer.byteLength(result.code) };
}

async function main() {
  const results = [];
  for (const rel of CSS_FILES) results.push(await minifyCss(rel));
  for (const rel of JS_FILES) results.push(await minifyJsFile(rel));

  let before = 0, after = 0;
  for (const r of results) {
    before += r.before;
    after += r.after;
    console.log(`${r.rel}  ${(r.before / 1024).toFixed(1)}KB -> ${(r.after / 1024).toFixed(1)}KB`);
  }
  console.log(`\nИтого: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
