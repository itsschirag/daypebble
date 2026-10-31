import {
  SITE, todayKey, addDays, puzzleNumber, isValidKey, makeRng, seedFor, getResult, saveResult,
  streak, fmtTime, decodeChallenge, challengeUrl, share, track, getPlayer, setNick,
  submitScore, fetchLeaderboard, parseKey, isLiveDay,
} from './core.js';
import {
  BUCKETS, getCall, setCall, settleCall, callStats, hitsOn, rollPebble, jar, pebbleFor, addToJar,
  pebbleSvg, RARITIES, freezes, maybeEarnFreeze, applyFreezes, frozenDays, msToMidnight,
} from './habits.js';
import sumtrail from './games/sumtrail.js';
import evensplit from './games/evensplit.js';
import huematch from './games/huematch.js';

export const GAMES = [sumtrail, evensplit, huematch];
const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const currentStreak = () => streak(todayKey(), frozenDays());
function header() {
  const el = $('[data-streak]');
  const f = freezes().count;
  if (el) el.textContent = `🔥 ${currentStreak()}${f ? ` · ❄️ ${f}` : ''}`;
  if (el) el.title = f ? `Daily streak. ${f} streak freeze${f > 1 ? 's' : ''} saved: a missed day won't break it.` : 'Daily streak';
}
const doneToday = (key) => GAMES.filter((g) => getResult(key, g.id)?.live).length;
const rarityLabel = (id) => RARITIES.find((r) => r.id === id)?.label || id;
function countdown(el) {
  const tick = () => {
    const s = Math.floor(msToMidnight() / 1000);
    el.textContent = `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    if (s <= 0) location.reload();
  };
  tick(); setInterval(tick, 1000);
}

// ---------- home ----------
function renderHome() {
  const today = todayKey();
  $('[data-num]').textContent = `#${puzzleNumber(today)}`;
  $('[data-date]').textContent = parseKey(today).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const list = $('[data-cards]');
  list.innerHTML = GAMES.map((g) => {
    const r = getResult(today, g.id);
    return `<a class="card ${r ? 'done' : ''}" href="/${g.id}/">
      <span class="card-icon" aria-hidden="true">${g.icon}</span>
      <span class="card-body"><strong>${g.name}</strong><span>${g.blurb}</span></span>
      <span class="card-state">${r ? `✓ ${esc(r.label)}` : 'Play'}</span></a>`;
  }).join('');
  const done = doneToday(today);
  const prog = $('[data-progress]');
  const myst = pebbleFor(today);
  prog.innerHTML = done < 3
    ? `<div class="meter" style="--p:${done / 3}"><span></span></div><p><strong>${done} of 3 done.</strong> ${3 - done === 1 ? 'One more' : `${3 - done} more`} to crack open today's mystery pebble.</p>`
    : `<p><strong>All done for today.</strong> ${myst ? `You found a ${rarityLabel(myst.rarity).toLowerCase()} ${esc(myst.name)}.` : '<a href="/hue-match/">Reveal your mystery pebble</a>.'} Next pebbles in <strong data-countdown></strong>.</p>`;
  if (done === 3) countdown($('[data-countdown]', prog));
  // Tomorrow teaser: a blurred glimpse creates a curiosity gap worth returning for
  const tmr = addDays(today, 1);
  const hueT = GAMES[2].generate(makeRng(seedFor('hue-match', tmr))).target;
  const sumT = GAMES[0].generate(makeRng(seedFor('sumtrail', tmr))).target;
  const lo = Math.floor(sumT / 10) * 10;
  $('[data-teaser]').innerHTML = `<div class="teaser-sw" style="background:hsl(${hueT[0]} ${hueT[1]}% ${hueT[2]}%)"></div>
    <p><strong>Tomorrow's sneak peek.</strong> Hue Match is hiding a colour behind that blur. Sumtrail's target is somewhere between ${lo} and ${lo + 9}. Can you guess it?</p>`;
  const stats = callStats();
  const pebbles = jar().slice().reverse();
  $('[data-jar]').innerHTML = pebbles.length
    ? pebbles.map((p) => `<li class="r-${p.rarity}" title="${esc(p.name)} · ${rarityLabel(p.rarity)} · ${p.day}">${pebbleSvg(p, 48)}<span>${esc(p.name)}</span></li>`).join('')
    : '<li class="empty">Finish all three pebbles to find your first collectible. Each one is random, and some are very rare.</li>';
  $('[data-calls]').textContent = stats.made ? `Your calls: ${stats.hit} of ${stats.made} right` : 'Call your score before each pebble. Correct calls make rarer pebbles more likely.';
  const week = $('[data-week]');
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  week.innerHTML = days.map((d) => {
    const count = GAMES.filter((g) => getResult(d, g.id)).length;
    const frozen = frozenDays().includes(d);
    const label = frozen ? '❄️' : parseKey(d).toLocaleDateString(undefined, { weekday: 'narrow' });
    return `<li class="lvl${count}${frozen ? ' frozen' : ''}" title="${d}: ${frozen ? 'saved by a streak freeze' : `${count}/3`}"><span>${label}</span></li>`;
  }).join('');
}

// ---------- archive ----------
function renderArchive() {
  const today = todayKey();
  const rows = [];
  for (let i = 1; i <= 30; i++) {
    const d = addDays(today, -i);
    if (puzzleNumber(d) < 1) break;
    rows.push(`<li><span>#${puzzleNumber(d)} · ${parseKey(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      ${GAMES.map((g) => {
        const r = getResult(d, g.id);
        return `<a href="/${g.id}/?d=${d}" class="${r ? 'done' : ''}" aria-label="${g.name} ${d}">${g.icon}${r ? '✓' : ''}</a>`;
      }).join('')}</li>`);
  }
  $('[data-archive]').innerHTML = rows.join('') || '<li>No archive yet. Come back tomorrow.</li>';
}

// ---------- game page ----------
function compare(game, mine, theirs) {
  if (mine.rank === theirs.rank) return 'It is a tie!';
  return mine.rank < theirs.rank ? `You beat ${esc(theirs.nick)} (${esc(theirs.label)}).` : `${esc(theirs.nick)} wins this one with ${esc(theirs.label)}.`;
}

async function renderLeaderboard(game, key, box) {
  const data = await fetchLeaderboard(game.id, key);
  if (!data || !data.top) { box.hidden = true; return; }
  box.hidden = false;
  $('ol', box).innerHTML = data.top.length
    ? data.top.map((r) => `<li><span>${esc(r.nick)}</span><strong>${esc(r.label)}</strong></li>`).join('')
    : '<li>No scores yet. Be first.</li>';
  $('[data-total]', box).textContent = data.total ? `${data.total} players today` : '';
}

function callLine(game, key, result) {
  const c = getCall(key, game.id);
  if (!c) return '';
  const b = BUCKETS[game.scoring].find((x) => x.id === c.bucket);
  return c.hit ? `<p class="called hit">🎯 Called it! You said ${esc(b.label)}.</p>`
    : `<p class="called">You called ${esc(b.label)}. Not this time.</p>`;
}

function renderMystery(key, box, game) {
  if (key !== todayKey()) { box.hidden = true; return; }
  const done = doneToday(key);
  const have = pebbleFor(key);
  if (have) {
    box.innerHTML = `<div class="reveal r-${have.rarity}">${pebbleSvg(have, 72)}<p><strong>${esc(have.name)}</strong><br>${rarityLabel(have.rarity)} pebble, in your <a href="/#jar">jar</a></p></div>`;
    return;
  }
  if (done < 3) {
    const next = GAMES.find((g) => !getResult(key, g.id)?.live);
    box.innerHTML = `<p class="locked">🔒 Mystery pebble: ${done} of 3 done. ${next ? `<a href="/${next.id}/">Play ${next.name}</a> to get closer.` : ''}</p>`;
    return;
  }
  const hits = hitsOn(key);
  box.innerHTML = `<button class="btn crack" data-crack>Crack open today's mystery pebble</button>
    <p class="muted">${hits ? `Your ${hits} correct call${hits > 1 ? 's' : ''} today improved your odds.` : 'Correct calls improve your odds of a rare one.'}</p>`;
  $('[data-crack]', box).addEventListener('click', (e) => {
    e.target.classList.add('shake');
    e.target.disabled = true;
    const p = rollPebble(getPlayer().id, key, hits);
    setTimeout(() => {
      addToJar(p);
      track('pebble_reveal', { rarity: p.rarity });
      renderMystery(key, box, game);
    }, 900);
  });
}

function showResult(game, key, result, challenge) {
  const panel = $('[data-result]');
  const player = getPlayer();
  const num = puzzleNumber(key);
  panel.hidden = false;
  panel.innerHTML = `
    <p class="kicker">${game.name} #${num}${result.live ? '' : ' · archive'}</p>
    <p class="big">${esc(result.label)}</p>
    <p class="muted">${esc(result.detail || '')}</p>
    ${callLine(game, key, result)}
    ${challenge ? `<p class="versus">${compare(game, result, challenge)}</p>` : ''}
    <div class="mystery" data-mystery></div>
    <div class="row">
      <button class="btn" data-share>Share result</button>
      <button class="btn ghost" data-challenge>Challenge a friend</button>
    </div>
    <p class="toast" data-toast role="status"></p>
    <form class="nick" data-nick ${player.nick ? 'hidden' : ''}>
      <label>Add a nickname to join today's leaderboard
        <input name="nick" maxlength="20" placeholder="e.g. pebblepro" autocomplete="nickname"></label>
      <button class="btn ghost">Join</button>
    </form>
    <section class="board" data-board hidden><h2>Today's top 10</h2><p class="muted" data-total></p><ol></ol></section>
    <nav class="next">${GAMES.filter((g) => g.id !== game.id).map((g) => {
      const done = getResult(key, g.id);
      return `<a class="btn ghost" href="/${g.id}/${key !== todayKey() ? `?d=${key}` : ''}">${g.icon} ${done ? `${g.name} ✓` : `Play ${g.name}`}</a>`;
    }).join('')}<a class="btn ghost" href="/">Home</a></nav>`;
  const toast = $('[data-toast]', panel);
  const url = challengeUrl(game.id, key, result, player.nick);
  const n = currentStreak();
  const text = `Daypebble #${num} · ${game.name} ${result.label}${result.called ? ' 🎯 called it' : ''}${n > 1 ? ` · 🔥${n}` : ''}\n${result.detail || ''}\nCan you beat it?`;
  const doShare = async (kind) => {
    const how = await share(text, url);
    toast.textContent = how === 'copied' ? 'Copied! Paste it into your group chat.' : how === 'shared' ? 'Shared!' : 'Copy this link: ' + url;
    track(kind, { game: game.id });
  };
  $('[data-share]', panel).addEventListener('click', () => doShare('share'));
  $('[data-challenge]', panel).addEventListener('click', () => doShare('challenge'));
  renderMystery(key, $('[data-mystery]', panel), game);
  const board = $('[data-board]', panel);
  $('[data-nick]', panel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const nick = setNick(new FormData(e.target).get('nick') || '');
    if (!nick) return;
    e.target.hidden = true;
    if (result.live) await submitScore(game.id, key, result);
    renderLeaderboard(game, key, board);
  });
  if (result.live && player.nick && !result.submitted) {
    submitScore(game.id, key, result).then(() => {
      saveResult(key, game.id, { ...result, submitted: true });
      renderLeaderboard(game, key, board);
    });
  } else {
    renderLeaderboard(game, key, board);
  }
}

