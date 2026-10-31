// Generates every HTML page, the sitemap and robots.txt from one config, so
// titles, descriptions, canonical URLs and structured data never drift.
// Run: node scripts/build.mjs   (output goes into ./public)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE } from '../public/assets/js/core.js';
import sumtrail from '../public/assets/js/games/sumtrail.js';
import evensplit from '../public/assets/js/games/evensplit.js';
import huematch from '../public/assets/js/games/huematch.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const VERSION = Date.now().toString(36); // cache-busts assets on each build

const SEO = {
  sumtrail: {
    title: 'Sumtrail: a daily number path puzzle',
    description: 'Trace a trail through a 5x5 grid of digits that adds up exactly to the target. A new free logic puzzle every day, same for everyone.',
    how: [
      'Your trail starts in the green top-left cell and must finish in the gold bottom-right cell.',
      'Move one cell up, down, left or right at a time. You cannot visit a cell twice.',
      'The digits on your trail must add up exactly to the target. Any route that does this wins.',
      'Your time is your score. Tap a cell already on your trail to step back to it.',
    ],
    tips: 'Work out roughly how many cells you need: divide the target by 5 (the average digit). Hug the edges when you need a long, low-sum trail, and cut through the middle when you need big digits fast.',
  },
  'even-split': {
    title: 'Even Split: a daily balance puzzle',
    description: 'Move eight numbered stones between two pans until both sides weigh exactly the same. A free daily logic puzzle you can solve in two minutes.',
    how: [
      'All eight stones start in the left pan.',
      'Tap a stone to move it to the other pan. The beam tilts towards the heavier side.',
      'Balance both pans exactly. Your time is your score, and your move count is shown.',
    ],
    tips: 'Add up all the stones first and halve it: that is what each pan must weigh. Place the biggest stones first, then fine-tune with the small ones.',
  },
  'hue-match': {
    title: 'Hue Match: a daily colour matching game',
    description: 'Mix hue, saturation and lightness to match today\'s target colour in three tries. A free daily colour perception game, scored to one decimal place.',
    how: [
      'Use the three sliders to mix a colour that matches the target swatch.',
      'Lock in a try to see your match percentage and arrows showing which slider to move.',
      'You get three tries. Your best match is your score.',
    ],
    tips: 'Fix the hue first, then lightness, then saturation. Our eyes are most sensitive to lightness, so small lightness errors cost the most points.',
  },
};

const GAMES = [sumtrail, evensplit, huematch];
const url = (p) => new URL(p, SITE.origin).toString();

function layout({ title, description, path, page, game = '', body, jsonld }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${url(path)}">
<meta name="theme-color" content="#3f7d6e">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url(path)}">
<meta property="og:image" content="${url('/og.png')}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="stylesheet" href="/assets/css/style.css?v=${VERSION}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
<!-- Analytics: paste Cloudflare Web Analytics or Plausible snippet here -->
</head>
<body data-page="${page}" data-game="${game}">
<header class="top"><a class="logo" href="/">Day<span>pebble</span></a><span class="streak" data-streak title="Daily streak">🔥 0</span></header>
<main>
${body}
</main>
<footer>
  <p>${SITE.name}: three tiny original puzzles a day, the same for everyone. <a href="/archive/">Archive</a> · <a href="/privacy/">Privacy</a></p>
</footer>
<script type="module" src="/assets/js/app.js?v=${VERSION}"></script>
</body>
</html>
`;
}

function write(rel, html) {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// Home
write('index.html', layout({
  title: `${SITE.name}: three tiny daily logic puzzles`,
  description: 'Three original two-minute logic puzzles every day: Sumtrail, Even Split and Hue Match. Free, no signup, same puzzles for everyone. Keep your streak and challenge friends.',
  path: '/', page: 'home',
  jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.origin },
  body: `
<p class="kicker">Today's pebbles <span data-num></span></p>
<h1>Three tiny puzzles. Same for everyone.</h1>
<p class="muted" data-date></p>
<div class="progress" data-progress></div>
<div class="cards" data-cards></div>
<h2>Your week</h2>
<ol class="week" data-week></ol>
<section class="teaser" data-teaser></section>
<section id="jar">
  <h2>Your pebble jar</h2>
  <p class="muted" data-calls></p>
  <ul class="jar" data-jar></ul>
