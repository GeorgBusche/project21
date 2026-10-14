import { CONTENT } from '../../../content.js';
import { clamp, createBeatSource } from './stage-utils.js';
import { generateWaves, WAVE_INTRO } from './stage3-waves.js';

// Stage 3: LIVE-SHOW (Rammstein-Look). Fiech steht als Pyro-Meister vor dem Rammstein-Logo und feuert im Beat
// Flammen und Minen auf 3, im Finale auf 5 Spuren. Spur antippen / ziehen oder Pfeiltasten (A/D).
// Münzen (g) werden automatisch zufällig zwischen den Reihen gesetzt. Flamme = einsammeln · Mine = ausweichen · Sunbeam = Lampe flackert, dann Lichtstrahl
// Fiech-Sturz = Fiech zeigt die Spur, schießt dann runter · Bühne, Logo, Jets & Publikum pulsieren im Beat.

// ---- HIER ANPASSEN -------------------------------------------------------
// Die Wellen (Spuren, Reihen, Tempo, Laser-/Sturz-Häufigkeit) stehen in stage3-waves.js und werden bei jedem
// Start zufällig erzeugt. Zeichen je Reihe: . sicher · v Mine · L Sunbeam · F Fiech-Sturz. Jede Reihe ist garantiert
// schadenfrei erreichbar. Münzen (g) werden zufällig zwischen den Reihen gesetzt.
let WAVES = generateWaves();
const LASER_WARN = 3; // Beats Vorwarnung (2 Beats Blinken, letzter Beat: Aufladen)
const LASER_ACTIVE = 0.6; // Beats Strahl aktiv
const DIVE_FALL = 3.2; // Beats vom Ankündigen bis Fiech unten einschlägt
const DIVE_RISE = 0.9; // Beats, bis Fiech wieder oben ist
// Farbe je Welle (RGB): wird heißer Richtung Finale
const WAVE_COLORS = ['255,90,31', '255,60,30', '255,40,60', '255,150,70', '255,214,107'];
// ---------------------------------------------------------------------------

let NL = 3; // aktuelle (animierte) Spurzahl
const TOP_Y = 80; // hier werden Objekte "abgefeuert"
const PY = 495; // Spieler-Linie
const FIECH_Y = 64;
const FIECH_S = 68;
const W = 360;
const H = 600;
// Die Bahn behält ihre Gesamtbreite, die Spuren werden schmaler. l = Spur relativ zur Mitte (0 = Mitte).
const laneW = (y) => (180 + 180 * ((y - TOP_Y) / (PY - TOP_Y))) / NL;
const laneAt = (l, y) => W / 2 + l * laneW(y);

// Bühnen-Flammen aus der SUDO-Rammstein-Bühne
const FLAME_D = 'M-7 0C-11-26-3-46-6-82C4-56 4-30 0-12C5-36 10-48 12-72C18-40 12-14 7 0Z';
const FLAME_CORE_D = 'M-3 0C-5-18-1-30-2-50C3-30 4-16 4 0Z';
const LOGO_D =
  'M359 77H494V115H398V193H359ZM533 77H666V231H820V365H782V269H628V115H533ZM820 404V538H666V692H533V654H628V500H782V404ZM359 577H398V654H494V692H359ZM206 231H551V383H513V269H244V365H206ZM206 404H244V500H359V383H398V455L426 538H206ZM513 383H551L603 538H426L398 458 413 455 445 500H551Z';
let logoPath;
let flamePath;
let flameCore;

function paths() {
  if (!flamePath) {
    logoPath = new Path2D(LOGO_D);
    flamePath = new Path2D(FLAME_D);
    flameCore = new Path2D(FLAME_CORE_D);
  }
}
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function offscreen(w, h, scale) {
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = h * scale;
  const g = c.getContext('2d');
  g.scale(scale, scale);
  return { c, g };
}

function trussH(g, x, y, w, h) {
  g.fillStyle = '#0d0606';
  g.fillRect(x, y, w, h);
  g.strokeStyle = '#5b1d15';
  g.lineWidth = 1.8;
  g.strokeRect(x, y, w, h);
  g.strokeStyle = '#4a1812';
  g.lineWidth = 0.9;
  g.beginPath();
  let up = false;
  for (let xx = x; xx < x + w; xx += h) {
    g.moveTo(xx, up ? y : y + h);
    g.lineTo(xx + h, up ? y + h : y);
    up = !up;
  }
  g.stroke();
}