function renderGame(game) {
  const params = new URLSearchParams(location.search);
  const today = todayKey();
  let key = params.get('d');
  if (!isValidKey(key) || key > today || puzzleNumber(key) < 1) key = today;
  const live = key === today;
  const challenge = params.get('c') ? decodeChallenge(params.get('c')) : null;
  $('[data-num]').textContent = `#${puzzleNumber(key)}${live ? '' : ` · ${key}`}`;
  if (challenge) {
    const b = $('[data-banner]');
    b.hidden = false;
    b.innerHTML = `<strong>${esc(challenge.nick)}</strong> scored <strong>${esc(challenge.label)}</strong> on this puzzle. Your turn!`;
    track('challenge_open', { game: game.id });
  }
  const existing = getResult(key, game.id);
  if (existing) { showResult(game, key, existing, challenge); $('[data-stage]').hidden = true; return; }

  const stage = $('[data-stage]');
  if (!getCall(key, game.id) && !params.has('nocall')) {
    stage.innerHTML = `<div class="callit">
      <p class="kicker">Before you start</p>
      <h2>Call it: ${game.scoring === 'time' ? 'how fast will you solve it?' : 'how close will you get?'}</h2>
      <div class="callit-opts">${BUCKETS[game.scoring].map((b) => `<button class="btn ghost" data-bucket="${b.id}">${b.label}</button>`).join('')}</div>
      <button class="linkish" data-skip>Skip, just play</button></div>`;
    stage.querySelectorAll('[data-bucket]').forEach((btn) => btn.addEventListener('click', () => {
      setCall(key, game.id, btn.dataset.bucket);
      track('call', { game: game.id, bucket: btn.dataset.bucket });
      play(game, key, live, challenge);
    }));
    $('[data-skip]', stage).addEventListener('click', () => play(game, key, live, challenge));
    return;
  }
  play(game, key, live, challenge);
}

