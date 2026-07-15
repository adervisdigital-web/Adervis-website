#!/usr/bin/env node
// Инлайнит components/header.html и components/footer.html в каждую страницу
// сайта — заменяет пустые #header-placeholder/#footer-placeholder на реальную
// разметку прямо в исходном HTML. Раньше эта разметка подставлялась только
// через fetch() в js/app.js уже после загрузки страницы: поисковики (особенно
// Яндекс) и пользователи без JS не видели ни навигации, ни подвала сайта.
//
// components/header.html и components/footer.html остаются единственным
// источником правды — после правки любого из них нужно перезапустить:
//   node build/inline-components.js
// Скрипт идемпотентен: повторный запуск просто обновляет уже вставленный
// блок между BEGIN/END-маркерами, не трогая остальной HTML страницы.
//
// Пути внутри header.html/footer.html (href="/video/", src="/logo.svg" и т.п.)
// написаны от корня сайта и не требуют пересчёта — сайт всегда раздаётся с
// корня домена adervis.ru, а не из подпапки.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const HEADER = fs.readFileSync(path.join(ROOT, "components/header.html"), "utf8").trim();
const FOOTER = fs.readFileSync(path.join(ROOT, "components/footer.html"), "utf8").trim();

const PAGES = [
  "index.html",
  "video/index.html",
  "design/index.html",
  "photo/index.html",
  "ai/index.html",
  "cases/index.html",
  "cases/brait/index.html",
  "cases/battle-of-robots/index.html",
  "cases/graphsil/index.html",
  "cases/lukoil-ai/index.html",
  "cases/stickbot/index.html",
  "cases/toyota-supra-green-mamba/index.html",
  "careers/index.html",
  "pro/index.html",
  "edu/index.html",
  "docs/index.html",
];

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Вставляет content внутрь <div id="containerId">...</div>, оборачивая его
// в собственные BEGIN/END-маркеры — так повторный запуск находит и заменяет
// именно свою вставку, а не наугад ищет "ближайший </div>" (внутри
// header.html/footer.html полно своих вложенных div, посчитать их regexp'ом
// без парсера нельзя).
function inject(html, containerId, content) {
  const begin = `<!-- BEGIN:${containerId} -->`;
  const end = `<!-- END:${containerId} -->`;
  const wrapped = `${begin}\n${content}\n${end}`;

  const markerRe = new RegExp(`${escapeRe(begin)}[\\s\\S]*?${escapeRe(end)}`);
  if (markerRe.test(html)) {
    return { html: html.replace(markerRe, wrapped), found: true };
  }

  const emptyRe = new RegExp(`<div id="${containerId}"></div>`);
  if (emptyRe.test(html)) {
    return { html: html.replace(emptyRe, `<div id="${containerId}">${wrapped}</div>`), found: true };
  }

  return { html, found: false };
}

let changed = 0;
for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  const original = fs.readFileSync(file, "utf8");
  let html = original;

  const h = inject(html, "header-placeholder", HEADER);
  const f = inject(h.html, "footer-placeholder", FOOTER);

  if (!h.found || !f.found) {
    console.warn(`! ${rel}: не найден header-placeholder/footer-placeholder, пропущено`);
    continue;
  }

  if (f.html !== original) {
    fs.writeFileSync(file, f.html, "utf8");
    changed++;
    console.log(`✓ ${rel}`);
  }
}

console.log(`\nГотово: обновлено ${changed} из ${PAGES.length} страниц.`);
