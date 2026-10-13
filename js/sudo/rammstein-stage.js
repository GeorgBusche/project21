import logoSource from '../../assets/sudo/rammstein/logo.svg?raw';

// Rammstein-Stadionbühne (Liebe-ist-für-alle-da-Tour), frontal, in Foto-Koordinaten 900x598.
// Die linke Hälfte wird gespiegelt, damit die Bühne exakt symmetrisch bleibt.

const W = 900;
const H = 598;

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const LOGO_PATHS = logoSource.replace(/<\/?svg[^>]*>/g, '');

function disc(cx, cy, r, extra = '') {
  const dots = (rr, n) =>
    `<circle r="${rr}" class="rs-disc-dots" stroke-dasharray="1.6 ${((2 * Math.PI * rr) / n - 1.6).toFixed(2)}"/>`;
  return `
    <g class="rs-disc ${extra}" transform="translate(${cx} ${cy})">
      <circle r="${r + 3}" class="rs-disc-halo"/>
      <circle r="${r}" class="rs-disc-rim"/>
      <circle r="${(r * 0.93).toFixed(1)}" class="rs-disc-face"/>
      <g class="rs-disc-spin">
        ${dots(r * 0.82, 36)}
        ${dots(r * 0.64, 28)}
        <circle r="${(r * 0.46).toFixed(1)}" class="rs-disc-ring"/>
        <circle r="${(r * 0.26).toFixed(1)}" class="rs-disc-ring"/>
        <path d="M${-r * 0.9} 0H${r * 0.9}M0 ${-r * 0.9}V${r * 0.9}M${-r * 0.64} ${-r * 0.64}L${r * 0.64} ${r * 0.64}M${r * 0.64} ${-r * 0.64}L${-r * 0.64} ${r * 0.64}" class="rs-disc-cross"/>
      </g>
      <circle r="${(r * 0.1).toFixed(1)}" class="rs-disc-hub"/>
    </g>`;
}

function zigzag(x1, x2, y1, y2, step) {
  let d = `M${x1} ${y1}`;
  let left = false;
  for (let y = y1 + step; y <= y2; y += step) {
    d += `L${left ? x1 : x2} ${y}`;
    left = !left;
  }
  return d;
}

function slats(x, y, w, h, gap) {
  let d = '';
  for (let yy = y + gap; yy < y + h; yy += gap) d += `M${x} ${yy}h${w}`;
  return d;
}

function half() {
  const bars = [];
  const rnd = seeded(7);
  for (let x = 78; x < 128; x += 8) {
    const top = 392 + rnd() * 50;
    bars.push(`<rect class="rs-bar" x="${x}" y="${top.toFixed(0)}" width="3.2" height="${(538 - top).toFixed(0)}"/>`);
  }
  for (let x = 210; x < 300; x += 9) {
    const top = 372 + rnd() * 70;
    bars.push(`<rect class="rs-bar" x="${x}" y="${top.toFixed(0)}" width="3.6" height="${(536 - top).toFixed(0)}"/>`);
  }

  return `
    <!-- Rückwand -->
    <rect x="-2" y="266" width="452" height="284" class="rs-wall"/>
    <path d="${slats(72, 380, 62, 160, 9)}${slats(206, 380, 150, 160, 9)}" class="rs-wall-lines"/>
    <g class="rs-bars">${bars.join('')}</g>

    <!-- Lichtstrahlen -->
    <path d="M190 350L398 398V432L196 392Z" class="rs-beam" style="transform-origin:190px 372px"/>
    <path d="M108 410L176 318L204 330L132 440Z" class="rs-beam rs-beam--b" style="transform-origin:150px 380px"/>
    <path d="M300 440L420 470L420 500L296 478Z" class="rs-beam rs-beam--c" style="transform-origin:300px 460px"/>

    <!-- Außen-Traversenturm mit Ausleger -->
    <g class="rs-rig">
      <rect x="13" y="193" width="59" height="13" class="rs-steel"/>
      <rect x="55" y="187" width="17" height="6" class="rs-steel"/>
      <path d="M14 206V545M70 206V545" class="rs-truss rs-truss--bold"/>
      <path d="${zigzag(14, 70, 206, 545, 22)}" class="rs-truss"/>
      <path d="M17 206V238M26 206V232M62 206V236" class="rs-cable"/>
      <rect x="13" y="214" width="3" height="12" class="rs-led-dot"/>
    </g>

    <!-- PA-Türme -->
    <g class="rs-pa">
      <rect x="131" y="292" width="33" height="252" class="rs-cab"/>
      <rect x="164" y="288" width="42" height="186" class="rs-cab"/>
      <rect x="164" y="474" width="42" height="70" class="rs-cab rs-cab--dim"/>
      <path d="${slats(131, 292, 33, 252, 7)}${slats(164, 288, 42, 186, 7)}" class="rs-cab-lines"/>
      <path d="M163.5 292V544M206 288V474" class="rs-neon rs-neon--edge"/>
      <path d="M131 292V544" class="rs-neon rs-neon--edge rs-neon--dim"/>
      <rect x="150" y="268" width="38" height="24" class="rs-steel"/>
      <rect x="196" y="300" width="10" height="170" class="rs-steel rs-steel--rail"/>
    </g>

    <!-- Große Scheibe -->
    ${disc(168, 228, 42, 'rs-disc--big')}

    <!-- Kleine Scheibe -->
    <g class="rs-small-mount">
      <path d="M316 442V500M306 498H326" class="rs-truss rs-truss--bold"/>
      <path d="M284 410Q290 372 316 366" class="rs-cable"/>
    </g>
    ${disc(316, 407, 35, 'rs-disc--small')}

    <!-- Neonlinien -->
    <path d="M70 372V545M276 386V522M165.5 292V544" class="rs-neon rs-neon--chase"/>

    <!-- Gerüstturm neben dem Mittelturm -->
    <g class="rs-scaffold">
      <rect x="365" y="266" width="27" height="198" class="rs-steel"/>
      <path d="${zigzag(367, 390, 270, 462, 14)}" class="rs-truss"/>
      <path d="M366 266V462M391 266V462" class="rs-neon rs-neon--white rs-neon--chase"/>
      <rect x="360" y="262" width="36" height="6" class="rs-steel"/>
    </g>

    <!-- Mittelturm-Säule -->
    <g class="rs-pillar-wrap">
      <path d="M402 52L419 34L431 41L430 464L403 464Z" class="rs-pillar"/>
      <path d="M408 58V462" class="rs-pillar-hi"/>
      <path d="M430 44V462" class="rs-neon rs-neon--edge rs-neon--hot"/>
      <path d="M404 52L419 36" class="rs-neon rs-neon--edge rs-neon--hot"/>
      <path d="${slats(403, 120, 27, 340, 17)}" class="rs-pillar-lines"/>
    </g>
  `;
}

