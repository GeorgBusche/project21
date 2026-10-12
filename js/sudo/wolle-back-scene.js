// Blick von hinten auf Wolle: Silhouette mit erhobenen Armen vor dem Stadion (viewBox 400x800)
const SVG_NS = 'http://www.w3.org/2000/svg';
const HORIZON = 330;
const RIM = 'rgba(255, 190, 120, 0.7)';

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function mix(a, b, t) {
  return a.map((channel, i) => Math.round(channel + (b[i] - channel) * t));
}

function crowdRows(random) {
  const far = [58, 30, 62];
  const near = [10, 6, 16];
  let rows = '';
  const ROWS = 15;
  for (let i = 0; i <= ROWS; i++) {
    const t = i / ROWS;
    const y = HORIZON + 6 + t ** 1.6 * 395;
    const r = 1.7 + t * 9;
    const step = r * 2.15;
    const dark = mix(far, near, t);
    let heads = '';
    let lit = '';
    for (let x = -8 + random() * step; x < 410; x += step) {
      const cy = (y + (random() - 0.5) * r).toFixed(1);
      const rr = (r * (0.82 + random() * 0.3)).toFixed(1);
      const part = `M${x.toFixed(1)} ${cy}m${-rr} 0a${rr} ${rr} 0 1 0 ${rr * 2} 0a${rr} ${rr} 0 1 0 ${-rr * 2} 0`;
      if (random() < 0.12) lit += part;
      else heads += part;
    }
    rows += `<path d="${heads}" fill="rgb(${dark.join(',')})" />`;
    rows += `<path d="${lit}" fill="rgb(${mix(dark, [150, 92, 70], 0.55 - t * 0.3).join(',')})" />`;
  }
  return rows;
}

function crowdArms(random) {
  const groups = ['', '', ''];
  for (let i = 0; i < 78; i++) {
    const t = random();
    const x = random() * 420 - 10;
    const baseY = HORIZON + 40 + t * 330;
    const length = 20 + t * 62;
    const tilt = (random() - 0.5) * 0.7;
    const tipX = x + Math.sin(tilt) * length;
    const tipY = baseY - Math.cos(tilt) * length;
    const width = 1.5 + t * 5;
    const shade = mix([64, 36, 66], [22, 12, 30], t);
    groups[i % 3] +=
      `<line x1="${x.toFixed(1)}" y1="${baseY.toFixed(1)}" x2="${tipX.toFixed(1)}" y2="${tipY.toFixed(1)}" stroke="rgb(${shade.join(',')})" stroke-width="${width.toFixed(1)}" stroke-linecap="round" />` +
      `<circle cx="${tipX.toFixed(1)}" cy="${(tipY - width * 0.6).toFixed(1)}" r="${(width * 0.9).toFixed(1)}" fill="rgb(${shade.join(',')})" />`;
  }
  return groups
    .map((content, i) => `<g class="wolle-back__crowd-arms wolle-back__crowd-arms--${i}">${content}</g>`)
    .join('');
}

