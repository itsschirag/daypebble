// Hue Match (original): mix a colour with hue, saturation and lightness
// sliders to match today's target. Three tries; your best match counts.

const TRIES = 3;

export function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}
function rgbToLab([r, g, b]) {
  const lin = (c) => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
// 100 = identical; drops with perceptual distance (CIE76 delta E)
export function matchScore(hslA, hslB) {
  const a = rgbToLab(hslToRgb(...hslA)), b = rgbToLab(hslToRgb(...hslB));
  const dE = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  return Math.max(0, Math.round((100 - dE) * 10) / 10);
}

export function generate(rng) {
  return { target: [rng.int(0, 359), rng.int(35, 90), rng.int(30, 70)] };
}

const css = ([h, s, l]) => `hsl(${h} ${s}% ${l}%)`;

export function mount(root, puzzle, { onDone, startClock }) {
  let tries = [];
  root.innerHTML = `
    <div class="hm-swatches">
      <figure><div class="hm-sw" style="background:${css(puzzle.target)}"></div><figcaption>Target</figcaption></figure>
      <figure><div class="hm-sw" data-mine></div><figcaption>Your mix</figcaption></figure>
    </div>
    <div class="hm-sliders">
      <label>Hue <input type="range" min="0" max="359" value="180" data-h></label>
      <label>Saturation <input type="range" min="0" max="100" value="50" data-s></label>
      <label>Lightness <input type="range" min="0" max="100" value="50" data-l></label>
    </div>
    <div class="row"><button class="btn" data-go>Lock in try 1 of ${TRIES}</button></div>
    <ol class="hm-tries" data-tries></ol>`;
  const [h, s, l] = ['h', 's', 'l'].map((k) => root.querySelector(`[data-${k}]`));
  const mine = root.querySelector('[data-mine]');
  const go = root.querySelector('[data-go]');
  const list = root.querySelector('[data-tries]');
  const value = () => [+h.value, +s.value, +l.value];
  const paint = () => { mine.style.background = css(value()); };
  [h, s, l].forEach((el) => el.addEventListener('input', () => { startClock(); paint(); }));
  paint();
  go.addEventListener('click', () => {
    startClock();
    const v = value();
    const score = matchScore(v, puzzle.target);
    tries.push(score);
    const hint = (mineV, t, wrap) => {
      let d = t - mineV;
      if (wrap) { if (d > 180) d -= 360; if (d < -180) d += 360; }
      return Math.abs(d) <= (wrap ? 6 : 4) ? '✓' : d > 0 ? '↑' : '↓';
    };
    const li = document.createElement('li');
    li.innerHTML = `<span class="hm-dot" style="background:${css(v)}"></span> <strong>${score}%</strong>
      <span class="hm-hint">H ${hint(v[0], puzzle.target[0], true)} · S ${hint(v[1], puzzle.target[1])} · L ${hint(v[2], puzzle.target[2])}</span>`;
    list.appendChild(li);
    if (tries.length >= TRIES || score >= 99) {
      [h, s, l, go].forEach((el) => (el.disabled = true));
      const best = Math.max(...tries);
      onDone({ score: best, detail: `best of ${tries.length} tr${tries.length === 1 ? 'y' : 'ies'}` });
    } else {
      go.textContent = `Lock in try ${tries.length + 1} of ${TRIES}`;
    }
  });
}

export default {
  id: 'hue-match',
  name: 'Hue Match',
  icon: '🎨',
  blurb: 'Mix a colour that matches the target in three tries.',
  scoring: 'percent',
  generate,
  mount,
  check: (p) => matchScore(p.target, p.target) === 100,
};
