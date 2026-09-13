#!/usr/bin/env node
// Собирает sitemap.xml из самих страниц, а не из списка, который правят руками.
//
// Зачем: до 2026-09-12 sitemap.xml правился вручную, и <lastmod> отставал от
// реальности на два с половиной месяца (в файле стояло 2026-06-29, а страницы
// правились 2026-09-10). Поисковик доверяет lastmod при планировании обхода —
// устаревшая дата означает, что свежие правки он приходит смотреть позже.
//
// Как работает:
//   1. Обходит все *.html в репозитории (кроме служебных папок).
//   2. Пропускает страницы с <meta name="robots" content="...noindex...">.
//      Сейчас это /docs/ и /edu/ — они не должны быть в sitemap, потому что
//      sitemap обязан содержать только индексируемые URL.
//   3. <loc> берёт из <link rel="canonical"> самой страницы. Это гарантирует,
//      что sitemap и canonical никогда не разойдутся — частая причина
//      «Страница не является канонической» в Яндекс.Вебмастере.
//   4. <lastmod> — дата последнего коммита, который менял файл (git log -1).
//      Не mtime: mtime сбивается при каждом clone и при прогоне сборки.
//
// Идемпотентен: результат зависит только от содержимого репозитория.
// Запускается в общей цепочке `npm run build`.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const ORIGIN = "https://adervis.ru";
const SKIP_DIRS = new Set([
  "node_modules", "_source", "components", "design-references",
  "ADERVIS-CRM-banner", "build", ".git", ".claude", "serverless", "fonts", "assets", "css", "js",
]);

// Приоритет и частота обхода по разделам. Google эти поля игнорирует,
// Яндекс учитывает слабо — держим их осмысленными, но без иллюзий:
// на позиции влияет не sitemap, а сами страницы.
function weightFor(urlPath) {
  if (urlPath === "/") return { priority: "1.0", changefreq: "weekly" };
  if (/^\/(video|design|photo|ai)\/$/.test(urlPath)) return { priority: "0.9", changefreq: "monthly" };
  if (urlPath === "/cases/") return { priority: "0.85", changefreq: "weekly" };
  if (urlPath === "/pro/") return { priority: "0.8", changefreq: "monthly" };
  if (urlPath.startsWith("/cases/")) return { priority: "0.7", changefreq: "monthly" };
  if (urlPath.startsWith("/pro/")) return { priority: "0.7", changefreq: "monthly" };
  if (urlPath.startsWith("/guides/")) return { priority: "0.6", changefreq: "monthly" };
  return { priority: "0.6", changefreq: "monthly" };
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

const TODAY = new Date().toISOString().slice(0, 10);

// Дата последнего изменения страницы.
//
// Тонкость, из-за которой первая версия всегда отставала ровно на одну
// выкатку: сборка запускается ДО коммита, поэтому `git log -1` отдаёт дату
// предыдущего коммита, а не тех правок, которые прямо сейчас уходят в прод.
// Поэтому сначала смотрим рабочее дерево: если файл изменён или ещё не под
// версионным контролем — правки свежие, ставим сегодня.
function lastModified(file) {
  try {
    const dirty = execFileSync("git", ["status", "--porcelain", "--", file], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (dirty) return TODAY;

    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) return out;
  } catch { /* git недоступен — падаем на mtime ниже */ }
  return new Date(fs.statSync(file).mtime).toISOString().slice(0, 10);
}

const entries = [];
const skipped = [];

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");

  const robots = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i);
  if (robots && /noindex/i.test(robots[1])) {
    skipped.push(`${rel} (noindex)`);
    continue;
  }

  const canon = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (!canon) {
    skipped.push(`${rel} (НЕТ canonical — страница не попала в sitemap)`);
    continue;
  }

  const loc = canon[1].trim();
  if (!loc.startsWith(ORIGIN)) {
    skipped.push(`${rel} (canonical на чужой домен: ${loc})`);
    continue;
  }

  const urlPath = loc.slice(ORIGIN.length) || "/";
  entries.push({ loc, urlPath, lastmod: lastModified(file), ...weightFor(urlPath) });
}

// Сортировка: сначала по весу (важное выше), внутри веса — по алфавиту.
entries.sort((a, b) =>
  Number(b.priority) - Number(a.priority) || a.urlPath.localeCompare(b.urlPath));

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  "<!-- Сгенерирован build/generate-sitemap.js — вручную не править:",
  "     правки перезапишутся при следующем `npm run build`.",
  "     URL берутся из canonical страниц, даты — из истории git. -->",
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries.map(e => [
    "  <url>",
    `    <loc>${e.loc}</loc>`,
    `    <lastmod>${e.lastmod}</lastmod>`,
    `    <changefreq>${e.changefreq}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    "  </url>",
  ].join("\n")),
  "</urlset>",
  "",
].join("\n");

fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");

console.log(`sitemap.xml: ${entries.length} URL`);
for (const s of skipped) console.log(`  пропущено: ${s}`);