function stands(random) {
  let lights = '';
  for (let i = 0; i < 150; i++) {
    const x = random() * 400;
    const y = HORIZON - 70 + random() * 66;
    lights += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="1.6" height="1.6" fill="rgba(255, 225, 170, ${(0.2 + random() * 0.5).toFixed(2)})" />`;
  }
  return lights;
}

// Wolles Lockenmähne: viele überlappende Locken, die vom Kopf bis auf die Schultern fallen
function curlyHair() {
  const random = seededRandom(7);
  const curls = [];
  const add = (cx, cy, r) => curls.push([cx, cy, r]);
  for (let a = 200; a <= 340; a += 11) {
    const rad = (a * Math.PI) / 180;
    add(200 + Math.cos(rad) * 34, 416 + Math.sin(rad) * 36, 13 + random() * 4);
  }
  for (let row = 0; row < 3; row++) {
    for (const dx of [-17, 0, 17]) add(200 + dx + (random() - 0.5) * 6, 402 + row * 14, 13 + random() * 3);
  }
  for (let row = 0; row < 6; row++) {
    const y = 426 + row * 13;
    const spread = 33 + Math.min(row, 3) * 2.5;
    for (const side of [-1, 1]) {
      add(200 + side * spread, y, 12 + random() * 4);
      add(200 + side * (spread - 12), y + 5, 12 + random() * 3);
    }
    if (row > 1) add(200, y + 4, 13 + random() * 3);
  }
  const outline = (stroke) =>
    curls.map(([x, y, r]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" ${stroke} />`).join('');
  const rings = curls
    .map(
      ([x, y, r]) =>
        `<path d="M${(x - r * 0.55).toFixed(1)} ${(y + r * 0.1).toFixed(1)} a${(r * 0.55).toFixed(1)} ${(r * 0.55).toFixed(1)} 0 1 1 ${(r * 0.9).toFixed(1)} ${(r * 0.5).toFixed(1)}" fill="none" stroke="rgba(255, 190, 110, 0.45)" stroke-width="1.4" stroke-linecap="round" />`
    )
    .join('');
  return (
    `<ellipse cx="200" cy="440" rx="38" ry="52" fill="#7a4a24" />` +
    `<g>${outline(`fill="none" stroke="${RIM}" stroke-width="3.4"`)}</g>` +
    `<g>${outline('fill="#7a4a24"')}</g>` +
    `<g>${curls.map(([x, y, r], i) => (i % 3 === 0 ? `<circle cx="${(x + 2).toFixed(1)}" cy="${(y + 3).toFixed(1)}" r="${(r * 0.7).toFixed(1)}" fill="rgba(20, 8, 4, 0.35)" />` : '')).join('')}</g>` +
    rings
  );
}

function wolle() {
  const plaid = 'url(#wolle-back-plaid)';
  const shade = 'rgba(8, 5, 18, 0.5)';
  const arm = (d, cls) =>
    `<g class="wolle-back__arm ${cls}">` +
    `<path d="${d}" stroke="${RIM}" stroke-width="27" fill="none" stroke-linecap="round" stroke-linejoin="round" />` +
    `<path d="${d}" stroke="${plaid}" stroke-width="24" fill="none" stroke-linecap="round" stroke-linejoin="round" />` +
    `<path d="${d}" stroke="${shade}" stroke-width="24" fill="none" stroke-linecap="round" stroke-linejoin="round" />` +
    '</g>';

  const leftArm = 'M152 472 L104 398 L66 322';
  const rightArm = 'M248 472 L298 394 L336 304';

  return `
    <g class="wolle-back__figure">
      <ellipse cx="200" cy="770" rx="92" ry="9" fill="rgba(0, 0, 0, 0.55)" />
      <path d="M142 592 L200 592 L197 765 L162 765 L150 690Z" fill="#161c30" stroke="${RIM}" stroke-width="1.3" />
      <path d="M200 592 L258 592 L250 690 L238 765 L203 765Z" fill="#141a2d" stroke="${RIM}" stroke-width="1.3" />
      <ellipse cx="180" cy="768" rx="21" ry="8" fill="#09090e" />
      <ellipse cx="222" cy="768" rx="21" ry="8" fill="#09090e" />
      ${arm(leftArm, 'wolle-back__arm--left')}
      ${arm(rightArm, 'wolle-back__arm--right')}
      <path d="M148 464 Q200 446 252 464 L260 596 Q200 608 140 596Z" fill="${plaid}" stroke="${RIM}" stroke-width="1.4" />
      <path d="M148 464 Q200 446 252 464 L260 596 Q200 608 140 596Z" fill="url(#wolle-back-shade)" />
      <path d="M200 452 L200 600" stroke="rgba(0, 0, 0, 0.3)" stroke-width="1.5" />
      <g class="wolle-back__hand wolle-back__hand--left"><circle cx="64" cy="311" r="13" fill="#7c5440" stroke="${RIM}" stroke-width="1.2" /></g>
      <g class="wolle-back__hand wolle-back__hand--right">
        <circle cx="338" cy="293" r="13" fill="#7c5440" stroke="${RIM}" stroke-width="1.2" />
        <rect x="334" y="262" width="8" height="26" rx="3" fill="#1b1b22" />
        <circle cx="338" cy="256" r="9" fill="#2c2c36" stroke="${RIM}" stroke-width="1.2" />
      </g>
      <g class="wolle-back__head">
        ${curlyHair()}
      </g>
    </g>`;
}

