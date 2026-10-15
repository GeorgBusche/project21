import { drawFiech } from './fiech-rig.js';
import { drawPlayer } from './player-rig.js';

const TAU = Math.PI * 2;
const SCENES = [
  {
    id: 'run', stage: '01 // FIECH-RUN', color: '#34d399',
    title: 'Endstation Bordstein.',
    line: 'Das Fiech hat die Ziellinie verlegt.'
  },
  {
    id: 'flight', stage: '02 // FIECH AIRWAYS', color: '#22d3ee',
    title: 'Landung: kreativ.',
    line: 'Dein Flug wurde auf Bodenverkehr umgebucht.'
  },
  {
    id: 'show', stage: '03 // LIVE-SHOW', color: '#e879f9',
    title: 'Von der Bühne gefegt.',
    line: 'Zugabe? Das Fiech hat noch Pyro übrig.'
  },
  {
    id: 'boss', stage: '04 // TEUFELS-BIERDECKEL', color: '#fb7185',
    title: 'Vom Deckel geputzt.',
    line: 'Der Titan dreht noch eine Ehrenrunde.'
  }
];
const VICTORY = {
  id: 'victory', stage: '04 // TITAN OFFLINE', color: '#fbbf24',
  title: 'Boss zerlegt!',
  line: '100 %. Jetzt stehst du im Rampenlicht.'
};

export function resultScene(stage, won = false) {
  return won ? VICTORY : SCENES[Math.max(0, Math.min(3, Math.floor(Number(stage) || 1) - 1))];
}

function line(ctx, points, color, width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke();
}

function ring(ctx, x, y, radius, color, width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.stroke();
}

function particles(ctx, t, color, falling = false) {
  ctx.fillStyle = color;
  for (let i = 0; i < 14; i++) {
    const x = (i * 67 + 13) % 320;
    const y = falling ? (i * 23 + t * (18 + i)) % 145 : 119 - ((i * 19 + t * 32) % 90);
    ctx.globalAlpha = .25 + (i % 3) * .2;
    ctx.fillRect(x, y, 2 + i % 3, falling ? 5 : 2);
  }
  ctx.globalAlpha = 1;
}

function runner(ctx, t, appearance, color) {
  ctx.fillStyle = '#092d25';
  ctx.fillRect(0, 117, 320, 28);
  line(ctx, [[0, 117], [320, 117]], color);
  for (let i = 0; i < 10; i++) {
    const x = (i * 40 - t * 38 % 40);
    line(ctx, [[x, 127], [x + 13, 127]], '#166d53');
  }
  // A rolling player meets the Fiech's suspiciously mobile finish line.
  drawPlayer(ctx, 94, 91 + Math.sin(t * 4) * 6, 36, { tilt: -t * 2.8, accent: color }, appearance);
  ctx.fillStyle = '#163c35';
  ctx.fillRect(145, 99, 31, 18);
  line(ctx, [[145, 99], [176, 99]], color, 3);
  drawFiech(ctx, 248, 82 + Math.sin(t * 3) * 2, 42, { action: 'laugh', beatPhase: 1 });
  const sway = Math.sin(t * 2) * 6;
  line(ctx, [[210, 117], [210 + sway, 40]], '#cbd5e1', 3);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#0f172a' : '#ecfeff';
    ctx.fillRect(210 + sway + i * 7, 40, 7, 14);
  }
  ctx.fillStyle = color;
  ctx.font = 'bold 9px monospace';
  ctx.fillText('ZIEL?', 210 + sway, 32);
}

function flight(ctx, t, appearance, color) {
  for (let i = 0; i < 7; i++) {
    const x = 320 - (i * 57 + t * 26) % 370;
    line(ctx, [[x, 24 + i * 11], [x + 20, 24 + i * 11]], '#164e63');
  }
  ctx.fillStyle = '#183342';
  ctx.beginPath();
  ctx.ellipse(90, 124, 45, 9, 0, 0, TAU);
  ctx.fill();
  drawPlayer(ctx, 90, 104 + Math.sin(t * 3) * 2, 49, { mode: 'ship', tilt: Math.PI + .25, accent: color }, appearance);
  // Smoke rings and a parachuting air-traffic controller.
  for (let i = 0; i < 4; i++) {
    const p = (t * .4 + i / 4) % 1;
    ctx.globalAlpha = (1 - p) * .5;
    ring(ctx, 105 + p * 26, 85 - p * 45, 3 + p * 7, '#94a3b8');
  }
  ctx.globalAlpha = 1;
  const y = 75 + Math.sin(t * 1.8) * 8;
  line(ctx, [[208, y - 38], [228, y], [248, y - 38]], '#cbd5e1', 1);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(228, y - 38, 29, Math.PI, TAU);
  ctx.closePath();
  ctx.fill();
  drawFiech(ctx, 228, y + 12, 34, { action: 'hover', beatPhase: 1, tilt: Math.sin(t * 1.8) * .1 });
  line(ctx, [[0, 135], [320, 135]], '#155e75');
}

