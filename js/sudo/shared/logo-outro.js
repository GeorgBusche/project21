const STYLE_ID = 'sudo-logo-outro-style';

const STYLE = `
.sudo-outro {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  pointer-events: none;
  overflow: hidden;
}
.sudo-outro__bg,
.sudo-outro__spot,
.sudo-outro__black {
  position: absolute;
  inset: 0;
  opacity: 0;
}
.sudo-outro__bg { animation: sudo-outro-bg var(--outro-ms) ease-in-out forwards; }
.sudo-outro__spot {
  background: radial-gradient(ellipse 62% 40% at 50% 50%, var(--outro-spot) 38%, transparent 76%);
  animation: sudo-outro-spot var(--outro-ms) ease-out forwards;
}
.sudo-outro__black { background: #000; animation: sudo-outro-black var(--outro-ms) ease-in forwards; }
.sudo-outro__logo {
  position: relative;
  width: min(84vw, 70vh);
  max-height: 52dvh;
  object-fit: contain;
  mix-blend-mode: multiply;
  opacity: 0;
  animation: sudo-outro-logo var(--outro-ms) cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.sudo-outro__bit { position: absolute; pointer-events: none; }

/* Wolle: Flanellhemd im Scheinwerfer */
.sudo-outro--plaid .sudo-outro__bg {
  background:
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.38) 0 22px, transparent 22px 64px),
    repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.38) 0 22px, transparent 22px 64px),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.12) 0 4px, transparent 4px 64px),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.12) 0 4px, transparent 4px 64px),
    radial-gradient(ellipse at 50% 50%, #c1261a, #5a0c0c 80%);
}
.sudo-outro--plaid .sudo-outro__bit {
  top: -10%;
  width: 3px;
  height: 120%;
  background: linear-gradient(180deg, rgba(255, 235, 180, 0.9), transparent 70%);
  transform-origin: top center;
  animation: sudo-outro-sweep 2.4s ease-in-out infinite alternate;
}

/* Bella: Napoli-Streifen */
.sudo-outro--tricolor .sudo-outro__bg {
  background:
    linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.3) 50%, transparent 60%) 0 0 / 250% 100%,
    linear-gradient(90deg, #08813f 0 33.4%, #f4ecd8 33.4% 66.6%, #cd2a36 66.6%);
  animation: sudo-outro-bg var(--outro-ms) ease-in-out forwards, sudo-outro-shine 2.2s linear infinite;
}
.sudo-outro--tricolor .sudo-outro__bit {
  bottom: -20px;
  width: 8px;
  height: 14px;
  animation: sudo-outro-rise var(--rise) linear var(--delay) infinite;
}

/* Schuettelkorn: Brause-Blubbern */
.sudo-outro--bubbles .sudo-outro__bg {
  background: radial-gradient(ellipse at 50% 90%, #3a9ad0, #1f5f93 55%, #0d2740);
}
.sudo-outro--bubbles .sudo-outro__bit {
  bottom: -40px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.7);
  background: radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.12) 60%);
  animation: sudo-outro-rise var(--rise) ease-in var(--delay) infinite;
}

@keyframes sudo-outro-bg { 0% { opacity: 0; } 35%, 100% { opacity: 1; } }
@keyframes sudo-outro-spot { 0%, 20% { opacity: 0; } 55%, 100% { opacity: 1; } }
@keyframes sudo-outro-logo {
  0%, 25% { opacity: 0; transform: scale(0.88); }
  50% { opacity: 1; transform: scale(1); }
  100% { opacity: 1; transform: scale(1.06); }
}
@keyframes sudo-outro-black { 0%, 78% { opacity: 0; } 100% { opacity: 1; } }
@keyframes sudo-outro-rise {
  0% { transform: translate3d(0, 0, 0) rotate(0); opacity: 0; }
  12% { opacity: 0.9; }
  100% { transform: translate3d(var(--drift), -112vh, 0) rotate(var(--spin)); opacity: 0.9; }
}
@keyframes sudo-outro-sweep {
  from { transform: rotate(var(--a0)); opacity: 0.55; }
  to { transform: rotate(var(--a1)); opacity: 0.2; }
}
@keyframes sudo-outro-shine { to { background-position: -150% 0, 0 0; } }
@media (prefers-reduced-motion: reduce) {
  .sudo-outro__bit { display: none; }
}
`;

const THEMES = {
  plaid: { spot: '#fff1d6', bits: 6 },
  tricolor: { spot: '#fffaf0', bits: 26 },
  bubbles: { spot: '#f6fbff', bits: 24 }
};

export const OUTRO_MS = 3600;

function buildBits(theme) {
  const colors = ['#08813f', '#f4ecd8', '#cd2a36', '#ffd447'];
  let html = '';
  for (let i = 0; i < THEMES[theme].bits; i++) {
    let style;
    if (theme === 'plaid') {
      const a = -34 + i * 13.6;
      style = `left:${8 + i * 17}%;--a0:${a}deg;--a1:${-a * 0.6}deg;animation-delay:${i * -0.4}s`;
    } else {
      const size = 8 + Math.random() * 26;
      style =
        `left:${Math.random() * 100}%;--rise:${2.4 + Math.random() * 2}s;--delay:${-Math.random() * 3}s;` +
        `--drift:${(Math.random() - 0.5) * 60}px;--spin:${Math.random() * 540}deg;` +
        (theme === 'bubbles' ? `width:${size}px;height:${size}px;` : `background:${colors[i % 4]};`);
    }
    html += `<span class="sudo-outro__bit" style="${style}"></span>`;
  }
  return html;
}

// Blendet ueber der Show einen show-typischen Hintergrund ein, zeigt das Logo und endet in Schwarz.
export function startLogoOutro({ logo, theme = 'plaid', duration = OUTRO_MS }) {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.appendChild(style);
  }

  const outro = document.createElement('div');
  outro.className = `sudo-outro sudo-outro--${theme}`;
  outro.style.setProperty('--outro-ms', `${duration}ms`);
  outro.style.setProperty('--outro-spot', THEMES[theme].spot);
  outro.innerHTML = `
    <div class="sudo-outro__bg"></div>
    ${buildBits(theme)}
    <div class="sudo-outro__spot"></div>
    <img class="sudo-outro__logo" src="${logo}" alt="" />
    <div class="sudo-outro__black"></div>
  `;
  document.body.appendChild(outro);
  return outro;
}
