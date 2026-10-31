import {
  SITE, todayKey, addDays, puzzleNumber, isValidKey, makeRng, seedFor, getResult, saveResult,
  streak, fmtTime, decodeChallenge, challengeUrl, share, track, getPlayer, setNick,
  submitScore, fetchLeaderboard, parseKey,
} from './core.js';
import sumtrail from './games/sumtrail.js';
import evensplit from './games/evensplit.js';
import huematch from './games/huematch.js';

export const GAMES = [sumtrail, evensplit, huematch];
const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function header() {
  const n = streak();
  const el = $('[data-streak]');
  if (el) el.textContent = n ? `🔥 ${n}` : '🔥 0';
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
  const week = $('[data-week]');
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  week.innerHTML = days.map((d) => {
    const count = GAMES.filter((g) => getResult(d, g.id)).length;
    const label = parseKey(d).toLocaleDateString(undefined, { weekday: 'narrow' });
    return `<li class="lvl${count}" title="${d}: ${count}/3"><span>${label}</span></li>`;
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

function showResult(game, key, result, challenge) {
  const panel = $('[data-result]');
  const player = getPlayer();
  const num = puzzleNumber(key);
  panel.hidden = false;
  panel.innerHTML = `
    <p class="kicker">${game.name} #${num}${result.live ? '' : ' · archive'}</p>
    <p class="big">${esc(result.label)}</p>
    <p class="muted">${esc(result.detail || '')}</p>
    ${challenge ? `<p class="versus">${compare(game, result, challenge)}</p>` : ''}
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
  const text = `Daypebble #${num} · ${game.name} ${result.label}\n${result.detail || ''}\nCan you beat it?`;
  const doShare = async (kind) => {
    const how = await share(text, url);
    toast.textContent = how === 'copied' ? 'Copied! Paste it into your group chat.' : how === 'shared' ? 'Shared!' : 'Copy this link: ' + url;
    track(kind, { game: game.id });
  };
  $('[data-share]', panel).addEventListener('click', () => doShare('share'));
  $('[data-challenge]', panel).addEventListener('click', () => doShare('challenge'));
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
        ? { rank: Math.round((100 - score) * 10), label: `${score}%`, detail, ms, live }
        : { rank: ms, label: fmtTime(ms), detail, ms, live };
      saveResult(key, game.id, result);
      track('complete', { game: game.id, live });
      header();
      setTimeout(() => showResult(game, key, result, challenge), 500);
    },
  });
}

// ---------- boot ----------
const page = document.body.dataset.page;
header();
if (page === 'home') renderHome();
if (page === 'archive') renderArchive();
if (page === 'game') renderGame(byId[document.body.dataset.game]);