function liveShow(ctx, t, appearance, color) {
  const sway = Math.sin(t * 1.4) * 25;
  ctx.fillStyle = '#e879f915';
  ctx.beginPath();
  ctx.moveTo(160 + sway, 0);
  ctx.lineTo(74, 121);
  ctx.lineTo(244, 121);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#251332';
  ctx.fillRect(0, 122, 320, 23);
  line(ctx, [[0, 122], [320, 122]], color);
  for (const x of [28, 260]) {
    ctx.fillStyle = '#192031';
    ctx.fillRect(x, 77, 32, 45);
    ring(ctx, x + 16, 105, 10 + Math.sin(t * 6) * 1.5, color);
    ring(ctx, x + 16, 86, 4, '#94a3b8');
  }
  drawPlayer(ctx, 111, 94 - Math.abs(Math.sin(t * 2.7)) * 23, 35, { tilt: Math.sin(t * 2.7) * .6, accent: color }, appearance);
  drawFiech(ctx, 211, 84, 42, { action: 'slam', beatPhase: 1, squashY: 1 - Math.max(0, Math.sin(t * 5)) * .08 });
  for (const x of [73, 248]) {
    for (let i = 0; i < 5; i++) {
      const p = (t * .8 + i / 5) % 1;
      ctx.fillStyle = i % 2 ? '#fbbf24' : '#fb7185';
      ctx.globalAlpha = 1 - p;
      ctx.fillRect(x + Math.sin(i * 5) * p * 17, 119 - p * 59, 3, 9 * (1 - p) + 2);
    }
  }
  ctx.globalAlpha = 1;
}

function boss(ctx, t, appearance, color, won) {
  const x = 165, y = 78;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.8, .65);
  for (const radius of [32, 46, 61]) ring(ctx, 0, 0, radius, won ? '#785b25' : '#70263f');
  ctx.restore();
  if (won) {
    drawFiech(ctx, 226, 109, 35, { dormant: true, tilt: 1.6, squashY: .65, bodyColor: '#475569' });
    ctx.fillStyle = '#674f21';
    ctx.fillRect(112, 113, 58, 22);
    drawPlayer(ctx, 141, 89, 41, { accent: color }, appearance);
    ctx.fillStyle = color;
    ctx.beginPath();
    [[122, 52], [119, 35], [132, 42], [141, 29], [150, 42], [163, 35], [160, 52]].forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
    ctx.closePath();
    ctx.fill();
    particles(ctx, t, color, true);
  } else {
    drawFiech(ctx, x, y, 62, { action: 'slam', beatPhase: 1, bodyColor: '#be123c', squashX: 1.13 });
    const angle = t * 1.8;
    const px = x + Math.cos(angle) * 108, py = y + Math.sin(angle) * 35;
    line(ctx, [[px - Math.cos(angle) * 18, py - Math.sin(angle) * 9], [px, py]], color, 2);
    drawPlayer(ctx, px, py, 26, { tilt: angle + Math.PI / 2, accent: color }, appearance);
    for (let i = 0; i < 5; i++) {
      const a = -t + i * TAU / 5;
      ctx.fillStyle = color;
      ctx.fillRect(x + Math.cos(a) * 77, y + Math.sin(a) * 28, 5, 3);
    }
  }
}

export function drawResultScene(ctx, scene, elapsed, appearance, reducedMotion = false) {
  const t = reducedMotion ? .7 : elapsed;
  ctx.save();
  ctx.clearRect(0, 0, 320, 145);
  ctx.fillStyle = '#050d17';
  ctx.fillRect(0, 0, 320, 145);
  particles(ctx, t, scene.color);
  if (scene.id === 'run') runner(ctx, t, appearance, scene.color);
  else if (scene.id === 'flight') flight(ctx, t, appearance, scene.color);
  else if (scene.id === 'show') liveShow(ctx, t, appearance, scene.color);
  else boss(ctx, t, appearance, scene.color, scene.id === 'victory');
  ctx.restore();
}
