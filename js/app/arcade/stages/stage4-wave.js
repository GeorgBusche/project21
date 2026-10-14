import { clamp, createBeatSource, drawFiech } from './stage-utils.js';

const DURATION = 15;
const PX_PER_BEAT = 120;
const BLOCK_W = 46;

// Stage 4: Geometry-Dash-Wave. Halten = 45° hoch, loslassen = 45° runter. Das Fiech verengt im Beat den Korridor.
export function createStage4() {
  let engine;
  let tick;
  let t = 0;
  let beat = { bpm: 105, beatIndex: 0, beatPhase: 1, isBeat: false };
  let blocks = [];
  let trail = [];
  let lastCenter = 0;
  const player = { x: 90, y: 0 };

  return {
    color: '#06b6d4',
    init(e) {
      engine = e;
      tick = createBeatSource();
      player.y = engine.H / 2;
      lastCenter = engine.H / 2;
    },
    progress: () => t / DURATION,
    onTouch() {},
    update(dt, beatInfo) {
      beat = tick(beatInfo, dt);
      t += dt;
      const progress = t / DURATION;
      const { W, H } = engine;
      const speed = (beat.bpm / 60) * PX_PER_BEAT;

      if (beat.isBeat) {
        // Korridor-Mitte wandert zickzack, Öffnung schrumpft
        const open = 250 - progress * 90;
        const center = clamp(lastCenter + (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 60), 80 + open / 2, H - 80 - open / 2);
        lastCenter = center;
        blocks.push({ x: W + 10, top: center - open / 2, bottom: center + open / 2 });
      }

      // Wave: exakt 45°, Steigung = Scrollgeschwindigkeit
      player.y += (engine.held ? -1 : 1) * speed * dt;
      trail.push({ x: player.x, y: player.y });
      for (const p of trail) p.x -= speed * dt;
      trail = trail.filter((p) => p.x > player.x - 120);

      for (const b of blocks) b.x -= speed * dt;
      blocks = blocks.filter((b) => b.x > -BLOCK_W - 10);

      let crashed = player.y < 6 || player.y > H - 6;
      for (const b of blocks) {
        if (player.x + 6 > b.x && player.x - 6 < b.x + BLOCK_W && (player.y - 6 < b.top || player.y + 6 > b.bottom)) crashed = true;
      }
      if (crashed) {
        player.y = clamp(player.y, 20, H - 20);
        // Zurück in die Mitte des nächsten Korridors, damit der Respawn nicht sofort wieder trifft
        const near = blocks.find((b) => b.x + BLOCK_W > player.x - 20);
        engine.hit();
        if (near) player.y = (near.top + near.bottom) / 2;
      }
      if (t >= DURATION) engine.complete();
    },
    render(ctx) {
      const { W, H } = engine;
      ctx.fillStyle = '#0e7490';
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2;
      for (const b of blocks) {
        ctx.fillRect(b.x, 0, BLOCK_W, b.top);
        ctx.strokeRect(b.x, -2, BLOCK_W, b.top + 2);
        ctx.fillRect(b.x, b.bottom, BLOCK_W, H - b.bottom);
        ctx.strokeRect(b.x, b.bottom, BLOCK_W, H - b.bottom + 2);
      }
      if (trail.length > 1) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      engine.drawPlayer(ctx, player.x, player.y, 22, {
        mode: 'wave',
        tilt: engine.held ? -Math.PI / 4 : Math.PI / 4,
        thrust: 0.6,
        beatPhase: beat.beatPhase,
        accent: '#06b6d4'
      });
      ctx.shadowBlur = 0;
      // Fiech sitzt rechts und "schiebt" die Blöcke nach
      drawFiech(ctx, W - 34, H / 2 + Math.sin(t * 3) * 30, 52, 52, beat.beatPhase, 'angry');
      ctx.strokeStyle = `rgba(6,182,212,${Math.max(0, 1 - beat.beatPhase * 4) * 0.7})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, W - 4, H - 4);
    }
  };
}
