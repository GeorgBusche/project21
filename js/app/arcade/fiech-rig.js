// Das Fiech auf dem Canvas: bleibt der rote Menü-Button (.btn-fiech) mit Augen, Brauen, "X" und Beinchen,
// bekommt aber Beat-Puls, Eye-Tracking und kleine Aktions-Animationen.
// drawFiech(ctx, x, y, size, state): (x, y) = Körpermitte, size = Kantenlänge.
// state: { beatPhase, bassEnergy, action: 'hover'|'slam'|'laser'|'laugh', lookAtX, lookAtY, tilt, squashX, squashY }

const TAU = Math.PI * 2;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLeg(ctx, s, side, action, beatPhase, t) {
  const ax = side * s * 0.27;
  const ay = s * 0.5;
  const len = s * 0.34;
  let ang;
  if (action === 'slam') ang = side * 0.55; // breit abgestützt
  else ang = Math.sin(beatPhase * TAU + (side > 0 ? 0 : Math.PI)) * 0.55 + Math.sin(t * 9 + side) * 0.05;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay - 1);
  ctx.lineTo(ax + Math.sin(ang) * len, ay + Math.cos(ang) * len);
  ctx.stroke();
}

function drawEye(ctx, s, side, laser, dx, dy) {
  const er = s * 0.2;
  const ex = side * s * 0.3;
  const ey = -s * 0.5 - s * 0.02;
  ctx.fillStyle = laser ? '#ecfeff' : '#fef08a';
  ctx.shadowColor = laser ? '#22d3ee' : '#fde047';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(ex, ey, er, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.stroke();
  // Pupille: schaut zum Spieler
  ctx.fillStyle = laser ? '#0e7490' : '#000';
  ctx.beginPath();
  ctx.ellipse(ex + dx * er * 0.5, ey + dy * er * 0.5, er * 0.22, er * 0.5, 0, 0, TAU);
  ctx.fill();
  // schräge Augenbraue
  ctx.save();
  ctx.translate(ex + side * er * 0.1, ey - er * 1.25);
  ctx.rotate(side * -0.45);
  ctx.fillStyle = '#000';
  rr(ctx, -er * 1.0, -s * 0.03, er * 2, s * 0.06, s * 0.03);
  ctx.fill();
  ctx.restore();
}

export function drawFiech(ctx, x, y, size, state = {}) {
  const { beatPhase = 1, bassEnergy = 0, action = 'hover', lookAtX = null, lookAtY = null, tilt = 0, squashX = 1, squashY = 1 } = state;
  const t = performance.now() / 1000;
  const s = size;
  const pulse = beatPhase < 0.2 ? Math.sin((beatPhase / 0.2) * Math.PI) : 0;
  const scale = 1 + pulse * 0.05 + bassEnergy * 0.025;
  const wobble = action === 'laugh' ? Math.sin(t * 34) * 0.05 : 0;
  const half = s / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt + wobble);
  ctx.scale(squashX * scale, squashY * scale);

  drawLeg(ctx, s, -1, action, beatPhase, t);
  drawLeg(ctx, s, 1, action, beatPhase, t);

  // Transparente Kontur statt teurem Schattenfilter, weiterhin im Bass pulsierend.
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(239,68,68,${0.15 + bassEnergy * 0.18 + pulse * 0.15})`;
  ctx.lineWidth = Math.max(4, s * 0.13);
  rr(ctx, -half, -half, s, s, s * 0.2);
  ctx.stroke();
  ctx.fillStyle = '#dc2626';
  rr(ctx, -half, -half, s, s, s * 0.2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fecaca';
  ctx.lineWidth = Math.max(2, s * 0.055);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  rr(ctx, -half + 4, -half + 4, s - 8, s - 8, s * 0.15);
  ctx.stroke();

  // Aktion: ein kleines Zacken-Maul unter dem X bei Slam/Laugh
  const open = action === 'slam' ? 1 : action === 'laugh' ? 0.5 + 0.5 * Math.sin(t * 30) ** 2 : 0;
  if (open > 0.05) {
    const mw = s * 0.46;
    const my = s * 0.27;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(-mw / 2, my);
    ctx.lineTo(mw / 2, my);
    ctx.lineTo(mw / 2 - s * 0.04, my + s * 0.13 * open);
    ctx.lineTo(-mw / 2 + s * 0.04, my + s * 0.13 * open);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fef2f2';
    for (let i = 0; i < 4; i++) {
      const x0 = -mw / 2 + (mw / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x0, my);
      ctx.lineTo(x0 + mw / 4, my);
      ctx.lineTo(x0 + mw / 8, my + s * 0.06 * open);
      ctx.fill();
    }
  }

  // Schwarzes "X" in der Mitte, im Beat leicht glühend
  const xs = s * 0.14;
  ctx.shadowColor = '#fb923c';
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = s * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-xs, -xs * 0.6);
  ctx.lineTo(xs, xs * 1.4);
  ctx.moveTo(xs, -xs * 0.6);
  ctx.lineTo(-xs, xs * 1.4);
  ctx.stroke();
  ctx.shadowBlur = 0;

  let dx = 0;
  let dy = 0;
  if (lookAtX !== null && lookAtY !== null) {
    const vx = lookAtX - x;
    const vy = lookAtY - y;
    const len = Math.hypot(vx, vy) || 1;
    dx = vx / len;
    dy = vy / len;
  }
  const laser = action === 'laser';
  drawEye(ctx, s, -1, laser, dx, dy);
  drawEye(ctx, s, 1, laser, dx, dy);

  ctx.restore();
}
