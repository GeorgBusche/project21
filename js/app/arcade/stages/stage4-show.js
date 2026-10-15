const TAU = Math.PI * 2;
const clamp = (v) => Math.max(0, Math.min(1, v));

export const SONG_CUE_SECONDS = 0.9;
export const BOSS_HP_RADIUS = 78;

export const SONG_SHOWS = {
  napoli: {
    color: '#fb923c',
    title: 'VESUV / FORNO INFERNALE',
    move: 'LAVA-SALVEN // VESUV-SCHNEISE',
    label: 'FORNO'
  },
  gas: {
    color: '#e2e8f0',
    title: 'REDLINE / TURBO OVERDRIVE',
    move: 'GANGWECHSEL // BOXENGASSE',
    label: 'TURBO'
  },
  tornado: {
    color: '#7dd3fc',
    title: 'STORM / BIERZYKLON',
    move: 'GEGENSTROM // FLUTWELLEN',
    label: 'STORM'
  },
  wolle: {
    color: '#fbbf24',
    title: 'STADION / LICHTDIRIGENT',
    move: 'LICHTJAGD // LA-OLA-ECHO',
    label: 'LIVE'
  },
  sonne: {
    color: '#ff6b35',
    title: 'SONNE / REAKTOR-MELTDOWN',
    move: 'FEUERZAEHLER // RING-INFERNO',
    label: 'SUN'
  }
};

function line(ctx, points, color, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

function label(ctx, value, x, y, size, color) {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

export function drawReactorOpening(ctx, { t, beat = {}, hazards = [], angle = 0 }) {
  const pulse = Math.max(0, 1 - (beat.beatPhase ?? 1) * 4);
  ctx.save();
  ctx.fillStyle = '#030a13';
  ctx.fillRect(0, 0, 360, 445);
  ctx.strokeStyle = '#122b3a';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 360; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 115);
    ctx.lineTo(x, 430);
    ctx.stroke();
  }
  for (let y = 115; y < 445; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(360, y);
    ctx.stroke();
  }
  ctx.translate(180, 255);
  for (let i = 0; i < 48; i++) {
    const a = (i * TAU) / 48;
    const r = i % 4 ? 163 : 158;
    line(
      ctx,
      [
        [Math.cos(a) * r, Math.sin(a) * r],
        [Math.cos(a) * 168, Math.sin(a) * 168]
      ],
      '#426475',
      1
    );
  }
  ctx.save();
  ctx.rotate(t * 0.4);
  ctx.strokeStyle = '#91c4d8';
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 120]);
  ctx.beginPath();
  ctx.arc(0, 0, 155, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  for (const h of hazards) {
    if (!h.reactor || t < h.tellAt || t >= h.liveAt) continue;
    const a = h.center ?? h.a0;
    const x = Math.cos(a) * 136;
    const y = Math.sin(a) * 136;
    const s = 18 + (h.liveAt - t) * 8;
    ctx.strokeStyle = '#9bc8d9';
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      line(
        ctx,
        [
          [x + side * s, y - 7],
          [x + side * s, y - s],
          [x + side * (s - 7), y - s]
        ],
        '#9bc8d9'
      );
      line(
        ctx,
        [
          [x + side * s, y + 7],
          [x + side * s, y + s],
          [x + side * (s - 7), y + s]
        ],
        '#9bc8d9'
      );
    }
  }
  const x = Math.cos(angle) * 180;
  const y = Math.sin(angle) * 180;
  ctx.fillStyle = '#83a8b9';
  ctx.fillRect(x - 2, y - 2, 4, 4);
  ctx.restore();
  ctx.save();
  label(ctx, 'CONTAINMENT // AUTONOMOUS DEFENCE', 180, 66, 8, '#7394a4');
  label(
    ctx,
    `SCAN ${(Math.floor(t * 8) % 100).toString().padStart(2, '0')} / TARGET LOCK`,
    180,
    420,
    9,
    '#98bfcd'
  );
  ctx.fillStyle = '#7cd5eb';
  ctx.globalAlpha = 0.2 + pulse * 0.4;
  ctx.fillRect(12, 105, 3, 290);
  ctx.fillRect(345, 105, 3, 290);
  ctx.restore();
}

function cog(ctx, radius, teeth, rotation, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let i = 0; i <= teeth * 4; i++) {
    const a = (i / (teeth * 4)) * TAU + rotation;
    const r = radius + (i % 4 < 2 ? 3 : -3);
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
}

