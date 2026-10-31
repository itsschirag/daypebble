// Sumtrail (original): trace a path of side-by-side cells from the top-left
// corner to the bottom-right corner whose digits add up exactly to the target.
// Any valid path counts; a hidden path guarantees at least one exists.

const N = 5;
const START = 0;
const END = N * N - 1;
const neighbours = (i) => {
  const r = Math.floor(i / N), c = i % N, out = [];
  if (r > 0) out.push(i - N);
  if (r < N - 1) out.push(i + N);
  if (c > 0) out.push(i - 1);
  if (c < N - 1) out.push(i + 1);
  return out;
};

function randomPath(rng, minLen, maxLen) {
  // randomised depth-first search for a self-avoiding path START -> END
  for (let attempt = 0; attempt < 500; attempt++) {
    // corner-to-corner trails on a 5x5 grid always have an odd number of cells
    const target = minLen + 2 * rng.int(0, Math.floor((maxLen - minLen) / 2));
    const path = [START];
    const seen = new Set(path);
    let budget = 20000;
    const dfs = () => {
      if (--budget < 0) return false;
      const cur = path[path.length - 1];
      if (cur === END) return path.length === target;
      if (path.length >= target) return false;
      for (const nb of rng.shuffle(neighbours(cur))) {
        if (seen.has(nb)) continue;
        path.push(nb); seen.add(nb);
        if (dfs()) return true;
        path.pop(); seen.delete(nb);
      }
      return false;
    };
    if (dfs()) return path;
  }
  throw new Error('sumtrail: no path');
}

export function generate(rng) {
  const path = randomPath(rng, 11, 15);
  const grid = Array.from({ length: N * N }, () => rng.int(1, 9));
  const target = path.reduce((s, i) => s + grid[i], 0);
  return { n: N, grid, target, hidden: path };
}

export function isValidPath(puzzle, path) {
  if (path[0] !== START || path[path.length - 1] !== END) return false;
  const seen = new Set();
  for (let k = 0; k < path.length; k++) {
    if (seen.has(path[k])) return false;
    seen.add(path[k]);
    if (k > 0 && !neighbours(path[k - 1]).includes(path[k])) return false;
  }
  return path.reduce((s, i) => s + puzzle.grid[i], 0) === puzzle.target;
}

export function mount(root, puzzle, { onDone, startClock }) {
  let path = [START];
  let undos = 0;
  root.innerHTML = `
    <div class="st-head">
      <div class="pill">Target <strong>${puzzle.target}</strong></div>
      <div class="pill">Sum <strong data-sum>0</strong></div>
    </div>
    <div class="st-grid" role="grid" aria-label="Sumtrail grid"></div>
    <p class="hint" data-msg>Tap neighbouring cells to grow your trail from the green corner to the gold corner. Tap a trail cell to step back to it.</p>
    <div class="row"><button class="btn ghost" data-reset>Reset trail</button></div>`;
  const gridEl = root.querySelector('.st-grid');
  const sumEl = root.querySelector('[data-sum]');
  const msg = root.querySelector('[data-msg]');
  const cells = puzzle.grid.map((v, i) => {
    const b = document.createElement('button');
    b.className = 'st-cell';
    b.textContent = v;
    b.setAttribute('aria-label', `Cell ${Math.floor(i / N) + 1},${(i % N) + 1}: ${v}`);
    if (i === START) b.classList.add('start');
    if (i === END) b.classList.add('end');
    b.addEventListener('click', () => tap(i));
    gridEl.appendChild(b);
    return b;
  });

  const sum = () => path.reduce((s, i) => s + puzzle.grid[i], 0);
  function render() {
    const s = sum();
    sumEl.textContent = s;
    sumEl.parentElement.classList.toggle('over', s > puzzle.target);
    cells.forEach((c, i) => {
      const k = path.indexOf(i);
      c.classList.toggle('on', k >= 0);
      c.classList.toggle('tip', i === path[path.length - 1]);
      c.style.setProperty('--k', k);
    });
  }
  function tap(i) {
    startClock();
    const k = path.indexOf(i);
    if (k >= 0) { // step back
      if (k < path.length - 1) { path = path.slice(0, k + 1); undos++; }
    } else if (neighbours(path[path.length - 1]).includes(i)) {
      path.push(i);
    } else {
      msg.textContent = 'Trails only move up, down, left or right from the glowing cell.';
      return;
    }
    render();
    if (path[path.length - 1] === END) {
      if (isValidPath(puzzle, path)) {
        cells.forEach((c) => (c.disabled = true));
        onDone({ detail: `${path.length} cells, ${undos} step-back${undos === 1 ? '' : 's'}` });
      } else {
        const diff = sum() - puzzle.target;
        msg.textContent = `You reached the corner, but you are ${Math.abs(diff)} ${diff > 0 ? 'over' : 'under'}. Step back and try another route.`;
      }
    } else {
      msg.textContent = `${puzzle.target - sum()} to go.`;
    }
  }
  root.querySelector('[data-reset]').addEventListener('click', () => {
    if (path.length > 1) undos++;
    path = [START]; render();
  });
  render();
}

export default {
  id: 'sumtrail',
  name: 'Sumtrail',
  icon: '➕',
  blurb: 'Trace a trail through the grid that adds up to the target.',
  scoring: 'time',
  generate,
  mount,
  check: (p) => isValidPath(p, p.hidden),
};
