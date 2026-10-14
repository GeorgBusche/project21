import { CONTENT } from '../../content.js';
import { getAudioContext } from '../audio.js';

// Adaptive Soundtrack-Engine: EIN durchgehender Stream des echten Tracks. Stage-Wechsel und Stress
// verändern nur Tempo (playbackRate) und Filter per Rampe, es gibt nie einen Neustart oder Sprung.
// Die Beat-Uhr ist ein Phasen-Akkumulator, der exakt das integriert, was die Rate-Rampe abspielt.
// Konfiguration: CONTENT.arcadeAudio in js/content.js.

// Statischer Pfad, damit Vite die Datei mit in den Build nimmt.
const BUNDLED_TRACK = 'assets/audio/fear.mp3';
const BUNDLED_URL = new URL('../../../assets/audio/fear.mp3', import.meta.url).href;

const MASTER_GAIN = 0.9;
const STAGE_RAMP = 0.45;
const STRESS_RAMP = 0.3;
const TICK_MS = 30;
const TARGET_RMS = 0.14;
const STRESS_RATE_BOOST = 0.04;
const HEARTBEAT_FROM = 0.7;

const a = {
  ctx: null,
  comp: null,
  master: null,
  analyser: null,
  bins: new Uint8Array(0),
  bassLo: 0,
  bassHi: 0,
  buffer: null,
  loading: null,
  voice: null,
  timer: 0,
  running: false,
  stage: 1,
  stress: 0,
  // Rate-Modell: lineare Rampe, identisch zur AudioParam-Rampe
  ramp: { t0: 0, t1: 0, r0: 1, r1: 1 },
  rampLock: 0,
  djHold: null,
  filterTarget: 0,
  filterOpened: false,
  totalBeats: 0,
  lastCtx: 0,
  startAt: 0,
  lastBeatIndex: -1,
  fallback: false,
  heartScheduled: -1,
  kickScheduled: -1,
  req: 0,
  bass: 0,
  bassSampleAt: -Infinity,
  masterMuted: null,
  cached: null
};

let gainCache = null;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function cfg() {
  return CONTENT.arcadeAudio;
}

function stageCfg(stage) {
  const stages = cfg().stages;
  return stages[stage] || stages[Object.keys(stages).pop()];
}

function trackHref() {
  const url = cfg().trackUrl;
  if (!url || url === BUNDLED_TRACK) return BUNDLED_URL;
  return new URL(url, document.baseURI).href;
}

// Lädt und dekodiert den Track genau einmal.
export function preloadArcadeAudio() {
  if (a.loading) return a.loading;
  const ctx = getAudioContext();
  if (!ctx) return Promise.resolve(null);
  a.loading = fetch(trackHref())
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.arrayBuffer();
    })
    .then((data) => ctx.decodeAudioData(data))
    .then((buf) => {
      a.buffer = buf;
      return buf;
    })
    .catch(() => {
      console.info('[ARCADE-AUDIO] Lege fear.mp3 unter assets/audio/fear.mp3 ab');
      a.buffer = null;
      return null;
    });
  return a.loading;
}

// Loop über den ganzen Track, auf volle Takte gekürzt, damit das Raster beim Loop-Sprung stimmt.
function loopRegion() {
  const { baseBpm, beatOffsetSec } = cfg();
  const barSec = (60 / baseBpm) * 4;
  const usable = Math.max(barSec, a.buffer.duration - beatOffsetSec);
  const bars = Math.max(1, Math.floor(usable / barSec));
  return { start: beatOffsetSec, end: Math.min(a.buffer.duration, beatOffsetSec + bars * barSec) };
}

// Einheitliche Lautstärke: RMS des Loop-Bereichs auf Zielwert bringen.
function trackGain(region) {
  const buf = a.buffer;
  if (gainCache?.buffer === buf && gainCache.start === region.start && gainCache.end === region.end) {
    return gainCache.gain;
  }
  const from = Math.floor(region.start * buf.sampleRate);
  const to = Math.min(buf.length, Math.floor(region.end * buf.sampleRate));
  let sum = 0;
  let n = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = from; i < to; i += 8) {
      sum += d[i] * d[i];
      n++;
    }
  }
  const rms = Math.sqrt(sum / Math.max(1, n));
  const gain = rms > 0.001 ? clamp(TARGET_RMS / rms, 0.5, 2) : 1;
  gainCache = { buffer: buf, start: region.start, end: region.end, gain };
  return gain;
}