export function drawConcertStage(ctx, { t, beat = {}, intensity = 0, alpha = 1 }) {
  const rise = clamp(intensity);
  const pulse = Math.max(0, 1 - (beat.beatPhase ?? 1) * 4);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#08060c';
  ctx.fillRect(12, 112, 336, 300);
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 16; col++) {
      const signal = Math.sin(col * 0.6 + t * 2) + Math.cos(row * 0.8 - t * 3);
      ctx.fillStyle = signal > 0.8 - rise * 0.5 ? '#8c3426' : '#24121c';
      ctx.fillRect(24 + col * 20, 119 + row * 27, 16, 21);
      if (signal > 1.6) {
        ctx.fillStyle = '#df8354';
        ctx.fillRect(24 + col * 20, 119 + row * 27, 16, 2 + pulse * 4);
      }
    }
  }
  for (const x of [8, 336]) {
    ctx.fillStyle = '#14131d';
    ctx.fillRect(x, 109, 16, 300);
    ctx.strokeStyle = '#70616b';
    ctx.lineWidth = 1;
    for (let y = 112; y < 400; y += 24) {
      line(
        ctx,
        [
          [x, y],
          [x + 16, y + 24],
          [x, y + 24],
          [x + 16, y]
        ],
        '#70616b'
      );
    }
    for (let y = 155; y < 380; y += 50) {
      ctx.fillStyle = '#08080e';
      ctx.fillRect(x - 5, y, 26, 38);
      for (const dy of [10, 27]) {
        ctx.beginPath();
        ctx.arc(x + 8, y + dy, 8 + pulse, 0, TAU);
        ctx.fillStyle = '#302632';
        ctx.fill();
        ctx.strokeStyle = '#9b5e40';
        ctx.stroke();
      }
    }
  }
  line(
    ctx,
    [
      [8, 116],
      [352, 116],
      [352, 101],
      [8, 101],
      [8, 116]
    ],
    '#a18478',
    2
  );
  for (let i = 0; i < 8; i++) {
    const x = 25 + i * 44;
    const aim = Math.sin(t * (0.6 + rise) + i * 1.7) * (40 + rise * 80);
    ctx.fillStyle = '#27232e';
    ctx.fillRect(x - 7, 106, 14, 13);
    ctx.fillStyle = '#ffe4b3';
    ctx.fillRect(x - 4, 117, 8, 3);
    ctx.globalAlpha = alpha * (0.04 + rise * 0.045 + pulse * 0.025);
    ctx.beginPath();
    ctx.moveTo(x, 120);
    ctx.lineTo(x + aim - 28, 422);
    ctx.lineTo(x + aim + 28, 422);
    ctx.fill();
    ctx.globalAlpha = alpha;
  }
  ctx.fillStyle = '#100c13';
  ctx.fillRect(16, 407, 328, 15);
  line(
    ctx,
    [
      [16, 407],
      [344, 407]
    ],
    '#da8855',
    2
  );
  // Edge-mounted jets stay outside the playable rails.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = side < 0 ? 24 : 336;
      const y = 215 + i * 77;
      const ignition = Math.max(0, Math.sin(t * 2.8 - i * 1.1 + side));
      const height = -(12 + (26 + rise * 70) * ignition * (0.5 + pulse * 0.5));
      jet(ctx, x, y, height, '#e76534', t + i);
    }
  }
  ctx.restore();
}

