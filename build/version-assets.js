#!/usr/bin/env node
// Проставляет ?v=<hash> ко всем ссылкам на css/*.min.css и js/*.min.js на страницах
// сайта, чтобы браузер не отдавал закэшированную версию файла после деплоя правок.
// Хэш — первые 8 символов sha256 от содержимого файла, поэтому версия меняется
// только тогда, когда реально меняется сам файл (не нужно вручную придумывать
// номер версии и не забывать его бампать).
//
// Скрипт идемпотентен: повторный запуск просто пересчитывает хэш и заменяет
// уже проставленный ?v=... на актуальный, не трогая остальной HTML страницы.
// Запускать ПОСЛЕ build/minify-assets.js (версия должна отражать содержимое
// уже минифицированного файла, а не исходника) вручную перед каждым git push,
// если менялся css/style.css, css/home.css или любой из js/*.js — либо просто
// `npm run build`, который прогоняет весь порядок сам:
//   node build/minify-assets.js && node build/version-assets.js

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");

const PAGES = [
  "index.html",
  "video/index.html",
  "design/index.html",
  "photo/index.html",
  "ai/index.html",
  "cases/index.html",
  "cases/brait/index.html",
  "cases/razdolye-neptune/index.html",
  "cases/rockstar-cocktails/index.html",
  "cases/battle-of-robots/index.html",
  "cases/graphsil/index.html",
  "cases/injiniring/index.html",
  "cases/express-import/index.html",
  "cases/mobilov/index.html",
  "cases/psp-sport/index.html",
  "cases/aratta/index.html",
  "cases/panorama/index.html",
  "cases/felix/index.html",
  "cases/lukoil-ai/index.html",
  "cases/stickbot/index.html",
  "cases/toyota-supra-green-mamba/index.html",
  "careers/index.html",
  "pro/index.html",
  "edu/index.html",
  "docs/index.html",
];

const ASSETS = [
  "css/style.min.css",
  "css/home.min.css",
  "css/pro.min.css",
  "js/app.min.js",
  "js/gallery.min.js",
  "js/hero3d.min.js",
  "js/hero3d-video.min.js",
];

function hashOf(relPath) {
  const buf = fs.readFileSync(path.join(ROOT, relPath));
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 8);
}

const hashByBasename = {};
for (const asset of ASSETS) {
  hashByBasename[path.basename(asset)] = hashOf(asset);
}

// href="...css/style.css" или src="...js/app.js" (атрибут в открывающем теге)
const attrRe = /(href|src)="([^"]*?\/)?([\w.-]+\.(?:css|js))(\?v=[a-f0-9]{8})?"/g;
// s.src = '...js/hero3d.js' (программная подстановка src в инлайн-скриптах)
const dynRe = /(s\.src\s*=\s*)'([^']*?\/)?([\w.-]+\.js)(\?v=[a-f0-9]{8})?'/g;

function versionedPath(dir, basename) {
  const hash = hashByBasename[basename];
  if (!hash) return null;
  return `${dir || ""}${basename}?v=${hash}`;
}

let changedFiles = 0;
for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  const original = fs.readFileSync(file, "utf8");

  let html = original.replace(attrRe, (m, attr, dir, basename) => {
    const versioned = versionedPath(dir, basename);
    if (!versioned) return m;
    return `${attr}="${versioned}"`;
  });

  html = html.replace(dynRe, (m, prefix, dir, basename) => {
    const versioned = versionedPath(dir, basename);
    if (!versioned) return m;
    return `${prefix}'${versioned}'`;
  });

  if (html !== original) {
    fs.writeFileSync(file, html, "utf8");
    changedFiles++;
    console.log(`✓ ${rel}`);
  }
}

console.log(`\nГотово: обновлено ${changedFiles} из ${PAGES.length} страниц.`);
console.log("Хэши:", hashByBasename);