function buildGraph() {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (a.ctx === ctx && a.master) return true;
  a.ctx = ctx;
  a.analyser = ctx.createAnalyser();
  a.analyser.fftSize = 256;
  a.analyser.smoothingTimeConstant = 0.55;
  a.bins = new Uint8Array(a.analyser.frequencyBinCount);
  const binHz = ctx.sampleRate / 256;
  a.bassLo = Math.floor(40 / binHz);
  a.bassHi = Math.max(a.bassLo, Math.floor(140 / binHz));
  a.comp = ctx.createDynamicsCompressor();
  a.comp.threshold.value = -14;
  a.comp.knee.value = 12;
  a.comp.ratio.value = 4;
  a.comp.attack.value = 0.003;
  a.comp.release.value = 0.15;
  a.master = ctx.createGain();
  a.master.gain.value = window.isMuted ? 0 : MASTER_GAIN;
  a.masterMuted = Boolean(window.isMuted);
  a.analyser.connect(a.comp);
  a.comp.connect(a.master);
  a.master.connect(ctx.destination);
  return true;
}

// ---- Rate-Modell & Beat-Phasen-Akkumulator -------------------------------------------------------

function rateAt(t) {
  const r = a.ramp;
  if (t >= r.t1) return r.r1;
  if (t <= r.t0) return r.r0;
  return r.r0 + ((r.r1 - r.r0) * (t - r.t0)) / (r.t1 - r.t0);
}

// Integral der Rate über [from, to] (Trapez ist für die lineare Rampe exakt).
function integrateRate(from, to) {
  const r = a.ramp;
  let sum = 0;
  let s = from;
  if (s < r.t1 && to > s) {
    const e = Math.min(to, r.t1);
    sum += ((rateAt(s) + rateAt(e)) / 2) * (e - s);
    s = e;
  }
  if (to > s) sum += r.r1 * (to - s);
  return sum;
}

// totalBeats += deltaSec * (baseBpm * rate) / 60 – mit der tatsächlich laufenden Rate.
function advance() {
  const now = a.ctx.currentTime;
  if (now <= a.lastCtx) return;
  const from = Math.max(a.lastCtx, a.startAt);
  if (now > from) a.totalBeats += (integrateRate(from, now) * cfg().baseBpm) / 60;
  a.lastCtx = now;
}

function currentRate() {
  return rateAt(a.ctx.currentTime);
}

function rampRate(target, dur) {
  advance();
  const now = a.ctx.currentTime;
  const from = rateAt(now);
  a.ramp = { t0: now, t1: now + dur, r0: from, r1: target };
  const p = a.voice?.src?.playbackRate;
  if (p) {
    p.cancelScheduledValues(now);
    p.setValueAtTime(from, now);
    p.linearRampToValueAtTime(target, now + dur);
  }
}

function rampFilter(hz, dur) {
  a.filterTarget = hz;
  const f = a.voice?.filter?.frequency;
  if (!f) return;
  const now = a.ctx.currentTime;
  f.cancelScheduledValues(now);
  f.setValueAtTime(f.value, now);
  f.linearRampToValueAtTime(hz, now + dur);
}

// Basis-Cutoff der Stage. Stage 1 öffnet sich bei Beat X; Stress öffnet den Klang zusätzlich.
function desiredFilter() {
  const sc = stageCfg(a.stage);
  let base = sc.filterHz;
  const open = cfg().stage1Open;
  if (a.stage === 1 && open && a.totalBeats >= open.openBeat) base = open.openHz;
  if (base >= 19000) return 20000;
  return base * (20000 / base) ** clamp(a.stress * 0.6, 0, 1);
}

// ---- Synth-Hilfen (nur Sub-Bass, nie hell/rauschig) ---------------------------------------------

// Warmer DJ-Drop beim Stage-Wechsel: 90 Hz -> 35 Hz Sine-Sweep über 0,35 s.
function stageDrop(t) {
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(90, t);
  o.frequency.exponentialRampToValueAtTime(35, t + 0.35);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(g);
  g.connect(a.comp);
  o.start(t);
  o.stop(t + 0.55);
}

// Weicher Sub-Kick (55 Hz), bewusst ohne Rauschen und ohne helle Anteile.
function subKick(t, level) {
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(55, t + 0.07);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  o.connect(g);
  g.connect(a.analyser);
  o.start(t);
  o.stop(t + 0.3);
}

function subBass(t, level, dur) {
  const o = a.ctx.createOscillator();
  const f = a.ctx.createBiquadFilter();
  const g = a.ctx.createGain();
  o.type = 'sine';
  o.frequency.value = 110;
  f.type = 'lowpass';
  f.frequency.value = 220;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f);
  f.connect(g);
  g.connect(a.analyser);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// Plant Schläge im Voraus (sample-genau) aus der Beat-Uhr.