</section>
<section class="faq seo">
  <h2>How Daypebble works</h2>
  <details open><summary>What is a pebble?</summary><p>A pebble is a small original puzzle you can finish in one to three minutes. There are three every day, generated for that date, so everyone in the world gets the same ones.</p></details>
  <details><summary>Do I need an account?</summary><p>No. Your streak and scores are saved on this device. Add a nickname only if you want to appear on the daily leaderboard.</p></details>
  <details><summary>How do friend challenges work?</summary><p>After you finish, tap "Challenge a friend". They get a link to the same puzzle with your score to beat.</p></details>
  <details><summary>Missed a day?</summary><p>Play past days in the <a href="/archive/">archive</a>. Archive plays don't count towards your streak. Every 7-day streak earns a streak freeze (you can hold two), which automatically covers a missed day.</p></details>
  <details><summary>What is "Call it"?</summary><p>Before each pebble you can predict your score. Call it right and you earn a 🎯 in your share, and better odds of a rare pebble when you finish all three.</p></details>
  <details><summary>What are mystery pebbles?</summary><p>Finish all three puzzles to crack open a collectible pebble for your jar. Most are common; a few are rare, and legendary ones are about one in a hundred.</p></details>
</section>`,
}));

// Game pages
for (const g of GAMES) {
  const s = SEO[g.id];
  write(`${g.id}/index.html`, layout({
    title: `${s.title} | ${SITE.name}`,
    description: s.description,
    path: `/${g.id}/`, page: 'game', game: g.id,
    jsonld: {
      '@context': 'https://schema.org', '@type': 'VideoGame', name: g.name, description: s.description,
      url: url(`/${g.id}/`), genre: 'Puzzle', gamePlatform: 'Web browser', applicationCategory: 'Game',
      operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@type': 'Organization', name: SITE.name },
    },
    body: `
<div class="gamebar"><p class="kicker">${g.name} <span data-num></span></p><span class="clock" data-clock>${g.scoring === 'time' ? '0:00' : ''}</span></div>
<h1>${g.name}</h1>
<p class="callpill" data-callpill hidden></p>
<div class="banner" data-banner hidden></div>
<div class="stage" data-stage></div>
<div class="result" data-result hidden></div>
<section class="seo">
  <h2>How to play ${g.name}</h2>
  <ol>${s.how.map((x) => `<li>${x}</li>`).join('')}</ol>
  <h2>Tips</h2>
  <p>${s.tips}</p>
  <p class="muted">A new ${g.name} puzzle appears at midnight your local time. Missed one? Try the <a href="/archive/">archive</a>.</p>
</section>`,
  }));
}

// Archive + privacy
write('archive/index.html', layout({
  title: `Puzzle archive | ${SITE.name}`,
  description: 'Play the last 30 days of Daypebble puzzles: Sumtrail, Even Split and Hue Match.',
  path: '/archive/', page: 'archive',
  body: '<h1>Archive</h1><p class="muted">The last 30 days. Archive plays are just for fun and don\'t affect your streak.</p><ul class="archive" data-archive></ul>',
}));
write('privacy/index.html', layout({
  title: `Privacy | ${SITE.name}`,
  description: 'How Daypebble handles your data: no accounts, no tracking cookies.',
  path: '/privacy/', page: 'static',
  body: `<h1>Privacy</h1>
<p>Daypebble stores your scores, streak and optional nickname in your browser's local storage. Nothing leaves your device unless you add a nickname, in which case your nickname, a random player id and your score are sent to our leaderboard.</p>
<p>We use cookieless, aggregate analytics to count visits. We do not sell data. If we add advertising, this page will be updated and you will be asked for consent where the law requires it (for example in the EEA and UK).</p>
<p>To delete your data, clear this site's storage in your browser. To remove a leaderboard nickname, email hello@daypebble.com.</p>`,
}));

// Sitemap + robots
const pages = ['/', ...GAMES.map((g) => `/${g.id}/`), '/archive/'];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${url(p)}</loc><changefreq>daily</changefreq></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${url('/sitemap.xml')}\n`);
console.log(`Built ${pages.length + 1} pages into ${OUT}`);