function play(game, key, live, challenge) {
  const call = getCall(key, game.id);
  const callEl = $('[data-callpill]');
  if (call && callEl) {
    callEl.hidden = false;
    callEl.textContent = `Your call: ${BUCKETS[game.scoring].find((b) => b.id === call.bucket)?.label}`;
  }
  const puzzle = game.generate(makeRng(seedFor(game.id, key)));
  let started = 0;
  const clockEl = $('[data-clock]');
  let timer;
  const startClock = () => {
    if (started) return;
    started = performance.now();
    track('start', { game: game.id, live });
    if (game.scoring === 'time') timer = setInterval(() => (clockEl.textContent = fmtTime(performance.now() - started)), 250);
  };
  game.mount($('[data-stage]'), puzzle, {
    startClock,
    onDone: ({ score, detail }) => {
      clearInterval(timer);
      const ms = Math.round(performance.now() - (started || performance.now()));
      const result = game.scoring === 'percent'
        ? { rank: Math.round((100 - score) * 10), label: `${score}%`, detail, ms, live, score }
        : { rank: ms, label: fmtTime(ms), detail, ms, live };
      const hit = settleCall(key, game.id, game.scoring, result);
      if (hit !== null) result.called = hit;
      saveResult(key, game.id, result);
      if (live && doneToday(key) === 1 && maybeEarnFreeze(currentStreak(), key)) {
        result.detail = `${detail} · earned a streak freeze ❄️`;
        saveResult(key, game.id, result);
      }
      track('complete', { game: game.id, live });
      header();
      setTimeout(() => showResult(game, key, result, challenge), 500);
    },
  });
}

// ---------- boot ----------
const page = document.body.dataset.page;
applyFreezes(isLiveDay);
header();
if (page === 'home') renderHome();
if (page === 'archive') renderArchive();
if (page === 'game') renderGame(byId[document.body.dataset.game]);