function scheduleBeatSounds() {
  const beatSec = 60 / cfg().baseBpm;
  const rate = currentRate();
  const nextIdx = Math.floor(a.totalBeats) + 1;
  const wait = ((nextIdx - a.totalBeats) * beatSec) / rate;
  if (wait > 0.09 || a.ctx.currentTime < a.startAt) return;
  const t = a.ctx.currentTime + wait;
  if (a.stress > HEARTBEAT_FROM && !a.fallback && a.heartScheduled < nextIdx) {
    a.heartScheduled = nextIdx;
    subKick(t, 0.28 * clamp((a.stress - HEARTBEAT_FROM) / (1 - HEARTBEAT_FROM), 0.25, 1));
  }
  if (a.fallback && a.kickScheduled < nextIdx) {
    a.kickScheduled = nextIdx;
    subKick(t, 0.32 + a.stage * 0.03);
    subBass(t + (beatSec / rate) * 0.5, 0.16 + a.stage * 0.02, (beatSec / rate) * 0.4);
  }
}

function tick() {
  if (!a.running || !a.ctx) return;
  const now = a.ctx.currentTime;
  const muted = Boolean(window.isMuted);
  if (muted !== a.masterMuted) {
    a.master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, now, 0.03);
    a.masterMuted = muted;
  }
  advance();

  // DJ-Scratch: Filter bleibt bis zum nächsten Beat zu, dann Drop und wieder auf
  if (a.djHold && (a.totalBeats >= a.djHold.beat || now >= a.djHold.until)) {
    a.djHold = null;
    stageDrop(now + 0.01);
    rampFilter(desiredFilter(), 0.08);
  }

  // Während eine Stage-Rampe läuft, wird nichts überschrieben.
  if (now >= a.rampLock) {
    const boost = clamp((a.stress - 0.5) / 0.5, 0, 1) * STRESS_RATE_BOOST;
    const target = stageCfg(a.stage).rate * (1 + boost);
    if (Math.abs(target - a.ramp.r1) > 0.0004) rampRate(target, STRESS_RAMP);
    const hz = desiredFilter();
    const opening = a.stage === 1 && !a.filterOpened && a.totalBeats >= (cfg().stage1Open?.openBeat ?? Infinity);
    if (opening) {
      a.filterOpened = true;
      rampFilter(hz, 0.6);
    } else if (!a.djHold && Math.abs(hz - a.filterTarget) / a.filterTarget > 0.03) {
      rampFilter(hz, STRESS_RAMP);
    }
  }
  scheduleBeatSounds();
}

function startVoice(buffer, startBeat = 0) {
  const ctx = a.ctx;
  const sc = stageCfg(a.stage);
  const t = ctx.currentTime + 0.05;
  const region = loopRegion();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.loopStart = region.start;
  src.loopEnd = region.end;
  src.playbackRate.setValueAtTime(sc.rate, t);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(desiredFilter(), t);
  a.filterTarget = desiredFilter();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(trackGain(region), t + 0.3);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(a.analyser);
  // startBeat > 0: Einstieg mitten im Track (DEV-Direktstart einer späteren Stage, Taktgitter bleibt erhalten)
  src.start(t, region.start + (startBeat * 60) / cfg().baseBpm);
  a.voice = { src, filter, gain };
  // Beat-Uhr an den tatsächlichen Start koppeln (Beat 0 liegt bei beatOffsetSec)
  a.totalBeats = startBeat - (cfg().beatOffsetSec * cfg().baseBpm) / 60;
  a.startAt = t;
  a.lastCtx = ctx.currentTime;
  a.lastBeatIndex = Math.floor(a.totalBeats) - 1;
  a.ramp = { t0: t, t1: t, r0: sc.rate, r1: sc.rate };
}

async function launch(stage, startBeat = 0) {
  const req = ++a.req;
  a.stage = stage;
  a.stress = 0;
  a.filterOpened = false;
  a.rampLock = 0;
  a.djHold = null;
  a.heartScheduled = -1;
  a.kickScheduled = -1;
  a.cached = null;
  a.bassSampleAt = -Infinity;
  a.bass = 0;
  a.voice = null;
  a.fallback = false;
  a.totalBeats = startBeat - (cfg().beatOffsetSec * cfg().baseBpm) / 60;
  a.lastBeatIndex = Math.floor(a.totalBeats) - 1;
  const sc = stageCfg(stage);
  a.ramp = { t0: 0, t1: 0, r0: sc.rate, r1: sc.rate };
  a.startAt = a.ctx.currentTime + 0.05;
  a.lastCtx = a.ctx.currentTime;

  // Bis der Track dekodiert ist, läuft die Beat-Uhr stumm weiter; beim Start wird sie neu gekoppelt.
  const buffer = a.buffer || (await preloadArcadeAudio());
  if (!a.running || req !== a.req) return;
  if (buffer) startVoice(buffer, startBeat);
  else {
    a.fallback = true;
    a.startAt = a.ctx.currentTime + 0.05;
    a.lastCtx = a.ctx.currentTime;
  }
}

