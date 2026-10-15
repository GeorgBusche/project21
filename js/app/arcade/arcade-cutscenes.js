import { drawTitan, BOSS_HP_RADIUS } from './stages/stage4-show.js';

const TAU = Math.PI * 2;
const clamp = (v) => Math.max(0, Math.min(1, v));
const out = (v) => 1 - (1 - clamp(v)) ** 3;
const noise = (i) => {
  const n = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};

function text(ctx, value, x, y, size, color = '#fff', align = 'center') {
  ctx.font = `900 ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function glowLine(ctx, color, width, draw) {
  ctx.beginPath();
  draw();
  ctx.strokeStyle = color;
  ctx.globalAlpha *= 0.18;
  ctx.lineWidth = width * 5;
  ctx.stroke();
  ctx.globalAlpha /= 0.18;
  ctx.lineWidth = width;
  ctx.stroke();
}

function ring(ctx, x, y, radius, rotation, teeth, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  glowLine(ctx, color, 1.4, () => {
    for (let i = 0; i <= teeth * 4; i++) {
      const a = (i / (teeth * 4)) * TAU;
      const r = radius + (i % 4 < 2 ? 4 : -4);
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  });
  ctx.restore();
}

function sparkRain(ctx, time, start, x, y, count, spread = 170) {
  const age = time - start;
  if (age < 0 || age > 1.4) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const vx = (noise(i + start) - 0.5) * spread * 2;
    const vy = -80 - noise(i + 41) * 230;
    const px = x + vx * age;
    const py = y + vy * age + 210 * age * age;
    ctx.globalAlpha = clamp(1 - age / 1.4);
    ctx.strokeStyle = i % 3 ? '#fb923c' : '#fff7c0';
    ctx.lineWidth = (i % 2) + 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - vx * 0.025, py - (vy + 420 * age) * 0.025);
    ctx.stroke();
  }
  ctx.restore();
}

function flash(ctx, amount, color = '#fff') {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(amount);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 360, 600);
  ctx.restore();
}

function frame(ctx, title, subtitle, time, total) {
  ctx.fillStyle = '#020205';
  ctx.fillRect(0, 0, 360, 27);
  ctx.fillRect(0, 560, 360, 40);
  text(ctx, title, 12, 14, 9, '#f87171', 'left');
  text(ctx, subtitle, 180, 575, 9, '#fca5a5');
  ctx.fillStyle = '#3f111a';
  ctx.fillRect(12, 592, 336, 2);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(12, 592, 336 * clamp(time / total), 2);
}

function flame(ctx, x, bottom, height, time, index) {
  const wave = Math.sin(time * 31 + index * 2);
  for (let layer = 0; layer < 3; layer++) {
    const w = [38, 25, 11][layer];
    const h = height * [1, 0.86, 0.65][layer];
    ctx.fillStyle = ['#b91c1c', '#fb7c16', '#fff5b0'][layer];
    ctx.beginPath();
    ctx.moveTo(x - w, bottom);
    ctx.bezierCurveTo(
      x - w * 1.6,
      bottom - h * 0.35,
      x + wave * 14,
      bottom - h * 0.7,
      x + wave * 9,
      bottom - h
    );
    ctx.bezierCurveTo(x + w * 0.4, bottom - h * 0.65, x + w * 1.8, bottom - h * 0.3, x + w, bottom);
    ctx.fill();
  }
}

export function renderPyroIntro(ctx, t, total, beat, engine) {
  ctx.save();
  ctx.fillStyle = '#090305';
  ctx.fillRect(0, 0, 360, 600);
  const slam = out(t / 0.48);
  const release = out((t - 2.84) / 0.16);
  const shake = Math.exp(-Math.max(0, t - 0.48) * 9) * (t >= 0.48 ? 7 : 0);
  ctx.translate(Math.sin(t * 173) * shake, Math.cos(t * 139) * shake);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * (180 * (1 - slam) + 210 * release), 0);
    const x = side < 0 ? 0 : 180;
    const steel = ctx.createLinearGradient(x, 0, x + 180, 600);
    steel.addColorStop(0, '#303039');
    steel.addColorStop(0.48, '#0c0d12');
    steel.addColorStop(1, '#22222a');
    ctx.fillStyle = steel;
    ctx.fillRect(x, 27, 180, 533);
    ctx.strokeStyle = '#47434a';
    ctx.lineWidth = 2;
    for (let y = 50; y < 560; y += 75) {
      ctx.strokeRect(x + 12, y, 156, 60);
      for (const dx of [19, 161]) {
        ctx.fillStyle = '#626069';
        ctx.beginPath();
        ctx.arc(x + dx, y + 9, 3, 0, TAU);
        ctx.fill();
      }
    }
    glowLine(ctx, '#fb5424', 2, () => {
      ctx.moveTo(180, 28);
      for (let y = 28; y < 560; y += 14) ctx.lineTo(180 + Math.sin(y * 2) * 3, y);
    });
    ctx.restore();
  }
  sparkRain(ctx, t, 0.48, 180, 300, 40, 260);
  ctx.save();
  ctx.translate(180, 250);
  ctx.scale(out((t - 0.5) / 0.4), out((t - 0.5) / 0.4));
  // Eigenes, asymmetrisches Stahlwerk-Signet statt einer kopierten Bandmarke.
  ctx.fillStyle = '#2a1011';
  ctx.strokeStyle = '#ff632f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-23, -76);
  ctx.lineTo(27, -76);
  ctx.lineTo(27, -26);
  ctx.lineTo(70, -26);
  ctx.lineTo(70, 20);
  ctx.lineTo(23, 20);
  ctx.lineTo(23, 77);
  ctx.lineTo(-25, 77);
  ctx.lineTo(-25, 20);
  ctx.lineTo(-70, 20);
  ctx.lineTo(-70, -26);
  ctx.lineTo(-23, -26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const age = t - (1 + i * 0.25);
    if (age < 0) continue;
    const x = 60 + i * 120;
    const height = (270 + Math.sin(t * 23 + i) * 40) * out(age / 0.12);
    ctx.save();
    for (let p = 0; p < 7; p++) {
      ctx.fillStyle = `rgba(12,10,16,${0.35 - p * 0.035})`;
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(t * 6 + p) * 15, 510 - height - p * 27, 34 + p * 5, 33, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    flame(ctx, x, 550, height, t, i);
    for (let p = 0; p < 6; p++) {
      ctx.strokeStyle = `rgba(255,200,110,${0.1 + p * 0.015})`;
      ctx.beginPath();
      ctx.moveTo(x - 40, 520 - p * 40);
      ctx.quadraticCurveTo(x + Math.sin(t * 20 + p) * 30, 500 - p * 40, x + 40, 520 - p * 40);
      ctx.stroke();
    }
    ctx.restore();
    sparkRain(ctx, t, 1 + i * 0.25, x, 550, 14, 75);
  }
  if (t >= 1.5) {
    ctx.save();
    ctx.globalAlpha = out((t - 1.5) / 0.25);
    engine.drawFiech(ctx, 180, 350, 120, {
      action: 'laser',
      bodyColor: '#060307',
      eyeColors: ['#fff7dd', '#fff7dd'],
      beatPhase: beat.beatPhase,
      bassEnergy: 0
    });
    for (const side of [-1, 1]) {
      glowLine(ctx, '#fff7dd', 4, () => {
        ctx.moveTo(180 + side * 36, 288);
        ctx.lineTo(180 + side * 48, 284);
      });
      sparkRain(ctx, t, 1.75, 180 + side * 36, 289, 10, 100);
    }
    ctx.restore();
  }
  if (t >= 2.2) {
    const stamp = out((t - 2.2) / 0.13);
    ctx.save();
    ctx.translate(180, 435);
    ctx.scale(1 + (1 - stamp) * 2, 1 + (1 - stamp) * 2);
    ctx.rotate(-0.055);
    ctx.globalAlpha = stamp;
    ctx.fillStyle = '#150507';
    ctx.fillRect(-169, -32, 338, 64);
    ctx.strokeStyle = '#fb602c';
    ctx.lineWidth = 3;
    ctx.strokeRect(-169, -32, 338, 64);
    text(ctx, '// FEUER FREI! //', 3, 2, 28, '#ef233c');
    text(ctx, '// FEUER FREI! //', -2, -1, 28, '#22d3ee');
    text(ctx, '// FEUER FREI! //', 0, 0, 28, '#fff6dc');
    ctx.restore();
    sparkRain(ctx, t, 2.2, 180, 435, 40, 270);
  }
  if (release > 0) ring(ctx, 180, 300, release * 430, 0, 48, '#ff352e');
  flash(ctx, (1 - (t - 0.48) / 0.12) * (t >= 0.48 ? 0.65 : 0));
  flash(ctx, clamp((t - 2.92) / 0.08), '#ffdfbb');
  frame(ctx, 'LIVE // PYRO-STAHLWERK', '3 SPUREN / INDUSTRIAL IGNITION', t, total);
  ctx.restore();
}

function glass(ctx, x, y, scale, hot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = hot ? '#ffd46b' : '#6b391e';
  ctx.strokeStyle = '#ffe8b0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-5, -11);
  ctx.lineTo(5, -11);
  ctx.lineTo(4, 9);
  ctx.lineTo(-4, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff8cd';
  ctx.fillRect(-3, -9, 1.5, 13);
  ctx.restore();
}

export function renderBossIntro(ctx, t, total, beat, engine, glasses) {
  ctx.save();
  ctx.fillStyle = '#020205';
  ctx.fillRect(0, 0, 360, 600);
  const pulse = Math.max(0, 1 - beat.beatPhase * 4);
  const countdownStart = total - 2.5;
  const handoff = out((t - (total - 0.55)) / 0.55);
  const ritualRadius = 126 + (BOSS_HP_RADIUS - 126) * handoff;
  for (let i = 0; i < 48; i++) {
    const x = noise(i) * 360 + Math.sin(t + i) * 9;
    const y = (noise(i + 73) * 600 - t * (8 + noise(i) * 20) + 1200) % 600;
    ctx.fillStyle = i % 4 ? '#681323' : '#f66d40';
    ctx.fillRect(x, y, (i % 3) + 1, (i % 3) + 1);
  }
  if (t < 4.7) {
    const messages = [
      [0.5, '> CRITICAL FAILURE:', 'STAGE 1-3 CONTAINMENT BROKEN'],
      [1.8, '> ANALYZING BLOOD ALCOHOL LEVEL...', '38.0% KORN DETECTED'],
      [3.1, '> sudo mount --force', '/dev/TEUFELS_BIERDECKEL']
    ];
    messages.forEach(([start, a, b], i) => {
      if (t < start) return;
      const count = Math.floor((t - start) * 45);
      const y = [100, 400, 478][i];
      text(ctx, a.slice(0, count), 18, y, 10, '#ef5960', 'left');
      text(ctx, b.slice(0, Math.max(0, count - a.length)), 18, y + 16, 10, '#ad394d', 'left');
    });
    glowLine(ctx, '#ff2647', 1.7 + pulse, () => {
      ctx.moveTo(0, 310);
      for (let x = 0; x <= 360; x += 2) {
        const phase = ((x + t * 115) % 120) / 120;
        const y =
          phase > 0.65 && phase < 0.85
            ? Math.sin(((phase - 0.65) / 0.2) * TAU) * (35 + pulse * 20)
            : Math.sin(phase * TAU) * 2;
        ctx.lineTo(x, 310 + y);
      }
    });
    text(ctx, 'NO SIGNAL / HEARTBEAT DETECTED', 180, 190, 10, '#7c2637');
    text(ctx, `${(38 + Math.sin(t * 7) * 0.08).toFixed(1)}% VOL`, 180, 230, 32, '#b82f44');
  }
  if (t >= 4.5) {
    const summon = out((t - 4.5) / 1.1);
    const zoom = 1 + 0.35 * out((t - countdownStart) / 1.4) * (1 - handoff);
    ctx.save();
    ctx.translate(180, 255);
    ctx.scale(zoom, zoom);
    ctx.translate(-180, -255);
    ctx.globalAlpha = summon;
    const halo = ctx.createRadialGradient(180, 255, 12, 180, 255, 200);
    halo.addColorStop(0, '#5f102233');
    halo.addColorStop(0.7, '#b71f2422');
    halo.addColorStop(1, '#00000000');
    ctx.fillStyle = halo;
    ctx.fillRect(-30, 40, 420, 430);
    if (t >= countdownStart) {
      const step = t < countdownStart + 0.8 ? 0 : t < countdownStart + 1.6 ? 1 : 2;
      const kick = 1 - out((t - (countdownStart + step * 0.8)) / 0.25);
      text(ctx, String(3 - step), 183 + Math.sin(t * 170) * kick * 8, 260, 290, '#ef234477');
      text(ctx, String(3 - step), 177, 258, 290, '#22d3ee33');
    }
    ring(ctx, 180, 255, (126 - 52 * handoff) * summon, t * 0.12, 32, '#ed3948');
    ring(ctx, 180, 255, (93 - 42 * handoff) * summon, -t * 0.2, 22, '#a33f39');
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU + t * 0.08;
      const x = 180 + Math.cos(a) * 111;
      const y = 255 + Math.sin(a) * 111;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.strokeStyle = '#bb5947';
      ctx.strokeRect(-3, -3, 6, 6);
      ctx.restore();
    }
    let locked = 0;
    for (let i = 0; i < glasses; i++) {
      const at = 5 + (i * 4.2) / (glasses - 1);
      const age = t - at;
      if (age < 0) continue;
      locked++;
      const a = -Math.PI / 2 + (i / glasses) * TAU;
      const x = 180 + Math.cos(a) * ritualRadius;
      const y = 255 + Math.sin(a) * ritualRadius;
      const landing = out(age / 0.2);
      const heat = clamp(1 - age / 0.5);
      if (heat > 0) {
        ctx.save();
        ctx.globalAlpha = heat * 0.65;
        const beam = ctx.createLinearGradient(x, 30, x, y);
        beam.addColorStop(0, '#fbbf2400');
        beam.addColorStop(1, '#ffedb7');
        ctx.fillStyle = beam;
        ctx.fillRect(x - 4, 27, 8, Math.max(1, y - 27));
        ctx.restore();
      }
      glass(ctx, x, y - (1 - landing) * 360, 1.2 + heat - handoff * 0.65, t > 10.5);
      sparkRain(ctx, t, at + 0.2, x, y, 6, 90);
      if (t >= 10.5 && t < countdownStart + 0.2) {
        glowLine(ctx, i % 2 ? '#ffd05d' : '#fc5342', 1, () => {
          ctx.moveTo(x, y);
          for (let p = 1; p <= 7; p++) {
            const f = p / 7;
            const j = p === 7 ? 0 : Math.sin(t * 55 + i * 8 + p * 13) * 9;
            ctx.lineTo(x + (180 - x) * f + j, y + (255 - y) * f - j);
          }
        });
        if (i % 4 === 0) {
          const f = (t * 1.3 + i / glasses) % 1;
          text(
            ctx,
            ['SUDO', 'AHOI', '38%'][i % 3],
            x + (180 - x) * f,
            y + (255 - y) * f,
            6,
            '#fff2ba'
          );
        }
      }
    }
    if (t >= 9.5) {
      const mutate = out((t - 13) / 0.65);
      const size = 48 + mutate * 40;
      const jitter = t >= 10.5 && t < countdownStart ? 1 : 0;
      const jx = Math.sin(t * 119) * jitter * 5;
      if (mutate > 0 && t < 13.65) {
        ring(ctx, 180, 255, 61 + mutate * 10, t * 2, 24, '#ffd06a');
        ring(ctx, 180, 255, 51, -t * 1.7, 14, '#ef3845');
      }
      ctx.save();
      ctx.globalAlpha = out((t - 9.5) / 0.5);
      if (jitter) {
        ctx.globalAlpha *= 0.3;
        engine.drawFiech(ctx, 187 + jx, 255, size, {
          beatPhase: 0,
          action: 'slam',
          bodyColor: '#ff2346'
        });
        engine.drawFiech(ctx, 173 + jx, 255, size, {
          beatPhase: 0,
          action: 'laser',
          bodyColor: '#22d3ee'
        });
        ctx.globalAlpha = 1;
      }
      if (t >= 13.65) drawTitan(ctx, engine, {
        x: 180 + jx, y: 255, size, t, beat, energy: pulse, color: '#fbbf24', recoil: jitter * 0.3
      });
      else engine.drawFiech(ctx, 180 + jx, 255, size, {
        beatPhase: beat.beatPhase,
        bassEnergy: pulse * mutate,
        action: mutate ? 'laugh' : 'hover',
        bodyColor: t < 13 ? '#24212b' : '#dc2626',
        eyeColors: [t >= 11.5 ? '#ff2346' : '#14111a', t >= 12.2 ? '#67edff' : '#14111a'],
        dormant: t < 10.5
      });
      if (mutate && t < 13.65)
        glowLine(ctx, '#ff562c', 4, () => {
          ctx.moveTo(166 + jx, 244);
          ctx.lineTo(194 + jx, 272);
          ctx.moveTo(194 + jx, 244);
          ctx.lineTo(166 + jx, 272);
        });
      if (jitter)
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = i % 2 ? '#22d3ee55' : '#ef233c88';
          ctx.fillRect(118 + Math.sin(t * 99 + i) * 14, 210 + i * 15, 120, 2);
        }
      ctx.restore();
    }
    ctx.restore();
    text(
      ctx,
      `PINNCHEN ${String(locked).padStart(2, '0')}/${glasses} ${locked === glasses ? 'LOCKED' : 'ARMING'}`,
      180,
      t >= countdownStart ? 60 : 440,
      13,
      '#ffd181'
    );
    if (t >= countdownStart) {
      const step = t < countdownStart + 0.8 ? 0 : t < countdownStart + 1.6 ? 1 : 2;
      const at = countdownStart + step * 0.8;
      const kick = 1 - out((t - at) / 0.25);
      ctx.save();
      ctx.translate(180 + Math.sin(t * 170) * kick * 10, 470);
      ctx.scale(1 + kick * 0.2, 1 + kick * 0.2);
      text(ctx, String(3 - step), 3, 0, 105, '#ef234588');
      text(ctx, String(3 - step), -3, 0, 105, '#22d3ee66');
      text(ctx, String(3 - step), 0, 0, 105, '#fff2d8');
      text(ctx, ['// KORN', '// AHOI', '// EX ODER KELLER!'][step], 0, 60, 17, '#ff9c70');
      ctx.restore();
      const edge = ctx.createRadialGradient(180, 280, 85, 180, 280, 340);
      edge.addColorStop(0, '#ef233c00');
      edge.addColorStop(1, `rgba(160,0,25,${0.5 + pulse * 0.25})`);
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, 360, 600);
    }
  }
  flash(ctx, clamp((t - (total - 0.13)) / 0.13), '#fff2e5');
  frame(
    ctx,
    'SUDO // EXORZISMUS DES TRESEN-TITANS',
    t < 4.5
      ? 'ACT I / SYSTEM-NAHTOD'
      : t < 9.5
        ? 'ACT II / DAS RITUAL'
        : t < countdownStart
          ? 'ACT III / END-FIECH'
          : 'ACT IV / OVERDRIVE',
    t,
    total
  );
  ctx.restore();
}

export function renderIntroImpact(ctx, elapsed, boss, engine, beat, landing) {
  const p = clamp(elapsed / 0.65);
  if (p >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  ring(ctx, 180, boss ? 255 : 300, 20 + out(p) * 440, p * 0.2, 40, boss ? '#67e8f9' : '#ff5139');
  if (boss) {
    const x = 340 + out(p) * ((landing?.x ?? 180) - 340);
    const y = -60 + out(p) * ((landing?.y ?? 391) + 60);
    glowLine(ctx, '#22d3ee', 8, () => {
      ctx.moveTo(x + 90, y - 180);
      ctx.lineTo(x, y);
    });
    engine.drawPlayer(ctx, x, y, 28, {
      mode: 'runner',
      accent: '#22d3ee',
      thrust: 1,
      beatPhase: beat.beatPhase
    });
  }
  flash(ctx, clamp(1 - elapsed / 0.17), boss ? '#fff1e9' : '#ffe6ce');
  ctx.restore();
}