function crowd() {
  const rnd = seeded(21);
  let heads = '';
  let phones = '';
  for (let row = 0; row < 3; row++) {
    const y = 570 + row * 9;
    const r = 4.6 + row * 1.1;
    for (let x = -4; x < W + 8; x += 7.4 - row * 0.6) {
      const jx = x + rnd() * 4;
      const jy = y + rnd() * 3;
      heads += `<circle cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" r="${r.toFixed(1)}"/>`;
      if (row < 2 && rnd() < 0.07) {
        const delay = (rnd() * 4).toFixed(2);
        phones += `<rect class="rs-phone" x="${(jx - 1.6).toFixed(1)}" y="${(jy - r - 5).toFixed(1)}" width="3.2" height="4.6" style="animation-delay:-${delay}s"/>`;
      }
    }
  }
  return `
    <g class="rs-crowd">
      <rect x="-10" y="576" width="${W + 20}" height="700"/>
      ${heads}
    </g>
    <g class="rs-phones">${phones}</g>`;
}

function jets() {
  const xs = [226, 262, 304, 354, 546, 596, 638, 674];
  return xs
    .map(
      (x, i) =>
        `<g class="rs-jet" style="--d:${(i % 4) * 70}ms" transform="translate(${x} 520)"><path d="M-7 0C-11-26-3-46-6-82C4-56 4-30 0-12C5-36 10-48 12-72C18-40 12-14 7 0Z" class="rs-flame"/><path d="M-3 0C-5-18-1-30-2-50C3-30 4-16 4 0Z" class="rs-flame rs-flame--core"/></g>`
    )
    .join('');
}

function sunbeams() {
  return [235, 300, 365, 535, 600, 665]
    .map((x, index) => {
      const lean = (x - 450) * 0.42;
      const delay = (index % 3) * 110;
      return `
        <g class="rs-sunbeam-wrap" style="--beam-delay:${delay}ms" transform="translate(${x} 516)">
          <path d="M-3 0L${lean - 66} -500H${lean + 66}L3 0Z" class="rs-sunbeam"/>
          <path d="M-1 0L${lean - 15} -470H${lean + 15}L1 0Z" class="rs-sunbeam-core"/>
        </g>`;
    })
    .join('');
}

function sunlamps() {
  return [235, 300, 365, 535, 600, 665]
    .map(
      (x) => `
        <g transform="translate(${x} 516)">
          <rect x="-9" y="-3" width="18" height="6" rx="1.5" class="rs-sunlamp"/>
          <rect x="-5" y="-4" width="10" height="2" rx="1" class="rs-sunlamp-lens"/>
          <path d="M-7 4H7" class="rs-sunlamp-foot"/>
        </g>`
    )
    .join('');
}

function figures() {
  return [352, 398, 447, 493, 546]
    .map(
      (x) =>
        `<g class="rs-figure"><circle cx="${x}" cy="498" r="2.2"/><path d="M${x - 2.6} 520V504Q${x} 500 ${x + 2.6} 504V520Z"/></g>`
    )
    .join('');
}

export function buildRammsteinLogo() {
  return logoSource.replace('<svg', '<svg class="ramm-outro__logo" aria-hidden="true"');
}