export function createWolleBackScene() {
  const random = seededRandom(21);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 400 800');
  const portrait = window.innerHeight >= window.innerWidth;
  svg.setAttribute('preserveAspectRatio', portrait ? 'xMidYMax slice' : 'xMidYMax meet');
  svg.classList.add('wolle-back');
  svg.innerHTML = `
    <defs>
      <linearGradient id="wolle-back-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#140b26" />
        <stop offset="0.6" stop-color="#5a2438" />
        <stop offset="1" stop-color="#f0924e" />
      </linearGradient>
      <linearGradient id="wolle-back-ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a1f34" />
        <stop offset="1" stop-color="#0b0612" />
      </linearGradient>
      <linearGradient id="wolle-back-shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(8, 5, 18, 0.25)" />
        <stop offset="1" stop-color="rgba(8, 5, 18, 0.7)" />
      </linearGradient>
      <linearGradient id="wolle-back-beam-a" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(255, 58, 119, 0.5)" />
        <stop offset="1" stop-color="rgba(255, 58, 119, 0)" />
      </linearGradient>
      <linearGradient id="wolle-back-beam-b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(102, 189, 255, 0.5)" />
        <stop offset="1" stop-color="rgba(102, 189, 255, 0)" />
      </linearGradient>
      <linearGradient id="wolle-back-stage" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3b3640" />
        <stop offset="1" stop-color="#0d0b12" />
      </linearGradient>
      <radialGradient id="wolle-back-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="rgba(255, 190, 110, 0.55)" />
        <stop offset="1" stop-color="rgba(255, 190, 110, 0)" />
      </radialGradient>
      <radialGradient id="wolle-back-vignette" cx="0.5" cy="0.62" r="0.75">
        <stop offset="0.55" stop-color="rgba(5, 2, 10, 0)" />
        <stop offset="1" stop-color="rgba(5, 2, 10, 0.75)" />
      </radialGradient>
      <pattern id="wolle-back-plaid" width="26" height="26" patternUnits="userSpaceOnUse">
        <rect width="26" height="26" fill="#8d1d2a" />
        <rect width="9" height="26" fill="#1a1a24" opacity="0.65" />
        <rect width="26" height="9" fill="#1a1a24" opacity="0.65" />
        <rect x="15" width="2" height="26" fill="#e4d2b0" opacity="0.4" />
        <rect y="15" width="26" height="2" fill="#e4d2b0" opacity="0.4" />
      </pattern>
    </defs>
    <rect width="400" height="${HORIZON}" fill="url(#wolle-back-sky)" />
    <ellipse cx="200" cy="${HORIZON}" rx="260" ry="90" fill="url(#wolle-back-glow)" />
    <polygon class="wolle-back__beam wolle-back__beam--a" points="30,0 -40,${HORIZON} 220,${HORIZON}" fill="url(#wolle-back-beam-a)" />
    <polygon class="wolle-back__beam wolle-back__beam--b" points="370,0 180,${HORIZON} 440,${HORIZON}" fill="url(#wolle-back-beam-b)" />
    <path d="M0 ${HORIZON - 72} L70 ${HORIZON - 80} L190 ${HORIZON - 60} L400 ${HORIZON - 84} L400 ${HORIZON + 10} L0 ${HORIZON + 10}Z" fill="#1c1024" />
    ${stands(random)}
    <rect x="22" y="${HORIZON - 128}" width="24" height="68" fill="#120a1b" />
    <rect x="18" y="${HORIZON - 146}" width="32" height="20" fill="#f6bd6c" />
    <rect x="356" y="${HORIZON - 128}" width="24" height="68" fill="#120a1b" />
    <rect x="352" y="${HORIZON - 146}" width="32" height="20" fill="#f6bd6c" />
    <rect y="${HORIZON}" width="400" height="${800 - HORIZON}" fill="url(#wolle-back-ground)" />
    ${crowdRows(random)}
    ${crowdArms(random)}
    <rect y="752" width="400" height="48" fill="url(#wolle-back-stage)" />
    <rect y="752" width="400" height="2" fill="rgba(255, 190, 120, 0.55)" />
    ${wolle()}
    <rect width="400" height="800" fill="url(#wolle-back-vignette)" />
  `;
  return svg;
}
