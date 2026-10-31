# Daypebble

Three tiny original logic puzzles a day, the same for everyone. Static site plus
Cloudflare Pages Functions and D1 for the optional leaderboard. No framework,
no build step required to serve, no servers to maintain.

| Pebble | Idea | File |
| --- | --- | --- |
| Sumtrail | Trace a corner-to-corner trail whose digits add up to the target | `public/assets/js/games/sumtrail.js` |
| Even Split | Move stones between two pans until they balance exactly | `public/assets/js/games/evensplit.js` |
| Hue Match | Mix a colour with HSL sliders to match the target in 3 tries | `public/assets/js/games/huematch.js` |

Every puzzle is generated from `game id + date` with a seeded RNG, so there is
no daily content to write. `npm test` generates and verifies the next 120 days.

## Project layout

```
public/                 static site (Cloudflare Pages output dir)
  assets/js/core.js     seeded RNG, dates, streaks, sharing, challenges, leaderboard client
  assets/js/app.js      page bootstrap (home, game, archive)
  assets/js/games/*.js  one module per pebble: generate(rng), mount(el, puzzle), check(puzzle)
  assets/css/style.css  mobile-first styles, light and dark
functions/api/          Pages Functions: POST /api/score, GET /api/leaderboard
lib/api.js              shared validation for the API
schema.sql              D1 table
scripts/build.mjs       generates all HTML pages, sitemap.xml and robots.txt from one config
tests/                  generator and challenge-link tests (node:test)
```

## Run locally

```bash
npm run build          # regenerate HTML/sitemap after editing scripts/build.mjs or games
npm test               # 12 tests, ~1 s
python3 -m http.server 8787 -d public   # quick static preview (leaderboard hidden)
npm run dev            # full preview with Functions + local D1 (needs wrangler)
```

## Deploy (Cloudflare, free tier)

1. **Domain:** buy `daypebble.com` (any registrar, or Cloudflare Registrar at cost).
2. **Repo:** push this folder to GitHub.
3. **D1 database** (once):
   ```bash
   npx wrangler login
   npx wrangler d1 create daypebble        # copy the database_id into wrangler.toml
   npm run db:init                         # creates the scores table
   ```
4. **Pages project:** Cloudflare dashboard → Workers & Pages → Create → Pages →
   Connect to Git → pick the repo.
   - Build command: `npm run build`
   - Build output directory: `public`
   - Then Settings → Bindings → add D1 binding `DB` → database `daypebble`
     (wrangler.toml also declares it).
   Or deploy from your machine: `npm run deploy`.
5. **Custom domain:** Pages project → Custom domains → add `daypebble.com` and `www`.
6. **Set launch day:** edit `launch` in `public/assets/js/core.js` (puzzle #1),
   and `origin` if you use a different domain. Rebuild.
7. **Analytics:** enable Cloudflare Web Analytics for the site (cookieless) or paste a
   Plausible snippet where `build.mjs` marks it.
8. **Search:** add the domain to Google Search Console and submit `/sitemap.xml`.

Every push to `main` redeploys. Pull requests get preview URLs automatically.

## CI (recommended)

Add `.github/workflows/ci.yml` running `npm test` on every push, so a broken
generator can never ship. A scheduled weekly run also catches edge-case dates.

## Backups

D1 has 30-day point-in-time recovery (Time Travel). For an off-platform copy:
`npx wrangler d1 export daypebble --remote --output=backup.sql` on a weekly
schedule (GitHub Action with a Cloudflare API token secret).

## Adding a pebble

1. Create `public/assets/js/games/<name>.js` exporting `{ id, name, icon, blurb, scoring: 'time'|'percent', generate, mount, check }`.
2. Register it in `GAMES` in `app.js` and `build.mjs`, add SEO copy in `build.mjs`, add its id to `lib/api.js`.
3. Add it to the test loop in `tests/games.test.mjs`. `npm test && npm run build`.

## Before turning on ads

- Update `/privacy/` and add a Google-certified consent banner for EEA/UK visitors.
- Keep ads outside the play area; max two slots per page.

## Moderation

Nicknames go through a small blocklist in `functions/api/score.js`. To hide one:
`npx wrangler d1 execute daypebble --remote --command "UPDATE scores SET hidden=1 WHERE nick='...'"`.

## Habit design (why these features exist)

| Feature | Habit lever | Where |
| --- | --- | --- |
| **Call it**: predict your score before each pebble | Commitment and a second mini-game; a correct call adds 🎯 to your share | `habits.js` BUCKETS, `app.js` renderGame |
| **Mystery pebble**: finishing all 3 reveals a random collectible | Variable reward; odds improve with each correct call that day | `rollPebble` |
| **Pebble jar** on the home page | Investment: a collection you don't want to abandon | `jar()` |
| **Tomorrow's sneak peek**: blurred colour + Sumtrail target range, midnight countdown | Curiosity gap and a cue to return | `renderHome` |
| **"1 of 3 done" meter** | Endowed progress / goal gradient | `renderHome` |
| **Streak freezes**: earn one every 7 days, hold up to 2 | Loss aversion without punishing one slip | `maybeEarnFreeze`, `applyFreezes` |

Rewards are deterministic per player and day, so refreshing can't reroll them.
Nothing is pay-to-win, and nothing uses dark patterns such as fake scarcity.