function placeLogo(g, cx, cy, size) {
  const k = size / 615;
  g.translate(cx - size / 2, cy - size / 2);
  g.scale(k, k);
  g.translate(-206, -77);
}

function crowdSprite(seed, y, r, step, phones) {
  const { c, g } = offscreen(W, 80, 2);
  const rnd = seeded(seed);
  g.fillStyle = '#0a0303';
  g.fillRect(0, y + r, W, 80);
  for (let x = -4; x < W + 8; x += step) {
    g.beginPath();
    g.arc(x + rnd() * 4, y + rnd() * 3, r, 0, Math.PI * 2);
    g.fill();
  }
  if (phones) {
    g.fillStyle = 'rgba(255,200,130,0.85)';
    for (let k = 0; k < 7; k++) g.fillRect(10 + rnd() * (W - 20), y - r - 6, 3, 4.4);
  }
  return c;
}

export function createStage3() {
  let engine;
  let tick;
  let beat = { bpm: 105, beatIndex: 0, beatPhase: 1, isBeat: false, bassEnergy: 0 };
  let bt;
  let objs;
  let lane;
  let laneMax;
  let lanesTarget;
  let px;
  let keyLeft;
  let keyRight;
  let combo;
  let rings;
  let flash;
  let banner;
  let wipe;
  let fiechX;
  let fiechPose;
  let fiechPoseT;
  let fx;
  let fy;
  let fs;
  let dive;
  let total;
  let done;
  let waveShown;
  let bg;
  let logoGlow;
  let crowdBack;
  let crowdFront;
  let jets;
  let kick;
  const text = CONTENT.declineGame.arcade.stage3;

  const yOf = (o) => TOP_Y + (PY - TOP_Y) * (1 - (o.arrive - bt) / o.fall);

  function reset() {
    WAVES = generateWaves();
    bt = 0;
    objs = [];
    WAVES.forEach((w, wi) => {
      w.rows.forEach((row, ri) => {
        const arrive = w.start + ri * w.gap;
        for (let l = 0; l < row.length; l++) {
          const c = row[l];
          if (c === '.') continue;
          const type = c === 'g' ? 'g' : c === 'v' ? 'v' : c === 'F' ? 'F' : 'L';
          const fall = type === 'L' ? LASER_WARN : type === 'F' ? DIVE_FALL : w.fall;
          objs.push({ wave: wi, lc: l - (row.length - 1) / 2, arrive, fall, type, done: false, fired: false, hitDone: false });
        }
      });
    });
    // Münzen liegen zufällig zwischen den Reihen und verraten nicht die sichere Spur
    const rnd = seeded(Math.floor(Math.random() * 1e9));
    WAVES.forEach((w, wi) => {
      for (let ri = 0; ri < w.rows.length - 1; ri++) {
        if (rnd() < 0.45) continue;
        const n = w.rows[ri].length;
        objs.push({ wave: wi, lc: Math.floor(rnd() * n) - (n - 1) / 2, arrive: w.start + (ri + 0.5) * w.gap, fall: w.fall, type: 'g', done: false, fired: false, hitDone: false });
      }
    });
    total = Math.max(...objs.map((o) => o.arrive)) + 2;
    lane = 0;
    NL = 3;
    lanesTarget = 3;
    laneMax = 1;
    keyLeft = false;
    keyRight = false;
    combo = 0;
    rings = [];
    flash = 0;
    banner = { text: '', sub: '', t: 0, t0: 1 };
    wipe = 0;
    fiechPose = 'hover';
    fiechPoseT = 0;
    done = false;
    waveShown = -1;
    kick = 0;
    dive = null;
    jets = [0, 0, 0, 0];
  }

  function buildBg() {
    const { c, g } = offscreen(W, H, 2);
    const wall = g.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#1d0707');
    wall.addColorStop(0.55, '#0b0303');
    wall.addColorStop(1, '#030101');
    g.fillStyle = wall;
    g.fillRect(0, 0, W, H);

    // roter Dunst hinter dem Logo
    const haze = g.createRadialGradient(W / 2, 260, 10, W / 2, 260, 230);
    haze.addColorStop(0, 'rgba(150,28,14,0.55)');
    haze.addColorStop(1, 'rgba(150,28,14,0)');
    g.fillStyle = haze;
    g.fillRect(0, 60, W, 400);


    // riesiges Rammstein-Logo
    g.save();
    placeLogo(g, W / 2, 262, 330);
    g.fillStyle = '#2a0908';
    g.fill(logoPath);
    g.strokeStyle = '#5b1d15';
    g.lineWidth = 4;
    g.stroke(logoPath);
    g.restore();

    // PA-Türme mit Lamellen und Neonkante
    for (const side of [0, 1]) {
      const x0 = side ? W - 30 : 0;
      g.fillStyle = '#2a0908';
      g.fillRect(x0, 96, 30, 330);
      g.strokeStyle = '#4d130e';
      g.lineWidth = 0.9;
      g.strokeRect(x0, 96, 30, 330);
      g.strokeStyle = 'rgba(255,60,35,0.3)';
      g.lineWidth = 0.6;
      g.beginPath();
      for (let y = 104; y < 426; y += 8) {
        g.moveTo(x0, y);
        g.lineTo(x0 + 30, y);
      }
      g.stroke();
      g.strokeStyle = '#ff3018';
      g.lineWidth = 1.6;
      g.beginPath();
      const ex = side ? x0 : x0 + 30;
      g.moveTo(ex, 96);
      g.lineTo(ex, 426);
      g.stroke();
    }

    // Traverse oben mit Lampenreihe
    trussH(g, -2, 0, W + 4, 56);
    g.fillStyle = '#0d0606';
    g.fillRect(0, 56, W, 6);
    g.fillStyle = '#ff3018';
    g.fillRect(0, 60, W, 2);
    g.fillStyle = '#ff3a20';
    for (let x = 14; x < W; x += 52) g.fillRect(x, 6, 3, 8);

    // Boden-Glut und Sunlamps unter den Spuren
    const glow = g.createRadialGradient(W / 2, 545, 4, W / 2, 545, 180);
    glow.addColorStop(0, 'rgba(255,58,30,0.5)');
    glow.addColorStop(1, 'rgba(255,58,30,0)');
    g.fillStyle = glow;
    g.fillRect(0, 440, W, 160);
    return c;
  }

  function buildLogoGlow() {
    const { c, g } = offscreen(W, 520, 2);
    g.save();
    placeLogo(g, W / 2, 262, 330);
    g.fillStyle = 'rgba(255,60,30,0.28)';
    g.fill(logoPath);
    g.strokeStyle = '#ff4a2a';
    g.lineWidth = 3;
    g.stroke(logoPath);
    g.restore();
    return c;
  }

  function setLane(l) {
    const nl = clamp(l, -laneMax, laneMax);
    if (nl !== lane) {
      lane = nl;
      engine.beep(660 + (nl + 2) * 90, 'square', 0.03, 0.012);
    }
  }

  function setPose(p, t) {
    fiechPose = p;
    fiechPoseT = t;
  }

  function hurt() {
    combo = 0;
    flash = 1;
    setPose('laugh', 0.9);
    engine.hit();
  }

  return {
    color: '#ff3018',
    init(e) {
      engine = e;
      tick = createBeatSource();
      reset();
      px = laneAt(0, PY);
      fiechX = W / 2;
      fx = W / 2;
      fy = FIECH_Y;
      fs = FIECH_S;
      bg = null;
      logoGlow = null;
    },
    progress: () => clamp(bt / total, 0, 1),
    onTouch(ev) {
      if (ev.type === 'down' || (ev.type === 'move' && engine.pointer.down)) setLane(Math.round(((ev.x / engine.W) * W - W / 2) / laneW(PY)));
    },
    update(dt, beatInfo) {
      beat = tick(beatInfo, dt);
      bt += dt * (beat.bpm / 60);
      const { keys } = engine;
      const l = keys.has('arrowleft') || keys.has('a');
      const r = keys.has('arrowright') || keys.has('d');
      if (l && !keyLeft) setLane(lane - 1);
      if (r && !keyRight) setLane(lane + 1);
      keyLeft = l;
      keyRight = r;
      // Spurzahl: kurz vor einer 5-Spur-Welle wird die Bahn umgebaut
      const wi = WAVES.findLastIndex((w) => bt >= w.start - w.fall - WAVE_INTRO);
      if (wi >= 0) lanesTarget = WAVES[wi].rows[0].length;
      laneMax = (lanesTarget - 1) / 2;
      NL += (lanesTarget - NL) * Math.min(1, dt * 4);
      if (Math.abs(lanesTarget - NL) < 0.01) NL = lanesTarget;
      px += (laneAt(lane, PY) - px) * Math.min(1, dt * 26);

      // Pyro im Beat: jede Zählzeit eine Fontäne, jeder Takt-Anfang alle Jets
      if (beat.isBeat) {
        const bar = beat.beatIndex % 4 === 0;
        kick = 1;
        if (bar) jets = [1, 1, 1, 1];
        else jets[beat.beatIndex % 2 ? 0 : 3] = 0.55 + beat.bassEnergy * 0.4;
      }
      kick = Math.max(0, kick - dt * 5);
      for (let i = 0; i < 4; i++) jets[i] = Math.max(0, jets[i] - dt * 2.6);

      // Wellen-Übergang: Banner, Lichtwelle und Pyro-Salve in der leeren Pause, jede Zählzeit eine Salve
      for (let i = 0; i < WAVES.length; i++) {
        const w = WAVES[i];
        if (bt >= w.start - w.fall - WAVE_INTRO && waveShown < i) {
          waveShown = i;
          const sub = text.waveHints?.[i] ?? `WELLE ${i + 1} / ${WAVES.length}`;
          banner = { text: text.waves[i], sub, t: 2.6, t0: 2.6 };
          wipe = 1;
          jets = [1, 1, 1, 1];
          setPose('slam', 0.5);
          engine.beep(220, 'sawtooth', 0.18, 0.04);
          engine.beep(440, 'square', 0.3, 0.03);
        }
      }
      if (waveShown >= 0 && banner.t > 0 && beat.isBeat) {
        jets = [1, 1, 1, 1];
        flash = Math.max(flash, 0.35);
      }
      wipe = Math.max(0, wipe - dt * 1.4);
      if (banner.t > 0) banner.t -= dt;
      if (flash > 0) flash = Math.max(0, flash - dt * 3);
      if (fiechPoseT > 0) {
        fiechPoseT -= dt;
        if (fiechPoseT <= 0) fiechPose = 'hover';
      }
      for (const g of rings) g.t += dt;
      rings = rings.filter((g) => g.t < 0.35);

      let target = null;
      dive = null;
      for (const o of objs) {
        if (o.done) continue;
        if (o.type === 'F') {
          if (bt < o.arrive - o.fall) continue;
          if (!dive || o.arrive < dive.arrive) dive = o;
          if (!o.hitDone && Math.abs(bt - o.arrive) < 0.12 && o.lc === lane) {
            o.hitDone = true;
            hurt();
          }
          if (bt >= o.arrive + DIVE_RISE) o.done = true;
          continue;
        }
        if (!o.fired && bt >= o.arrive - o.fall) {
          o.fired = true;
          target = o;
        }
        if (o.type === 'L') {
          if (bt >= o.arrive && bt < o.arrive + LASER_ACTIVE && o.lc === lane) hurt();
          if (bt >= o.arrive + LASER_ACTIVE) o.done = true;
        } else if (bt >= o.arrive) {
          o.done = true;
          if (o.lc === lane) {
            if (o.type === 'g') {
              combo++;
              engine.addScore(10 * (1 + Math.floor(combo / 4)));
              rings.push({ x: px, t: 0 });
              engine.beep(880 + Math.min(combo, 12) * 40, 'triangle', 0.05, 0.03);
            } else hurt();
          } else if (o.type === 'g') combo = 0;
        }
      }

      if (dive) {
        // Fiech zeigt die Spur, stürzt auf die Spielerlinie und steigt wieder auf
        const p = (bt - (dive.arrive - dive.fall)) / dive.fall;
        const lx = dive.lc;
        if (bt < dive.arrive) {
          const u = p < 0.6 ? 0 : clamp((p - 0.6) / 0.4, 0, 1);
          fy = FIECH_Y + (PY - FIECH_Y) * u * u;
          fs = FIECH_S + 36 * u * u;
          fx = laneAt(lx, fy) + (u === 0 ? Math.sin(bt * 40) * 2.5 : 0);
          setPose(u === 0 ? 'laser' : 'slam', 0.12);
        } else {
          const v = clamp((bt - dive.arrive) / DIVE_RISE, 0, 1);
          fy = PY - (PY - FIECH_Y) * v * v;
          fs = FIECH_S + 36 * (1 - v * v);
          fx = laneAt(lx, fy);
          setPose('laugh', 0.12);
        }
        fiechX = fx;
      } else {
        if (target) {
          if (target.type === 'L') setPose('laser', LASER_WARN / (beat.bpm / 60));
          else if (fiechPose !== 'laugh') setPose('slam', 0.14);
          fiechX += (laneAt(target.lc, TOP_Y) - fiechX) * 0.6;
        }
        fiechX += ((px - W / 2) * 0.25 + W / 2 - fiechX) * Math.min(1, dt * 3);
        fx = fiechX;
        fy = FIECH_Y;
        fs = FIECH_S;
      }

      objs = objs.filter((o) => !o.done);
      if (!done && bt >= total) {
        done = true;
        engine.complete();
      }
    },
    render(ctx) {
      paths();
      if (!bg) {
        bg = buildBg();
        logoGlow = buildLogoGlow();
        crowdBack = crowdSprite(3, 30, 5.2, 7.4, true);
        crowdFront = crowdSprite(9, 44, 6.4, 7, false);
      }
      ctx.drawImage(bg, 0, 0, W, H);
      const pulse = Math.max(0, 1 - beat.beatPhase * 3);
      const wave = clamp(WAVES.findLastIndex((w) => bt >= w.start - w.fall - WAVE_INTRO), 0, WAVES.length - 1);
      const col = WAVE_COLORS[wave];

      // Logo leuchtet auf jeder Zählzeit
      ctx.globalAlpha = clamp(0.1 + pulse * 0.55 + beat.bassEnergy * 0.25, 0, 0.85);
      ctx.drawImage(logoGlow, 0, 0, W, 520);
      ctx.globalAlpha = 1;

      // Sunbeams: zwei Scheinwerfer von der Traverse schwenken im Takt
      ctx.fillStyle = `rgba(255,214,107,${0.05 + pulse * 0.06})`;
      for (const s of [-1, 1]) {
        const sw = Math.sin(bt * 0.8 + (s > 0 ? 1.6 : 0)) * 80;
        ctx.beginPath();
        ctx.moveTo(W / 2 + s * 120 - 5, 62);
        ctx.lineTo(W / 2 + s * 120 + 5, 62);
        ctx.lineTo(W / 2 + sw + 60, H - 90);
        ctx.lineTo(W / 2 + sw - 60, H - 90);
        ctx.fill();
      }

      // Spurtrenner als Lichtlinien, pulsieren im Beat
      ctx.strokeStyle = `rgba(${col},${0.18 + pulse * 0.5})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const nLines = Math.round(NL);
      const sp = NL / nLines;
      for (let k = 0; k <= nLines; k++) {
        ctx.moveTo(W / 2 + (k - nLines / 2) * laneW(TOP_Y) * sp, TOP_Y);
        ctx.lineTo(W / 2 + (k - nLines / 2) * laneW(PY + 62) * sp, PY + 62);
      }
      ctx.stroke();

      // Scheinwerfer-Lampen unter den Spuren
      const lampW = Math.min(34, laneW(PY + 62) * 0.8);
      for (let k = 0; k < nLines; k++) {
        const x = W / 2 + (k - (nLines - 1) / 2) * laneW(PY + 62) * sp;
        ctx.fillStyle = '#1b0807';
        ctx.fillRect(x - lampW / 2, PY + 58, lampW, 11);
        ctx.strokeStyle = '#5b1d15';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x - lampW / 2, PY + 58, lampW, 11);
        ctx.fillStyle = '#6b1a10';
        ctx.fillRect(x - lampW / 4, PY + 56, lampW / 2, 3);
      }

      // Pyro-Fontänen an den Bühnenkanten
      const jx = [18, 42, W - 42, W - 18];
      for (let i = 0; i < 4; i++) {
        if (jets[i] < 0.03) continue;
        const h = 150 * jets[i];
        ctx.save();
        ctx.translate(jx[i], H - 52);
        ctx.scale(0.9 + 0.2 * jets[i], h / 82);
        ctx.fillStyle = 'rgba(255,90,31,0.9)';
        ctx.fill(flamePath);
        ctx.fillStyle = '#ffd56b';
        ctx.fill(flameCore);
        ctx.restore();
      }

      // Sunbeam-Laser: Lampe flackert, dann Lichtstrahl
      for (const o of objs) if (o.type === 'L') drawBeam(ctx, o, bt, pulse);

      // Sturz-Warnung auf dem Boden
      if (dive && bt < dive.arrive + 0.3) {
        const p = clamp((bt - (dive.arrive - dive.fall)) / dive.fall, 0, 1);
        const x = laneAt(dive.lc, PY);
        ctx.strokeStyle = `rgba(255,60,40,${0.4 + 0.5 * Math.abs(Math.sin(bt * 8))})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, PY + 14, 14 + 34 * p, 6 + 12 * p, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = Math.floor(bt * 6) % 2 ? 'rgba(255,60,40,0.3)' : 'rgba(255,60,40,0.14)';
        laneStrip(ctx, dive.lc, TOP_Y, PY + 40);
        ctx.fill();
        if (bt < dive.arrive) warnMark(ctx, dive.lc, bt);
      }

      for (const o of objs) {
        if (o.type === 'L' || o.type === 'F') continue;
        const y = yOf(o);
        if (y < TOP_Y - 2) continue;
        const f = (y - TOP_Y) / (PY - TOP_Y);
        const x = laneAt(o.lc, y);
        const s = (0.5 + 0.5 * f) * (1 - (NL - 3) * 0.1);
        if (o.type === 'g') drawFlame(ctx, x, y, s, bt);
        else drawMine(ctx, x, y, s, bt);
      }

      const fiech = () =>
        engine.drawFiech(ctx, fx, fy, fs, {
          beatPhase: beat.beatPhase,
          action: fiechPose,
          lookAtX: px,
          lookAtY: PY,
          bassEnergy: beat.bassEnergy
        });
      if (!dive) fiech();

      for (const g of rings) {
        ctx.strokeStyle = `rgba(255,200,120,${1 - g.t / 0.35})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.x, PY, 18 + g.t * 90, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Spieler mit Raketenflamme unter den Füßen
      ctx.save();
      ctx.translate(px, PY + 24);
      ctx.scale(0.55, (22 + pulse * 10 + Math.sin(bt * 30) * 2) / 82);
      ctx.rotate(Math.PI);
      ctx.fillStyle = 'rgba(255,90,31,0.9)';
      ctx.fill(flamePath);
      ctx.fillStyle = '#ffd56b';
      ctx.fill(flameCore);
      ctx.restore();
      engine.drawPlayer(ctx, px, PY - 8, 46, {
        mode: 'runner',
        beatPhase: beat.beatPhase,
        tilt: clamp((laneAt(lane, PY) - px) * 0.004, -0.25, 0.25),
        accent: '#ff5a1f'
      });
      if (dive) fiech();

      // Publikum wippt im Beat, zwei Reihen gegenläufig
      ctx.drawImage(crowdBack, 0, H - 80 - kick * 2, W, 80);
      ctx.drawImage(crowdFront, 0, H - 80 + kick * 3, W, 80);

      if (combo >= 2) {
        ctx.fillStyle = '#ffb347';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`COMBO x${combo}`, 12, 70);
      }
      if (wipe > 0) {
        // Lichtwelle läuft von unten nach oben über die Bühne
        const wy = H * (1 - (1 - wipe));
        ctx.fillStyle = `rgba(${col},${0.35 * wipe})`;
        ctx.fillRect(0, wy - 30, W, 60);
        ctx.fillStyle = `rgba(255,244,210,${0.5 * wipe})`;
        ctx.fillRect(0, wy - 3, W, 6);
      }
      if (banner.t > 0) {
        const age = banner.t0 - banner.t;
        const slide = 1 - Math.pow(1 - Math.min(1, age / 0.35), 3);
        const x = (1 - slide) * -W;
        ctx.globalAlpha = Math.min(1, banner.t * 2.5);
        ctx.fillStyle = 'rgba(10,3,3,0.88)';
        ctx.fillRect(x, 216, W, 68);
        ctx.fillStyle = `rgb(${col})`;
        ctx.fillRect(x, 216, W, 3);
        ctx.fillRect(x, 281, W, 3);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(banner.text, x + W / 2, 245);
        ctx.fillStyle = '#ffd56b';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(banner.sub, x + W / 2, 268);
        ctx.globalAlpha = 1;
      }      if (flash > 0) {
        ctx.fillStyle = `rgba(255,40,20,${flash * 0.3})`;
        ctx.fillRect(0, 0, W, H);
      }
    },
    _debug: () => ({ bt, objs, lane, dive: !!dive })
  };
}

// Warnzeichen auf der Spielerlinie der bedrohten Spur
function warnMark(ctx, l, t, a = 1) {
  const x = laneAt(l, PY);
  ctx.globalAlpha = a * (Math.floor(t * 6) % 2 ? 1 : 0.55);
  ctx.fillStyle = '#ff3018';
  ctx.beginPath();
  ctx.moveTo(x, PY - 38);
  ctx.lineTo(x + 20, PY - 4);
  ctx.lineTo(x - 20, PY - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 2, PY - 31, 4, 15);
  ctx.fillRect(x - 2, PY - 12, 4, 4);
  ctx.globalAlpha = 1;
}

function laneStrip(ctx, l, y0, y1) {
  const a = laneW(y0) / 2;
  const b = laneW(y1) / 2;
  ctx.beginPath();
  ctx.moveTo(laneAt(l, y0) - a, y0);
  ctx.lineTo(laneAt(l, y0) + a, y0);
  ctx.lineTo(laneAt(l, y1) + b, y1);
  ctx.lineTo(laneAt(l, y1) - b, y1);
  ctx.closePath();
}

// Sammelobjekt: einfacher goldener Kreis mit hellem Ring = "gut"
function drawFlame(ctx, x, y, s, t) {
  const r = 14 * s;
  ctx.strokeStyle = 'rgba(255,244,200,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r * (1.35 + 0.1 * Math.sin(t * 9 + x)), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd56b';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff4c2';
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}
function drawMine(ctx, x, y, s, t) {
  const r = 15 * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 2);
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    ctx.moveTo(Math.cos(a - 0.2) * r, Math.sin(a - 0.2) * r);
    ctx.lineTo(Math.cos(a) * r * 1.65, Math.sin(a) * r * 1.65);
    ctx.lineTo(Math.cos(a + 0.2) * r, Math.sin(a + 0.2) * r);
  }
  ctx.fill();
  ctx.fillStyle = '#1a0a0a';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff3018';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ff3018' : '#7f1d1d';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Sunbeam wie in der SUDO-Bühne. Ablauf: 2 Beats rotes Blinken + Lampe wächst, letzter Beat: Aufladen
// (Spur durchgehend gelb, Lampe weiß), dann Strahl: Spur steht in Flammen.
function drawBeam(ctx, o, bt, pulse) {
  const toHit = o.arrive - bt;
  if (toHit > LASER_WARN) return;
  const lx = laneAt(o.lc, PY + 62);
  const ly = PY + 56;
  const lw = Math.min(12, laneW(PY) * 0.2);
  if (toHit > 0) {
    const charge = toHit < 1;
    const grow = 1 - toHit / LASER_WARN;
    ctx.fillStyle = charge ? `rgba(255,200,60,${0.4 + 0.3 * (1 - toHit)})` : Math.floor(bt * 4) % 2 ? 'rgba(255,60,40,0.42)' : 'rgba(255,60,40,0.16)';
    laneStrip(ctx, o.lc, TOP_Y, PY + 56);
    ctx.fill();
    ctx.fillStyle = charge ? '#fff4d2' : 'rgba(255,214,107,0.6)';
    ctx.beginPath();
    ctx.moveTo(lx - lw, ly);
    ctx.lineTo(lx + lw, ly);
    ctx.lineTo(lx + lw * 0.4, ly - 40 - grow * 90);
    ctx.lineTo(lx - lw * 0.4, ly - 40 - grow * 90);
    ctx.fill();
    warnMark(ctx, o.lc, charge ? bt * 1.7 : bt);
  } else {
    const w = laneW(TOP_Y) * 0.55;
    const cx = laneAt(o.lc, TOP_Y);
    // Spur in Flammen
    ctx.fillStyle = `rgba(255,${90 + Math.floor(Math.random() * 40)},30,0.6)`;
    laneStrip(ctx, o.lc, TOP_Y, PY + 56);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,184,77,0.55)';
    ctx.beginPath();
    ctx.moveTo(lx - lw * 0.7, ly);
    ctx.lineTo(lx + lw * 0.7, ly);
    ctx.lineTo(cx + w, TOP_Y);
    ctx.lineTo(cx - w, TOP_Y);
    ctx.fill();
    ctx.fillStyle = `rgba(255,244,210,${0.85 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(lx - lw * 0.25, ly);
    ctx.lineTo(lx + lw * 0.25, ly);
    ctx.lineTo(cx + w * 0.28, TOP_Y);
    ctx.lineTo(cx - w * 0.28, TOP_Y);
    ctx.fill();
  }
}