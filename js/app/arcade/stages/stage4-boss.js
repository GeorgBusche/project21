import { createBeatSource, drawFiech, moveX } from './stage-utils.js';

const MAX_HP = 12;
const LANES = 5;

// Stage 4: Final Boss Overdrive. Das große Fiech feuert im Beat Projektile in Bahnen, der Spieler feuert im Beat zurück.
export function createStage4() {
  let engine;
  let tick;
  let t = 0;
  let hp = MAX_HP;
  let hurt = 0;
  let beat = { bpm: 105, beatIndex: 0, beatPhase: 1, isBeat: false };
  let bullets = [];
  let shots = [];
  const player = { x: 180 };
  const laneX = (i) => (engine.W / LANES) * (i + 0.5);
  const playerY = () => engine.H - 70;
  const bossX = () => engine.W / 2 + Math.sin(t * 0.9) * 90;

  return {
    color: '#ef4444',
    init(e) {
      engine = e;
      tick = createBeatSource();
      player.x = engine.W / 2;
    },
    progress: () => 1 - hp / MAX_HP,
    onTouch() {},
    update(dt, beatInfo) {
      beat = tick(beatInfo, dt);
      t += dt;
      const progress = 1 - hp / MAX_HP;
      const { W, H } = engine;
      player.x = moveX(engine, player.x, 290, dt, 20, W - 20);
      hurt = Math.max(0, hurt - dt * 4);

      if (beat.isBeat) {
        shots.push({ x: player.x, y: playerY() - 14 });
        engine.beep(988, 'triangle', 0.03, 0.02);
        // Immer mindestens 2 freie Bahnen; mit sinkender HP mehr gleichzeitige Projektile
        const count = progress > 0.6 ? 3 : progress > 0.25 ? 2 : 1;
        const lanes = [...Array(LANES).keys()].sort(() => Math.random() - 0.5).slice(0, count);
        for (const l of lanes) bullets.push({ x: laneX(l), y: 150 });
      }

      const bossSpeed = 190 + progress * 120;
      for (const b of bullets) {
        b.y += bossSpeed * dt;
        if (Math.abs(b.x - player.x) < 20 && Math.abs(b.y - playerY()) < 20) {
          b.dead = true;
          engine.hit();
        }
      }
      const bx = bossX();
      for (const s of shots) {
        s.y -= 560 * dt;
        if (!s.dead && s.y < 190 && Math.abs(s.x - bx) < 58) {
          s.dead = true;
          hp = Math.max(0, hp - 1);
          hurt = 1;
          engine.addScore(50);
          engine.shake(0.08);
        }
      }
      bullets = bullets.filter((b) => !b.dead && b.y < H + 20);
      shots = shots.filter((s) => !s.dead && s.y > -10);
      if (hp <= 0) engine.complete();
    },
    render(ctx) {
      const { W } = engine;
      ctx.strokeStyle = 'rgba(239,68,68,0.12)';
      ctx.lineWidth = 1;
      for (let i = 0; i < LANES; i++) {
        ctx.beginPath();
        ctx.moveTo(laneX(i), 150);
        ctx.lineTo(laneX(i), engine.H);
        ctx.stroke();
      }
      // HP-Balken
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(40, 18, W - 80, 10);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(40, 18, (W - 80) * (hp / MAX_HP), 10);
      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(40, 18, W - 80, 10);

      drawFiech(ctx, bossX(), 95, 110, 110, beat.beatPhase, hurt > 0.4 ? 'hurt' : 'angry');
      ctx.fillStyle = '#fb923c';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 0;
      for (const b of bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fecaca';
      for (const s of shots) ctx.fillRect(s.x - 2, s.y - 8, 4, 12);
      const py = playerY();
      ctx.shadowBlur = 0;
      engine.drawPlayer(ctx, player.x, py, 32, { mode: 'ship', thrust: 0.6, beatPhase: beat.beatPhase, accent: '#ef4444' });
      ctx.strokeStyle = `rgba(239,68,68,${Math.max(0, 1 - beat.beatPhase * 4) * 0.8})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, W - 4, engine.H - 4);
    }
  };
}
