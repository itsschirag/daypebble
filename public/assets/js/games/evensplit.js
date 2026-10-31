// Even Split (original): tap stones to move them between two pans until both
// pans weigh exactly the same. Built so at least one perfect split exists.

const COUNT = 8;

export function generate(rng) {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const leftSize = rng.int(3, 5);
    const left = Array.from({ length: leftSize }, () => rng.int(2, 29));
    const total = left.reduce((a, b) => a + b, 0);
    const rightSize = COUNT - leftSize;
    const right = Array.from({ length: rightSize - 1 }, () => rng.int(2, 29));
    const last = total - right.reduce((a, b) => a + b, 0);
    if (last < 2 || last > 35) continue;
    right.push(last);
    const stones = rng.shuffle([...left, ...right]);
    // avoid trivial days: no single stone equal to half the total
    if (stones.some((s) => s === total)) continue;
    return { stones, half: total };
  }
  throw new Error('evensplit: generation failed');
}

export const isBalanced = (puzzle, sides) => {
  let l = 0, r = 0;
  puzzle.stones.forEach((s, i) => (sides[i] ? (r += s) : (l += s)));
  return l === r;
};

export function mount(root, puzzle, { onDone, startClock }) {
  const sides = puzzle.stones.map(() => 0); // 0 = left pan, 1 = right pan
  let moves = 0;
  root.innerHTML = `
    <div class="es-scale" aria-live="polite">
      <div class="es-beam"><span data-left>0</span><span class="es-pivot">⚖</span><span data-right>0</span></div>
    </div>
    <div class="es-pans">
      <div class="es-pan" data-pan="0" aria-label="Left pan"></div>
      <div class="es-pan" data-pan="1" aria-label="Right pan"></div>
    </div>
    <p class="hint" data-msg>Tap a stone to move it to the other pan. Balance both pans perfectly.</p>`;
  const pans = [...root.querySelectorAll('.es-pan')];
  const beam = root.querySelector('.es-beam');
  const lEl = root.querySelector('[data-left]');
  const rEl = root.querySelector('[data-right]');
  const msg = root.querySelector('[data-msg]');
  const stones = puzzle.stones.map((w, i) => {
    const b = document.createElement('button');
    b.className = 'es-stone';
    b.textContent = w;
    b.style.setProperty('--size', `${30 + w * 1.2}px`);
    b.setAttribute('aria-label', `Stone weighing ${w}`);
    b.addEventListener('click', () => {
      startClock();
      sides[i] ^= 1; moves++;
      render();
      if (isBalanced(puzzle, sides)) {
        stones.forEach((s) => (s.disabled = true));
        onDone({ detail: `${moves} move${moves === 1 ? '' : 's'}` });
      }
    });
    return b;
  });
  function render() {
    let l = 0, r = 0;
    stones.forEach((s, i) => {
      pans[sides[i]].appendChild(s);
      sides[i] ? (r += puzzle.stones[i]) : (l += puzzle.stones[i]);
    });
    lEl.textContent = l; rEl.textContent = r;
    const tilt = Math.max(-14, Math.min(14, (r - l) * 0.6));
    beam.style.transform = `rotate(${tilt}deg)`;
    beam.classList.toggle('level', l === r);
    msg.textContent = l === r ? 'Perfectly balanced.' : `${Math.abs(l - r)} apart.`;
  }
  render();
}

export default {
  id: 'even-split',
  name: 'Even Split',
  icon: '⚖️',
  blurb: 'Move stones between two pans until they balance exactly.',
  scoring: 'time',
  generate,
  mount,
  check: (p) => {
    // brute-force: a perfect split must exist
    const n = p.stones.length;
    for (let m = 1; m < (1 << n) - 1; m++) {
      if (isBalanced(p, p.stones.map((_, i) => (m >> i) & 1))) return true;
    }
    return false;
  },
};