export function drawBossVictory(ctx, t, engine, beat = {}) {
  ctx.save();
  ctx.fillStyle = '#02040d';
  ctx.fillRect(0, 0, 360, 600);
  if (t < 0.85) {
    const p = clamp(t / 0.85);
    ctx.save();
    ctx.translate(180, 255);
    ctx.rotate(p * p * 2);
    ctx.scale(1 - p * 0.94, 1 - p * 0.94);
    ctx.translate(-180, -255);
    drawTitan(ctx, engine, { t: 18 + t, beat, energy: 1, recoil: p, size: 88 });
    ctx.restore();
    for (let i = 0; i < 32; i++) {
      const a = (i * TAU) / 32 + p * 3;
      const r = 180 * (1 - p) + 10;
      line(
        ctx,
        [
          [180 + Math.cos(a) * r, 255 + Math.sin(a) * r],
          [180 + Math.cos(a) * (r + 24), 255 + Math.sin(a) * (r + 24)]
        ],
        i % 2 ? '#ff873d' : '#66eaff',
        2
      );
    }
    label(ctx, 'REAKTOR // KOLLAPS', 180, 450, 15, '#ffb26a');
  } else {
    const burst = t - 0.85;
    for (let i = 0; i < 14; i++) {
      const angle = (i * TAU) / 14;
      const radius = 25 + burst * (95 + (i % 3) * 28);
      ctx.save();
      ctx.translate(
        180 + Math.cos(angle) * radius,
        255 + Math.sin(angle) * radius + burst * burst * 22
      );
      ctx.rotate(angle + burst * (i % 2 ? 2 : -2));
      ctx.fillStyle = '#302738';
      ctx.strokeStyle = i % 2 ? '#ffab5c' : '#6cefff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, -8);
      ctx.lineTo(9, -12);
      ctx.lineTo(16, 4);
      ctx.lineTo(1, 10);
      ctx.lineTo(-9, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    for (let wave = 0; wave < 3; wave++) {
      const p = clamp((burst - wave * 0.16) / 1.4);
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = wave % 2 ? '#ffc266' : '#6cefff';
      ctx.lineWidth = 8 * (1 - p) + 1;
      ctx.beginPath();
      ctx.arc(180, 255, 8 + p * 480, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 66; i++) {
      const a = i * 2.39996;
      const speed = 45 + (i % 9) * 13;
      const x = 180 + Math.cos(a) * burst * speed;
      const y = 255 + Math.sin(a) * burst * speed + burst * burst * 14;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + burst * (i % 2 ? 3 : -3));
      ctx.fillStyle = ['#ffe5b2', '#59e5ff', '#ff7b45'][i % 3];
      ctx.fillRect(-3, -5, 6, 10);
      ctx.restore();
    }
    if (burst < 0.2) {
      ctx.globalAlpha = (1 - burst / 0.2) * 0.85;
      ctx.fillStyle = '#fff4df';
      ctx.fillRect(0, 0, 360, 600);
      ctx.globalAlpha = 1;
    }
    const arrival = clamp((burst - 0.6) / 0.8);
    if (arrival > 0) {
      const y = 650 - 350 * (1 - (1 - arrival) ** 3);
      ctx.save();
      ctx.translate(180, y);
      cog(ctx, 53, 16, t * 0.3, '#674d29', 2);
      cog(ctx, 60, 16, -t * 0.2, '#174955', 1);
      ctx.restore();
      for (const x of [22, 338]) {
        jet(ctx, x, 575, -55 - Math.max(0, Math.sin(t * 3 + x)) * 75, '#ffaf45', t);
      }
      for (let i = 8; i > 0; i--) {
        ctx.globalAlpha = (1 - i / 9) * arrival * 0.5;
        ctx.fillStyle = '#36d9ff';
        ctx.fillRect(180 - 12 + i, y + i * 15, 24 - i * 2, 12);
      }
      ctx.globalAlpha = 1;
      engine.drawPlayer(ctx, 180, y, 56, {
        mode: 'ship',
        thrust: 1,
        beatPhase: beat.beatPhase,
        accent: '#fbbf24'
      });
      const crownY = y - 60 + Math.sin(t * 3) * 3;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(154, crownY + 14);
      ctx.lineTo(149, crownY - 7);
      ctx.lineTo(166, crownY);
      ctx.lineTo(180, crownY - 16);
      ctx.lineTo(194, crownY);
      ctx.lineTo(211, crownY - 7);
      ctx.lineTo(206, crownY + 14);
      ctx.closePath();
      ctx.fill();
      label(ctx, 'TRESEN-TITAN', 180, 151, 28, '#fff1d2');
      label(ctx, 'ZERLEGT.', 180, 188, 38, '#65eaff');
      label(ctx, '22 / 22 // EXORZISMUS KOMPLETT', 180, 390, 12, '#ffc36a');
      label(ctx, 'DEIN ABEND. DEIN THRON.', 180, 420, 14, '#f5f5ff');
    }
  }
  ctx.restore();
}

function jet(ctx, x, y, height, color, t) {
  ctx.fillStyle = '#161724';
  ctx.fillRect(x - 7, y - 5, 14, 10);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.quadraticCurveTo(x - 12, y + height * 0.6, x + Math.sin(t * 29) * 4, y + height);
  ctx.quadraticCurveTo(x + 12, y + height * 0.5, x + 6, y);
  ctx.fill();
  ctx.fillStyle = '#fff2b4';
  ctx.beginPath();
  ctx.moveTo(x - 2, y);
  ctx.lineTo(x, y + height * 0.7);
  ctx.lineTo(x + 2, y);
  ctx.fill();
}

function performanceGear(ctx, phase, t, pulse, color, recoil, activation) {
  const hit = pulse * 0.35 + recoil * 0.65;
  if (phase === 0) {
    // Furnace doors and exhaust connect the host to the volcano.
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#33202a';
      ctx.fillRect(side * 50 - 7, -19, 14, 31);
      ctx.strokeStyle = '#fb923c';
      ctx.strokeRect(side * 50 - 7, -19, 14, 31);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(255,118,54,${0.28 + hit * 0.5})`;
        ctx.fillRect(side * 50 - 4, -13 + i * 8, 8, 3);
      }
      jet(ctx, side * 55, -20, -12 - hit * 22, color, t + side);
    }
  } else if (phase === 1) {
    for (const side of [-1, 1]) {
      jet(ctx, side * 51, 24, 12 + hit * 27, '#f87171', t + side);
      ctx.save();
      ctx.translate(side * 55, -19);
      ctx.rotate(t * 6 * side);
      cog(ctx, 11, 8, 0, '#9ca3af', 2);
      ctx.restore();
    }
  } else if (phase === 2) {
    for (let i = 0; i < 4; i++) {
      const a = t * 2 + (i * Math.PI) / 2;
      ctx.strokeStyle = i % 2 ? '#b9edff' : '#386bba';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 59 + Math.sin(t * 2 + i) * 4, a, a + 0.9);
      ctx.stroke();
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(Math.cos(a) * 62 - 1, Math.sin(a) * 62 - 1, 3, 3);
    }
  } else if (phase === 3) {
    const swing = Math.sin(t * 4) * 0.3 + hit * 0.4;
    line(
      ctx,
      [
        [-42, 12],
        [-64, -5],
        [-51 + swing * 22, -37]
      ],
      '#f8d79b',
      4
    );
    line(
      ctx,
      [
        [-51 + swing * 22, -37],
        [-36 + swing * 26, -65]
      ],
      '#fff1bd',
      2
    );
    line(
      ctx,
      [
        [43, 10],
        [60, -2],
        [54, -25]
      ],
      '#f8d79b',
      4
    );
    ctx.fillStyle = '#b0b9cd';
    ctx.beginPath();
    ctx.arc(54, -28, 6, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 3; i++)
      line(
        ctx,
        [
          [50, -30 + i * 2],
          [58, -30 + i * 2]
        ],
        '#22293b',
        1
      );
  } else if (phase === 4) {
    for (const side of [-1, 1]) {
      jet(ctx, side * 54, -4, -23 - hit * 27, '#fb492c', t + side);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 ? '#ffe3a1' : '#bf342a';
        ctx.fillRect(side * 49 - 5, 12 + i * 7, 10, 4);
      }
    }
  }
}

// The same living reactor survives the cinematic handoff; only its performance changes.
export function drawTitan(
  ctx,
  engine,
  {
    x = 180,
    y = 255,
    size = 88,
    t = 0,
    beat = {},
    energy = 0,
    color = '#fbbf24',
    activation = 0,
    recoil = 0,
    phase = -1
  } = {}
) {
  const pulse = Math.max(0, 1 - (beat.beatPhase ?? 1) * 4);
  const pump = 1 + pulse * 0.025 + recoil * 0.035;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((size / 88) * pump, (size / 88) * pump);
  cog(ctx, 71, 24, t * (0.75 + energy), '#7d2635', 5);
  cog(ctx, 71, 24, t * (0.75 + energy), color, 1.5);
  cog(ctx, 58, 14, -t * 0.9, '#ef4352', 2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t * 0.35;
    line(
      ctx,
      [
        [Math.cos(a) * 57, Math.sin(a) * 57],
        [Math.cos(a) * (67 + pulse * 3), Math.sin(a) * (67 + pulse * 3)]
      ],
      color,
      1.5
    );
  }
  // Articulated forearms cue the deck before the sample actually starts.
  const reach = Math.sin(clamp(activation) * Math.PI);
  for (const side of [-1, 1]) {
    const elbowX = side * (57 + reach * 7);
    const elbowY = 15 - reach * 18;
    const handX = side * (45 - reach * 16);
    const handY = 48 + reach * 8;
    const arm = [
      [side * 40, 7],
      [elbowX, elbowY],
      [handX, handY]
    ];
    line(ctx, arm, '#05050a', 9);
    line(ctx, arm, '#6c3441', 4);
    ctx.fillStyle = color;
    ctx.fillRect(handX - 4, handY - 3, 8, 6);
  }
  performanceGear(ctx, phase, t, pulse, color, recoil, activation);
  ctx.save();
  ctx.rotate(Math.sin(t * 2.5) * (phase === 2 ? 0.075 : 0.025) + recoil * Math.sin(t * 65) * 0.055);
  engine.drawFiech(ctx, 0, 0, 88, {
    beatPhase: beat.beatPhase,
    bassEnergy: energy * 0.7,
    action: activation > 0 ? 'laser' : recoil > 0.2 ? 'slam' : 'laugh',
    eyeColors: ['#ff2346', '#67edff'],
    bodyColor: '#c51f39',
    lookAtX: Math.sin(t * 0.7) * 80,
    lookAtY: 90
  });
  line(
    ctx,
    [
      [-14, -11],
      [14, 17]
    ],
    '#661020',
    7
  );
  line(
    ctx,
    [
      [14, -11],
      [-14, 17]
    ],
    '#661020',
    7
  );
  line(
    ctx,
    [
      [-14, -11],
      [14, 17]
    ],
    '#ff7547',
    3
  );
  line(
    ctx,
    [
      [14, -11],
      [-14, 17]
    ],
    '#ff7547',
    3
  );
  for (const side of [-1, 1]) {
    line(
      ctx,
      [
        [side * 27, -53],
        [side * 30, -45],
        [side * 36, -39]
      ],
      side < 0 ? '#ff3154' : '#67edff',
      1
    );
  }
  ctx.restore();
  ctx.restore();
}

export function drawSongDeck(
  ctx,
  { id, t, beat, cue = 1, playing = false, progress = 0, unavailable = false }
) {
  const show = SONG_SHOWS[id];
  const col = show.color;
  const press = Math.exp(-Math.abs(cue - 1) * 14);
  ctx.save();
  ctx.translate(180, 328);
  ctx.fillStyle = '#080b14';
  ctx.fillRect(-57, -11, 114, 25);
  ctx.strokeStyle = '#56313d';
  ctx.strokeRect(-57, -11, 114, 25);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 34, 0);
    ctx.scale(1, 0.38);
    ctx.fillStyle = '#171d2e';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 18, t * (playing ? side * 5 : 0), t * (playing ? side * 5 : 0) + 4.4);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = playing ? '#e8ffde' : col;
  ctx.fillRect(-7, -5 + press * 2, 14, 7);
  for (let i = 0; i < 8; i++) {
    const h = playing
      ? 2 + Math.abs(Math.sin(t * 12 + i * 1.7)) * (4 + (1 - (beat.beatPhase ?? 1)) * 3)
      : 2;
    ctx.fillStyle = i % 3 ? col : '#fef3c7';
    ctx.fillRect(-52 + i * 14, 12 - h, 5, h);
  }
  if (cue < 1) {
    const u = clamp(cue * 1.7);
    ctx.save();
    ctx.translate(-80 + 114 * u, -78 * (1 - u));
    ctx.rotate((1 - u) * -1.7 + t);
    ctx.scale(1, 0.55 + (1 - u) * 0.45);
    ctx.fillStyle = '#101521';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // This status strip lives above the rails, never on a dodge target.
  ctx.fillStyle = '#04060de6';
  ctx.fillRect(27, 82, 306, 30);
  label(
    ctx,
    unavailable
      ? `SAMPLE OFFLINE // ${show.label}`
      : cue < 1
        ? `FIECH LAEDT // ${show.label}`
        : playing
          ? `ON AIR // ${show.title}`
          : `AFTERGLOW // ${show.label}`,
    180,
    94,
    9,
    col
  );
  label(ctx, show.move, 180, 106, 7, '#c4c6cf');
  ctx.fillStyle = '#262232';
  ctx.fillRect(28, 112, 304, 2);
  ctx.fillStyle = col;
  ctx.fillRect(28, 112, 304 * (cue < 1 ? cue : clamp(progress)), 2);
}

export function drawRitualFloor(ctx, { t, beat, entrance = 1, color = '#fbbf24' }) {
  ctx.save();
  ctx.translate(180, 255);
  const pulse = Math.max(0, 1 - (beat.beatPhase ?? 1) * 3);
  cog(ctx, 165, 32, t * 0.035, '#6f2733', 1);
  cog(ctx, 157, 22, -t * 0.05, '#3e2332', 1);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU;
    const r = 161;
    ctx.save();
    ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
    ctx.rotate(a);
    ctx.globalAlpha = 0.35 + pulse * 0.3;
    ctx.strokeStyle = color;
    ctx.strokeRect(-2, -3, 4, 6);
    ctx.restore();
  }
  if (entrance < 1) {
    ctx.globalAlpha = (1 - entrance) * 0.6;
    cog(ctx, 76 + entrance * 90, 24, -entrance, '#67edff', 2);
  }
  ctx.restore();
}