// Startet den Master-Stream einmalig (Stage 1).
export function startArcadeAudio(stage = 1, startBeat = 0) {
  stopArcadeAudio(true);
  if (!buildGraph()) return;
  a.ctx.resume?.();
  a.running = true;
  a.timer = setInterval(tick, TICK_MS);
  launch(stage, startBeat);
}

// Stage-Wechsel (1..4): moduliert den laufenden Stream per Rampe, kein neuer Source-Node, kein Sprung.
export function setStage(stage) {
  // Kaltstart einer späteren Stage (DEV-Menü): direkt im Drop einsteigen statt im leisen Intro
  if (!a.running) return startArcadeAudio(stage, stage > 1 ? (cfg().devDropBeat ?? 0) + (stage - 2) * 16 : 0);
  if (stage === a.stage) return undefined;
  advance();
  a.stage = stage;
  a.heartScheduled = -1;
  const sc = stageCfg(stage);
  const now = a.ctx.currentTime;
  a.rampLock = now + STAGE_RAMP;
  rampRate(sc.rate, STAGE_RAMP);
  rampFilter(desiredFilter(), STAGE_RAMP);
  if (stage > 1) stageDrop(now + 0.02);
  return undefined;
}

// 0..1: steigert Tempo (bis +4 %), Filteröffnung und ab 0.7 den Sub-Heartbeat.
export function setStressLevel(stress) {
  a.stress = clamp(Number(stress) || 0, 0, 1);
}

export function stopArcadeAudio(immediate = false) {
  clearInterval(a.timer);
  a.running = false;
  a.req++;
  const v = a.voice;
  if (a.ctx && v) {
    const t = a.ctx.currentTime;
    const fade = immediate ? 0.02 : 0.25;
    try {
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setValueAtTime(v.gain.gain.value, t);
      v.gain.gain.linearRampToValueAtTime(0, t + fade);
      v.src.stop(t + fade + 0.05);
    } catch (_) {
      /* bereits gestoppt */
    }
    setTimeout(() => {
      try {
        v.filter.disconnect();
        v.gain.disconnect();
      } catch (_) {
        /* ignorieren */
      }
    }, (fade + 0.2) * 1000);
  }
  a.voice = null;
  a.cached = null;
}