export function buildRammsteinStage() {
  // Hochformat (Handy): auf Mittelturm + Scheiben zuschneiden, damit die Bühne groß bleibt
  const portrait = window.innerHeight > window.innerWidth;
  const viewBox = portrait ? '124 22 652 576' : `0 0 ${W} ${H}`;
  return `
    <div class="ramm-stage__haze"></div>
    <div class="ramm-stage__fog"></div>
    <svg class="ramm-stage__structure${portrait ? ' is-portrait' : ''}" viewBox="${viewBox}" preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="rs-wall-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#150606" stop-opacity="0"/>
          <stop offset=".35" stop-color="#1a0707" stop-opacity=".85"/>
          <stop offset="1" stop-color="#1a0707"/>
        </linearGradient>
        <linearGradient id="rs-pillar-grad" x1="0" x2="1">
          <stop offset="0" stop-color="#4a0a06"/>
          <stop offset=".5" stop-color="#d1200f"/>
          <stop offset="1" stop-color="#7a0f08"/>
        </linearGradient>
        <linearGradient id="rs-beam-grad" x1="0" x2="1">
          <stop offset="0" stop-color="#ff4a2a" stop-opacity=".62"/>
          <stop offset="1" stop-color="#ff4a2a" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="rs-screen-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#3a0907"/>
          <stop offset="1" stop-color="#150303"/>
        </linearGradient>
        <radialGradient id="rs-ground-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="#ff3a1e" stop-opacity=".75"/>
          <stop offset="1" stop-color="#ff3a1e" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="rs-sunbeam-grad" x1="0" x2="0" y1="1" y2="0">
          <stop offset="0" stop-color="#fff4c2" stop-opacity=".92"/>
          <stop offset=".2" stop-color="#ffd56b" stop-opacity=".48"/>
          <stop offset="1" stop-color="#ffb84d" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="rs-sunbeam-core-grad" x1="0" x2="0" y1="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity=".92"/>
          <stop offset=".3" stop-color="#fff0b0" stop-opacity=".42"/>
          <stop offset="1" stop-color="#fff4d2" stop-opacity="0"/>
        </linearGradient>
        <symbol id="rs-logo" viewBox="206 77 615 615">${LOGO_PATHS}</symbol>
      </defs>

      <ellipse class="rs-ground-glow" cx="450" cy="540" rx="430" ry="70" fill="url(#rs-ground-glow)"/>
      <g class="rs-sunbeams">${sunbeams()}</g>

      <g class="rs-smoke">
        <ellipse cx="330" cy="62" rx="26" ry="17"/>
        <ellipse cx="560" cy="96" rx="32" ry="16"/>
        <ellipse cx="700" cy="40" rx="30" ry="20"/>
      </g>

      <g class="rs-back">${half()}</g>
      <g class="rs-back" transform="translate(${W} 0) scale(-1 1)">${half()}</g>

      <!-- Mittelteil -->
      <g class="rs-center">
        <rect x="408" y="116" width="84" height="164" class="rs-steel"/>
        <path d="${zigzag(412, 488, 118, 278, 16)}" class="rs-truss rs-truss--hot"/>
        <path d="M420 118V278M435 118V278M465 118V278M480 118V278" class="rs-truss"/>
        <path d="M418 128h14v16h-14zM468 128h14v16h-14zM432 160h36v10h-36z" class="rs-cab"/>

        <rect x="412" y="280" width="76" height="134" class="rs-screen-frame"/>
        <rect x="415" y="283" width="70" height="128" class="rs-screen"/>
        <g class="rs-screen-lines">
          <path d="${slats(415, 283, 70, 128, 4)}"/>
        </g>
        <use href="#rs-logo" x="421" y="303" width="58" height="58" class="rs-logo"/>
        <rect x="428" y="372" width="44" height="3" class="rs-logo-bar"/>
        <rect x="436" y="380" width="28" height="2" class="rs-logo-bar"/>

        <rect x="412" y="414" width="76" height="46" class="rs-steel"/>
        <path d="${zigzag(414, 486, 416, 458, 10)}" class="rs-truss rs-truss--hot"/>

        <!-- Brücke -->
        <rect x="287" y="457" width="326" height="6" class="rs-bridge"/>
        <path d="M287 463H613" class="rs-neon rs-neon--white rs-neon--dim"/>
        <path d="M330 463Q345 482 360 463M395 463Q410 478 425 463M475 463Q490 478 505 463M540 463Q555 482 570 463" class="rs-cable"/>
      </g>

      <!-- Bühne -->
      <g class="rs-deck">
        <path d="M200 520H700L716 548H184Z" class="rs-deck-top"/>
        <rect x="184" y="548" width="532" height="14" class="rs-deck-front"/>
        <path d="M184 549.5H716" class="rs-neon rs-neon--chase rs-neon--hot"/>
        <path d="M230 534H670" class="rs-neon rs-neon--dim"/>
        ${figures()}
        <ellipse cx="447" cy="514" rx="13" ry="5" class="rs-drums"/>
      </g>

      <g class="rs-sunlamps">${sunlamps()}</g>
      <g class="rs-jets">${jets()}</g>

      ${crowd()}
    </svg>
    <div class="ramm-stage__fog ramm-stage__fog--front"></div>
    <div class="ramm-stage__dim"></div>
  `;
}
