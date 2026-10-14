import { clamp, roundRect } from './stage-utils.js';

export const SIZE = 32;

// Qualitätsstufe: glow 0 = keine Leuchteffekte (shadowBlur ist auf Handys sehr teuer), rain < 1 = weniger Matrix-Regen
export const fx = { glow: 1, rain: 1 };

// Die drei Oberdesigns von Stage 1 (Farbwelten)
export const THEMES = [
  { name: 'SECTOR 1A // MATRIX BOOT', accent: [16, 185, 129], accent2: [6, 182, 212] },
  { name: 'SECTOR 1B // HIGH VOLTAGE FOUNDRY', accent: [245, 158, 11], accent2: [249, 115, 22] },
  { name: 'SECTOR 1C // KERNEL MELTDOWN', accent: [239, 68, 68], accent2: [168, 85, 247] }
];

export const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function drawTag(ctx, text, x, y, color = '#4ade80') {
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 8;
  ctx.fillStyle = 'rgba(2,10,8,0.78)';
  ctx.fillRect(x - w / 2, y - 7, w, 14);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// Hintergrund + Fahrbahn einer Welt; w = Sichtbarkeit (Überblendung zwischen den Welten)
export function drawLayer(ctx, i, w, c) {
  const { W, H, g, rail, scroll, t, bass, flash, barPulse } = c;
  const th = THEMES[i];
  const A = th.accent;
  const A2 = th.accent2;
  ctx.save();
  ctx.globalAlpha = w;

  if (i === 0) {
    ctx.strokeStyle = rgba(A, 0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const step = 40;
    for (let x = -((scroll * 0.25) % step); x < W; x += step) {
      ctx.moveTo(x, rail);
      ctx.lineTo(x, g);
    }
    for (let y = rail; y < g; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyphs = '01FIECH21X';
    const cols = fx.rain < 1 ? 7 : 14;
    const rows = fx.rain < 1 ? 4 : 8;
    for (let k = 0; k < cols; k++) {
      const cx = (k + 0.5) * (W / cols);
      const headY = ((t * 70 * (0.5 + (k % 4) * 0.25) + k * 91) % (H * 0.5)) + 6;
      for (let j = 0; j < rows; j++) {
        const y = headY - j * 14;
        if (y < rail) continue;
        ctx.fillStyle = rgba(A, 0.34 * (1 - j / rows));
        ctx.fillText(glyphs[Math.floor(t * 9 + k * 3 + j * 7) % glyphs.length], cx, y);
      }
    }
  } else if (i === 1) {
    ctx.strokeStyle = 'rgba(250,204,21,0.075)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    const off = (scroll * 0.3) % 46;
    for (let x = -(g - rail) - 46 + off; x < W + 46; x += 46) {
      ctx.moveTo(x, g);
      ctx.lineTo(x + (g - rail), rail);
    }
    ctx.stroke();
    const gap = 170;
    const po = (scroll * 0.5) % gap;
    for (let x = -po; x < W + gap; x += gap) {
      const grad = ctx.createLinearGradient(x - 15, 0, x + 15, 0);
      grad.addColorStop(0, 'rgba(60,24,4,0.9)');
      grad.addColorStop(0.5, rgba(A2, 0.55 + bass * 0.3));
      grad.addColorStop(1, 'rgba(60,24,4,0.9)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - 15, rail, 30, g - rail);
      ctx.fillStyle = rgba(A, 0.6 + flash * 0.3);
      for (let y = rail + 40; y < g - 20; y += 70) ctx.fillRect(x - 17, y, 34, 5);
    }
  } else {
    const fog = ctx.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H * 0.45, 360);
    fog.addColorStop(0, rgba(A, 0.22 + bass * 0.18 + flash * 0.06));
    fog.addColorStop(1, 'rgba(60,0,20,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = rgba(A, 0.08);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -((scroll * 0.35) % 36); x < W; x += 36) {
      ctx.moveTo(x, rail);
      ctx.lineTo(x, g);
    }
    for (let y = rail; y < g; y += 36) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
    // Glitch-Streifen im Bass
    const gs = Math.floor(t * 9);
    for (let k = 0; k < 5; k++) {
      const gx = (k * 97 + gs * 53) % W;
      ctx.fillStyle = rgba(A2, 0.06 + bass * 0.12);
      ctx.fillRect(gx, rail, 3 + (k % 3) * 2, g - rail);
    }
    // Warnlampen an der Schiene
    for (let x = -((scroll * 0.5) % 90); x < W + 90; x += 90) {
      const on = (Math.floor(x / 90) + Math.floor(t * 4)) % 2 === 0;
      ctx.fillStyle = on ? 'rgba(255,60,60,0.95)' : 'rgba(120,20,20,0.7)';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = fx.glow * (on ? 14 : 0);
      ctx.beginPath();
      ctx.arc(x, rail + 12, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // Banner im Hintergrund
  const [big, sub] = th.name.split(' // ');
  ctx.globalAlpha = w * (0.07 + bass * 0.12 + flash * 0.03);
  ctx.fillStyle = rgba(A2, 1);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(`⚠️ ${big}`, W / 2, H * 0.33);
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`// ${sub}`, W / 2, H * 0.33 + 30);
  ctx.globalAlpha = w;

  // Radial-Impuls auf dem Taktanfang
  if (barPulse > 0.01) {
    const rg = ctx.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H * 0.4, 100 + (1 - barPulse) * 260);
    rg.addColorStop(0, rgba(A, 0));
    rg.addColorStop(0.8, rgba(A, barPulse * 0.16));
    rg.addColorStop(1, rgba(A, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }

  // Fahrbahn
  const road = ctx.createLinearGradient(0, g, 0, H);
  road.addColorStop(0, rgba(A, 0.22));
  road.addColorStop(0.25, i === 2 ? '#150407' : i === 1 ? '#120a02' : '#06100f');
  road.addColorStop(1, '#020405');
  ctx.fillStyle = road;
  ctx.fillRect(-10, g, W + 20, H - g + 10);
  if (i === 1) {
    ctx.fillStyle = 'rgba(250,204,21,0.5)';
    for (let x = -((scroll * 1.1) % 36); x < W; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, g + 14);
      ctx.lineTo(x + 12, g + 4);
      ctx.lineTo(x + 24, g + 4);
      ctx.lineTo(x + 12, g + 14);
      ctx.fill();
    }
  } else if (i === 2) {
    ctx.strokeStyle = rgba([251, 146, 60], 0.5 + bass * 0.4);
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = fx.glow * (8);
    ctx.lineWidth = 1.5;
    for (let x = -((scroll * 1.2) % 120); x < W; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, g + 6);
      ctx.lineTo(x + 18, g + 26);
      ctx.lineTo(x + 8, g + 44);
      ctx.lineTo(x + 34, g + 70);
      ctx.moveTo(x + 18, g + 26);
      ctx.lineTo(x + 46, g + 30);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = rgba(A, 0.55);
    for (let x = -(scroll % 60); x < W; x += 60) ctx.fillRect(x, g + 12, 34, 3);
    ctx.fillStyle = rgba(A, 0.28);
    for (let x = -((scroll * 1.4) % 90); x < W; x += 90) ctx.fillRect(x, g + 34, 52, 2);
  }
  ctx.restore();
}

export function drawCube(ctx, x, cube, blink, engine, beatPhase = 1) {
  if (blink && Math.floor(performance.now() / 80) % 2 === 0) return;
  const stretch = clamp(Math.abs(cube.vy) / 1600, 0, 0.18);
  const sq = cube.squash * 0.28;
  const sy = 1 + stretch - sq;
  const sx = 1 - stretch + sq;
  const cy = cube.y + SIZE / 2 + (cube.onGround ? (1 - sy) * (SIZE / 2) * cube.dir : 0);
  const cx = x + SIZE / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(cube.rot);
  ctx.scale(sx, sy * cube.dir);
  if (engine && typeof engine.drawPlayer === 'function') {
    const hot = cube.comet > 0;
    const accent = hot ? '#ffffff' : '#22d3ee';
    // Rotierendes Chassis: Rahmen, Cockpit-Fenster, Eckbolzen
    ctx.shadowColor = accent;
    ctx.shadowBlur = fx.glow * (hot ? 28 : 14);
    const grad = ctx.createLinearGradient(-SIZE / 2, -SIZE / 2, SIZE / 2, SIZE / 2);
    grad.addColorStop(0, hot ? '#f0fdfa' : '#34d399');
    grad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = grad;
    roundRect(ctx, -SIZE / 2, -SIZE / 2, SIZE, SIZE, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ecfeff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#06222c';
    roundRect(ctx, -SIZE / 2 + 4, -SIZE / 2 + 4, SIZE - 8, SIZE - 8, 4);
    ctx.fill();
    ctx.fillStyle = '#ecfeff';
    for (const [bx, by] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ctx.fillRect(bx * (SIZE / 2 - 2.5) - 1, by * (SIZE / 2 - 2.5) - 1, 2, 2);
    ctx.restore();
    // Pilot bleibt aufrecht (Gegenrotation), nur Squash/Stretch wird mitgenommen
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);
    engine.drawPlayer(ctx, 0, 0, 25, {
      mode: 'runner',
      tilt: 0,
      thrust: cube.onGround ? 0 : 1,
      beatPhase,
      squashX: 1,
      squashY: 1,
      accent
    });
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(cube.rot);
  ctx.scale(sx, sy * cube.dir);
  ctx.shadowColor = cube.comet > 0 ? '#ffffff' : '#22d3ee';
  ctx.shadowBlur = fx.glow * (cube.comet > 0 ? 28 : 14);
  const grad = ctx.createLinearGradient(-SIZE / 2, -SIZE / 2, SIZE / 2, SIZE / 2);
  grad.addColorStop(0, cube.comet > 0 ? '#f0fdfa' : '#34d399');
  grad.addColorStop(1, '#06b6d4');
  ctx.fillStyle = grad;
  roundRect(ctx, -SIZE / 2, -SIZE / 2, SIZE, SIZE, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ecfeff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#064e3b';
  roundRect(ctx, -SIZE / 2 + 5, -SIZE / 2 + 5, SIZE - 10, SIZE - 10, 3);
  ctx.fill();
  ctx.fillStyle = '#10b981';
  ctx.fillRect(-SIZE / 2 + 8, -SIZE / 2 + 8, SIZE - 16, SIZE - 16);
  ctx.fillStyle = '#021014';
  ctx.fillRect(-9, -5, 18, 8);
  ctx.shadowColor = '#67e8f9';
  ctx.shadowBlur = fx.glow * (8);
  ctx.fillStyle = '#a5f3fc';
  ctx.fillRect(-1, -3, 8, 4);
  ctx.restore();
}

function hazardGlow(ctx) {
  ctx.shadowColor = '#f97316';
  ctx.shadowBlur = fx.glow * (10);
}

function drawSpikeShape(ctx, x, w, h, by, up) {
  ctx.fillStyle = '#ef4444';
  hazardGlow(ctx);
  ctx.beginPath();
  if (up) {
    ctx.moveTo(x, by);
    ctx.lineTo(x + w / 2, by - h);
    ctx.lineTo(x + w, by);
  } else {
    ctx.moveTo(x, by);
    ctx.lineTo(x + w / 2, by + h);
    ctx.lineTo(x + w, by);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  const s = up ? 1 : -1;
  ctx.moveTo(x + w / 2 - 3, by - s * h * 0.45);
  ctx.lineTo(x + w / 2, by - s * h);
  ctx.lineTo(x + w / 2 + 3, by - s * h * 0.45);
  ctx.closePath();
  ctx.fill();
}

function drawSafeBlock(ctx, x, top, w, h, flash, crate) {
  ctx.fillStyle = '#053b2e';
  ctx.fillRect(x, top, w, h);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, top, w, h);
  if (crate) {
    ctx.fillStyle = '#065f46';
    for (let i = 0; i + 14 <= w - 4; i += 14) for (let j = 0; j + 16 <= h - 4; j += 16) ctx.fillRect(x + 4 + i, top + 6 + j, 10, 12);
  }
  // helle Oberkante = sicher zum Landen
  ctx.fillStyle = `rgba(167,243,208,${0.85 + flash * 0.15})`;
  ctx.shadowColor = '#34d399';
  ctx.shadowBlur = fx.glow * (8);
  ctx.fillRect(x, top - 1, w, 4);
  ctx.shadowBlur = 0;
}

function drawMini(ctx, x, y, s, t) {
  ctx.fillStyle = '#b91c1c';
  ctx.strokeStyle = '#fecaca';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, s, s, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(x + 5, y + 7, 6, 6);
  ctx.fillRect(x + s - 11, y + 7, 6, 6);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 3);
  ctx.lineTo(x + 12, y + 7);
  ctx.moveTo(x + s - 3, y + 3);
  ctx.lineTo(x + s - 12, y + 7);
  const l = Math.sin(t * 22) * 4;
  ctx.moveTo(x + 8, y + s);
  ctx.lineTo(x + 8 + l, y + s + 5);
  ctx.moveTo(x + s - 8, y + s);
  ctx.lineTo(x + s - 8 - l, y + s + 5);
  ctx.stroke();
}

export function drawElement(ctx, o, c) {
  const { g, rail, ceilY, flash, t, beatPos } = c;
  switch (o.kind) {
    case 'spike': {
      if (o.hidden) return;
      const h = o.h * Math.min(1, o.rise);
      drawSpikeShape(ctx, o.x, o.w, h, o.by, o.up);
      break;
    }
    case 'pop': {
      ctx.fillStyle = '#3f2a04';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.fillRect(o.x, g - 5, o.w, 5);
      ctx.strokeRect(o.x, g - 5, o.w, 5);
      if (o.hidden) {
        if (Math.floor(t * 10) % 2 === 0) {
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', o.x + o.w / 2, g - 20);
        }
      } else {
        const n = Math.max(1, Math.ceil(o.w / 30));
        const sw = o.w / n;
        for (let k = 0; k < n; k++) drawSpikeShape(ctx, o.x + k * sw, sw, 30 * Math.min(1, o.rise), g - 5, true);
      }
      break;
    }
    case 'block':
      if (o.rise > 0) drawSafeBlock(ctx, o.x, o.top, o.w, o.h * Math.min(1, o.rise) + (o.h < 20 ? 0 : 0), flash, o.crate);
      break;
    case 'guillotine': {
      if (o.state === 'down') {
        drawSafeBlock(ctx, o.x, o.y, o.w, o.h, flash, false);
      } else {
        ctx.strokeStyle = `rgba(239,68,68,${0.6 + flash * 0.4})`;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = fx.glow * (8);
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(o.x + o.w / 2, rail);
        ctx.lineTo(o.x + o.w / 2, o.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#7f1d1d';
        ctx.strokeStyle = '#ef4444';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeRect(o.x, o.y, o.w, o.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fecaca';
        const teeth = Math.max(2, Math.round(o.w / 10));
        const tw = o.w / teeth;
        for (let k = 0; k < teeth; k++) {
          ctx.beginPath();
          ctx.moveTo(o.x + k * tw, o.y + o.h);
          ctx.lineTo(o.x + (k + 0.5) * tw, o.y + o.h + 8);
          ctx.lineTo(o.x + (k + 1) * tw, o.y + o.h);
          ctx.fill();
        }
      }
      break;
    }
    case 'pad': {
      const base = o.base;
      if (o.ceil) {
        ctx.save();
        ctx.translate(0, 2 * base);
        ctx.scale(1, -1);
      }
      ctx.fillStyle = o.color;
      ctx.shadowColor = o.color;
      ctx.shadowBlur = fx.glow * (12);
      roundRect(ctx, o.x, base - o.h, o.w, o.h, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#422006';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(o.x + 6 + k * 9, base - 2);
        ctx.lineTo(o.x + 11 + k * 9, base - o.h + 2);
        ctx.lineTo(o.x + 16 + k * 9, base - 2);
        ctx.fill();
      }
      ctx.strokeStyle = `${o.color}`;
      ctx.globalAlpha = 0.3 + flash * 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(o.x + o.w / 2, base - 4, 14 + flash * 6, Math.PI, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (o.ceil) ctx.restore();
      break;
    }
    case 'orb': {
      if (o.hidden) break;
      const cx = o.x + 18;
      const pulse = 1 + flash * 0.15;
      ctx.globalAlpha = o.reveal !== undefined && o.reveal < 1 ? o.reveal : o.vanishing ? o.fade * (Math.floor(t * 30) % 2 ? 1 : 0.4) : o.used ? 0.25 : 1;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, o.y, 21 * pulse * (o.vanishing ? 0.4 + 0.6 * o.fade : 1), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = fx.glow * (14);
      ctx.beginPath();
      ctx.arc(cx, o.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(cx - 3, o.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }
    case 'saw': {
      ctx.save();
      ctx.translate(o.x + o.r, o.y);
      ctx.rotate(o.spin);
      ctx.fillStyle = '#e5e7eb';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = fx.glow * (10);
      ctx.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const rad = k % 2 ? o.r * 0.65 : o.r;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(0, 0, o.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'keg': {
      const cx = o.x + 16;
      const cy = g - 16;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(o.spin);
      ctx.fillStyle = '#7f1d1d';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = fx.glow * (12);
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(16, 0);
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 16);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'beam': {
      if (!o.live) {
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = `rgba(239,68,68,${0.35 + Math.sin(t * 24) * 0.25})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y + o.h / 2);
        ctx.lineTo(o.x + o.w, o.y + o.h / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = fx.glow * (16);
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fecaca';
        ctx.fillRect(o.x, o.y + o.h / 2 - 1, o.w, 2);
      }
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(o.x - 4, o.y - 2, 5, o.h + 4);
      ctx.fillRect(o.x + o.w - 1, o.y - 2, 5, o.h + 4);
      break;
    }
    case 'stomper': {
      const bot = o.bot;
      ctx.strokeStyle = 'rgba(239,68,68,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(o.x + o.w * 0.25, rail);
      ctx.lineTo(o.x + o.w * 0.25, bot - 22);
      ctx.moveTo(o.x + o.w * 0.75, rail);
      ctx.lineTo(o.x + o.w * 0.75, bot - 22);
      ctx.stroke();
      ctx.fillStyle = '#450a0a';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = fx.glow * (10);
      ctx.fillRect(o.x, bot - 22, o.w, 14);
      ctx.strokeRect(o.x, bot - 22, o.w, 14);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ef4444';
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(o.x + k * (o.w / 5), bot - 8);
        ctx.lineTo(o.x + (k + 0.5) * (o.w / 5), bot + 2);
        ctx.lineTo(o.x + (k + 1) * (o.w / 5), bot - 8);
        ctx.fill();
      }
      // grüner Streifen am Boden: einfach durchlaufen
      ctx.fillStyle = `rgba(74,222,128,${0.35 + flash * 0.35})`;
      ctx.fillRect(o.x, g - 4, o.w, 4);
      break;
    }
    case 'wave': {
      ctx.fillStyle = 'rgba(239,68,68,0.85)';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = fx.glow * (12);
      ctx.beginPath();
      ctx.moveTo(o.x, g);
      ctx.quadraticCurveTo(o.x + 6, g - o.h, o.x + o.w * 0.75, g - o.h * 0.35);
      ctx.lineTo(o.x + o.w, g);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.x, g);
      ctx.quadraticCurveTo(o.x + 6, g - o.h, o.x + o.w * 0.75, g - o.h * 0.35);
      ctx.stroke();
      break;
    }
    case 'pend': {
      const pv = o.pivot();
      const b = o.ball();
      ctx.strokeStyle = 'rgba(239,68,68,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pv.x, rail);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      c.drawFiech(ctx, b.x, b.y, 44, { beatPhase: c.beatPhase, bassEnergy: c.bass, action: 'laugh', tilt: -b.th * 0.8 });
      break;
    }
    case 'lava': {
      ctx.save();
      ctx.beginPath();
      ctx.rect(o.x, g - 12, o.w, H_FALLBACK);
      ctx.clip();
      const grad = ctx.createLinearGradient(0, g - 6, 0, g + 80);
      grad.addColorStop(0, '#fb923c');
      grad.addColorStop(0.3, '#dc2626');
      grad.addColorStop(1, '#450a0a');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = fx.glow * (16);
      ctx.beginPath();
      ctx.moveTo(o.x, g + 200);
      ctx.lineTo(o.x, g - 4);
      for (let x = o.x; x <= o.x + o.w; x += 8) ctx.lineTo(x, g - 5 + Math.sin(x / 9 + t * 6) * 3);
      ctx.lineTo(o.x + o.w, g + 200);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'portal': {
      const cx = o.x + o.w / 2;
      const cy = o.y + o.h / 2;
      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = fx.glow * (18);
      ctx.strokeStyle = o.used ? 'rgba(56,189,248,0.3)' : '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, o.w / 2 + 3, o.h / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(56,189,248,0.18)';
      ctx.fill();
      ctx.fillStyle = '#e0f2fe';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.flip === 'down' ? '↑' : '↓', cx, cy + Math.sin(t * 8) * 4);
      ctx.restore();
      break;
    }
    case 'track': {
      ctx.strokeStyle = `rgba(56,189,248,${0.7 + flash * 0.3})`;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = fx.glow * (10);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(o.x, ceilY - 1);
      ctx.lineTo(o.x + o.w, ceilY - 1);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }
    case 'scis': {
      const gt = o.gapTop();
      const gb = o.gapBot();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = fx.glow * (14);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(o.x + 2, rail, 6, gt - rail);
      if (gb < g) ctx.fillRect(o.x + 2, gb, 6, g - gb);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(o.x - 2, gt - 8, 14, 8);
      if (gb < g) ctx.fillRect(o.x - 2, gb, 14, 8);
      ctx.fillStyle = o.locked ? '#4ade80' : 'rgba(74,222,128,0.4)';
      ctx.fillRect(o.x - 14, gt + 2, 3, gb - gt - 4);
      break;
    }
    case 'gate': {
      const cx = o.x + o.w / 2;
      const gt = g - 165;
      const gb = g - 50;
      ctx.fillStyle = '#450a0a';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = fx.glow * (12);
      ctx.fillRect(o.x, rail, o.w, gt - rail);
      ctx.strokeRect(o.x, rail, o.w, gt - rail);
      ctx.fillRect(o.x, gb, o.w, g - gb);
      ctx.strokeRect(o.x, gb, o.w, g - gb);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(250,204,21,0.55)';
      for (let y = rail + 6; y < gt - 8; y += 22) ctx.fillRect(o.x + 2, y, o.w - 4, 8);
      for (let y = gb + 6; y < g - 8; y += 22) ctx.fillRect(o.x + 2, y, o.w - 4, 8);
      const rr = 48 + Math.sin(t * 8) * 2 + flash * 3;
      ctx.strokeStyle = '#4ade80';
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = fx.glow * (16);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, g - 106, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(74,222,128,0.18)';
      ctx.fill();
      break;
    }
    case 'mini':
      drawMini(ctx, o.x, g - o.w - 5, o.w, t);
      break;
    case 'runner':
      c.drawFiech(ctx, o.x + o.w / 2, g - o.w / 2 - 14, o.w, { beatPhase: c.beatPhase, bassEnergy: c.bass, action: 'laugh', lookAtX: c.px, lookAtY: g - 30 });
      break;
    default:
      break;
  }
  if ((o.kind === 'pad' && !o.ceil && o.v) || (o.kind === 'orb' && !o.used && !o.hidden)) {
    // Flugbahn-Vorschau: 4 Leuchtpunkte auf der Ideallinie (105 BPM, Schwerkraft 2400)
    const v = o.kind === 'orb' ? -650 : o.v;
    const y0 = o.kind === 'orb' ? o.y : o.base - 8;
    const x0 = o.kind === 'orb' ? o.x + 18 : o.x + o.w / 2;
    ctx.save();
    ctx.fillStyle = o.kind === 'orb' ? '#fde047' : o.color;
    for (let k = 1; k <= 4; k++) {
      const dx = 30 * k + 5;
      const tt = dx / 227.5;
      const y = y0 + v * tt + 1200 * tt * tt;
      if (y > g) break;
      ctx.globalAlpha = 0.25 + flash * 0.4 + (k === Math.floor(beatPos % 4) + 1 ? 0.25 : 0);
      ctx.beginPath();
      ctx.arc(x0 + dx, y, 3 + flash * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (o.tag) drawTag(ctx, o.tag, o.x + o.w / 2, o.tagY(o), o.tagColor);
  void beatPos;
}

const H_FALLBACK = 400;

// Teleport-Spuren: vertikale Cyber-Beams / Glitch-Säulen von der Decke bis zum Boden
export function drawTeleFx(ctx, list, rail, g) {
  for (const f of list) {
    const a = clamp(f.life / f.max, 0, 1);
    const w = 4 + 16 * a;
    const grad = ctx.createLinearGradient(0, rail, 0, g);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, f.color);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.globalAlpha = a * 0.75;
    ctx.fillStyle = grad;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = fx.glow * (14);
    ctx.fillRect(f.x - w / 2, rail, w, g - rail);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(f.x - 1, rail, 2, g - rail);
    for (let k = 0; k < 4; k++) {
      const y = f.y + (Math.random() - 0.5) * 120;
      ctx.fillStyle = k % 2 ? 'rgba(34,211,238,0.6)' : 'rgba(168,85,247,0.6)';
      ctx.fillRect(f.x - 30 + (Math.random() - 0.5) * 12, y, 60, 2 + Math.random() * 3);
    }
    ctx.restore();
  }
}

// Takt-Chevrons: ein » pro Beat (B px), im Beat aufleuchtend – deckungsgleich mit dem Spawn-Raster
export function drawChevrons(ctx, c) {
  const { g, SPAWN, B, grid, flash, acc } = c;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 16px monospace';
  ctx.shadowColor = rgba(acc, 1);
  ctx.shadowBlur = fx.glow * (4 + flash * 10);
  for (let x = SPAWN - grid; x > -B; x -= B) {
    ctx.fillStyle = rgba(acc, 0.2 + flash * 0.55);
    ctx.fillText('»', x, g + 18);
  }
  ctx.restore();
}