// Leise Spiel-SFX durch denselben Kompressor wie die Musik.
export function sfx(freq, type = 'sine', dur = 0.08, gain = 0.05, slideTo = 0) {
  if (!a.running || !a.ctx || window.isMuted) return;
  const t = a.ctx.currentTime;
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(a.comp);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function tone(t, freq, type, dur, gain, slideTo = 0) {
  const o = a.ctx.createOscillator();
  const g = a.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(a.comp);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// Vinyl-Scratch (Bandpass-Chirp 180 -> 720 -> 120 Hz in 0,18 s). Der Musik-Lowpass geht auf 450 Hz zu
// und wird auf dem nächsten Beat mit stageDrop() wieder aufgerissen. Der Stream läuft ungestört weiter.
export function triggerDjScratch() {
  if (!a.running || !a.ctx || window.isMuted) return;
  advance();
  const now = a.ctx.currentTime;
  const o = a.ctx.createOscillator();
  const bp = a.ctx.createBiquadFilter();
  const g = a.ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(180, now);
  o.frequency.exponentialRampToValueAtTime(720, now + 0.09);
  o.frequency.exponentialRampToValueAtTime(120, now + 0.18);
  bp.type = 'bandpass';
  bp.Q.value = 4;
  bp.frequency.setValueAtTime(360, now);
  bp.frequency.exponentialRampToValueAtTime(1200, now + 0.09);
  bp.frequency.exponentialRampToValueAtTime(240, now + 0.18);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  o.connect(bp);
  bp.connect(g);
  g.connect(a.comp);
  o.start(now);
  o.stop(now + 0.25);
  rampFilter(450, 0.04);
  a.djHold = { beat: Math.floor(a.totalBeats) + 1, until: now + 1.5 };
}

// SUDO-/Terminal-Sounds: 'type' Keyclick, 'hack' 3-Ton-Chime, 'execute' Root-Impact mit Tape-Stop
export function triggerSudoSound(kind) {
  if (!a.running || !a.ctx || window.isMuted) return;
  const now = a.ctx.currentTime;
  if (kind === 'type') {
    tone(now, 1400, 'square', 0.025, 0.035);
  } else if (kind === 'hack') {
    [440, 660, 880].forEach((f, i) => tone(now + i * 0.07, f, 'triangle', 0.1, 0.06));
  } else if (kind === 'execute') {
    advance();
    tone(now, 70, 'sine', 0.55, 0.5, 28);
    tone(now, 220, 'sawtooth', 0.18, 0.08, 55);
    rampRate(0.85, 0.05);
    a.rampLock = now + 0.25;
    setTimeout(() => {
      if (!a.running || !a.ctx) return;
      a.rampLock = 0;
      rampRate(stageCfg(a.stage).rate * (1 + clamp((a.stress - 0.5) / 0.5, 0, 1) * STRESS_RATE_BOOST), 0.08);
      stageDrop(a.ctx.currentTime + 0.01);
    }, 250);
  }
}

const IDLE = { bpm: 0, beatIndex: 0, beatPhase: 0, isBeat: false, bassEnergy: 0, running: false };

// Kurze Schnipsel aus den SUDO-Show-MP3s (Start/Dauer in Sekunden)
const SUDO_SAMPLES = {
  bronze: ['wolle.mp3', 0.08, 0.42],
  silber: ['wolle.mp3', 0.48, 0.42],
  gold: ['wolle.mp3', 0.88, 0.6],
  tornado: ['biertornado.mp3', 2.05, 1.1],
  sonne: ['sonne.mp3', 8.25, 1.7],
  gas: ['gas.mp3', 0.05, 0.5],
  schuetteln: ['schuettelkorn.mp3', 10.95, 0.9]
};
const sampleBuffers = new Map();

export function warmSudoSamples() {
  if (!a.ctx) return;
  for (const file of new Set(Object.values(SUDO_SAMPLES).map((s) => s[0]))) {
    if (sampleBuffers.has(file)) continue;
    sampleBuffers.set(file, null);
    fetch(new URL(`../../../assets/audio/${file}`, import.meta.url).href)
      .then((r) => r.arrayBuffer())
      .then((buf) => a.ctx.decodeAudioData(buf))
      .then((decoded) => sampleBuffers.set(file, decoded))
      .catch(() => sampleBuffers.delete(file));
  }
}

export function triggerSudoSample(name) {
  const def = SUDO_SAMPLES[name];
  if (!def || !a.running || !a.ctx || window.isMuted) return;
  const buf = sampleBuffers.get(def[0]);
  if (!buf) {
    warmSudoSamples();
    return;
  }
  const now = a.ctx.currentTime;
  const src = a.ctx.createBufferSource();
  src.buffer = buf;
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(0.55, now + 0.02);
  g.gain.setValueAtTime(0.55, now + def[2] - 0.1);
  g.gain.linearRampToValueAtTime(0.0001, now + def[2]);
  src.connect(g);
  g.connect(a.comp);
  src.start(now, def[1], def[2]);
}

// Pro Frame abfragen. isBeat ist genau in dem Frame true, in dem ein neuer Schlag begann.
export function getBeatInfo() {
  if (!a.running || !a.ctx) return IDLE;
  const now = a.ctx.currentTime;
  if (a.cached && a.cached.at === now) return a.cached.info;

  advance();
  const rate = rateAt(now);
  const bpm = cfg().baseBpm * rate;
  // Ausgabelatenz herausrechnen, damit Bild und gehörter Beat zusammenpassen
  const latencyBeats = ((a.ctx.outputLatency || a.ctx.baseLatency || 0) * bpm) / 60;
  const pos = a.totalBeats - latencyBeats;
  const beatIndex = Math.floor(pos);
  const started = now >= a.startAt;
  const isBeat = started && beatIndex !== a.lastBeatIndex;
  if (started) a.lastBeatIndex = beatIndex;

  if (now - a.bassSampleAt >= TICK_MS / 1000) {
    a.bassSampleAt = now;
    a.analyser.getByteFrequencyData(a.bins);
    let sum = 0;
    for (let i = a.bassLo; i <= a.bassHi; i++) sum += a.bins[i];
    const raw = sum / (a.bassHi - a.bassLo + 1) / 255;
    a.bass = clamp((raw - 0.3) / 0.6, 0, 1);
  }

  const info = { bpm, beatIndex, beatPhase: pos - beatIndex, isBeat, bassEnergy: a.bass, running: true };
  a.cached = { at: now, info };
  return info;
}
