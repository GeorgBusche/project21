// Zufalls-Generator für die Stage-3-Wellen. Jede Reihe wird erst übernommen, wenn die Strecke bis dahin noch
// schadenfrei schaffbar ist (Spurwechsel dauert MOVE Beats). Am Ende wird die ganze Strecke noch einmal geprüft.

// ---- HIER ANPASSEN -------------------------------------------------------
// lanes = Spuren · rows = Reihen · gap = Abstand der Reihen in Beats · fall = Flugzeit der Objekte in Beats
// laser / dive / double = Wahrscheinlichkeit pro Reihe für Sunbeam, Fiech-Sturz, zweiten Sunbeam
// maxStay = wie viele Reihen in Folge die sichere Spur gleich bleiben darf
export const WAVE_DEFS = [
    { lanes: 3, rows: 8, gap: 1.3, fall: 2.6, laser: 0, dive: 0, double: 0, maxStay: 2 },
    { lanes: 3, rows: 8, gap: 1.2, fall: 2.5, laser: 0.25, dive: 0, double: 0, maxStay: 2 },
    { lanes: 3, rows: 8, gap: 1.0, fall: 2.4, laser: 0.1, dive: 0.2, double: 0, maxStay: 2 },
    { lanes: 3, rows: 8, gap: 0.95, fall: 2.3, laser: 0.25, dive: 0.18, double: 0, maxStay: 2 },
    { lanes: 5, rows: 14, gap: 0.9, fall: 2.1, laser: 0.25, dive: 0.12, double: 0.15, maxStay: 2 }
  ];
export const MOVE = 0.7; // Reaktionszeit in Beats, die ein Spurwechsel in der Machbarkeitsprüfung kostet (im Spiel selbst ist er sofort)
// ---------------------------------------------------------------------------

const DT = 0.05;
const LASER_ACTIVE = 0.45;
export const WAVE_INTRO = 2.5; // Beats vor dem ersten Objekt: Banner, Pyro-Salve und Spurumbau
const WAVE_GAP = 4; // Pause zwischen zwei Wellen in Beats (Bahn leer, Übergang läuft)
const DIVE_SPACING = 4.4; // Mindestabstand zweier Fiech-Stürze in Beats (Sturz + Aufstieg dauern ca. 4,1 Beats)
const FIRST_START = 5;

function rowEvents(row, arr) {
  const out = [];
  for (let l = 0; l < row.length; l++) {
    const ch = row[l];
    const c = l - (row.length - 1) / 2;
    if (ch === 'v') out.push({ c, t0: arr - 0.15, t1: arr + 0.15 });
    else if (ch === 'L') out.push({ c, t0: arr - 0.1, t1: arr + LASER_ACTIVE });
    else if (ch === 'F') out.push({ c, t0: arr - 0.25, t1: arr + 0.25 });
  }
  return out;
}

const blockedIn = (ev, c, t) => {
  for (let i = ev.length - 1; i >= 0 && i >= ev.length - 60; i--) {
    const e = ev[i];
    if (e.c === c && t >= e.t0 && t <= e.t1) return true;
  }
  return false;
};

function maxLaneAt(waves, t) {
  let n = 3;
  for (const w of waves) if (t >= w.start - w.fall - WAVE_INTRO) n = w.lanes;
  return (n - 1) / 2;
}

// Setzt die Erreichbarkeits-Simulation von state bis Zeitschritt kEnd fort. null = kein sicherer Weg mehr.
function simulate(state, ev, kEnd, waves) {
  let cur = new Set(state.cur);
  let pend = state.pend.map((p) => ({ ...p }));
  for (let k = state.k; k < kEnd; k++) {
    const t = k * DT;
    const nx = new Set();
    const mx = maxLaneAt(waves, t);
    for (const c of cur) {
      if (blockedIn(ev, c, t)) continue;
      nx.add(c);
      for (const d of [-1, 1]) {
        const c2 = c + d;
        if (Math.abs(c2) > mx) continue;
        let ok = true;
        for (let s = 0; s * DT <= MOVE; s++) {
          const tt = t + s * DT;
          if (s * DT < MOVE / 2 ? blockedIn(ev, c, tt) : blockedIn(ev, c2, tt)) {
            ok = false;
            break;
          }
        }
        if (ok) pend.push({ at: t + MOVE, c: c2 });
      }
    }
    pend = pend.filter((p) => {
      if (p.at > t + 1e-9) return true;
      if (!blockedIn(ev, p.c, t)) nx.add(p.c);
      return false;
    });
    cur = nx;
    if (!cur.size) return null;
  }
  return { k: kEnd, cur, pend };
}

// Baut alle Reihen nacheinander. Der Zustand wird bis (Ankunft - MOVE/2 ... ) nur so weit simuliert, wie alle
// relevanten Ereignisse schon bekannt sind (Vorausschau MOVE + 0,55 Beats). Sackgasse -> letzte Reihe neu würfeln.
function build(rnd, defs = WAVE_DEFS) {
  const waves = [];
  const slots = [];
  let start = FIRST_START;
  for (const def of defs) {
    waves.push({ start, gap: def.gap, fall: def.fall, lanes: def.lanes, rows: [] });
    for (let r = 0; r < def.rows; r++) slots.push({ def, wi: waves.length - 1, r, arr: start + r * def.gap });
    start += def.rows * def.gap + WAVE_GAP;
  }
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const ev = [];
  const chosen = [];
  const init = { k: 0, cur: new Set([0]), pend: [] };
  let backtracks = 0;
  let i = 0;
  while (i < slots.length) {
    const { def, r, arr } = slots[i];
    const prev = chosen[i - 1];
    const base = prev ? prev.state : init;
    const path = prev ? prev.path : 0;
    const stay = prev ? prev.stay : 0;
    const lastDive = prev ? prev.lastDive : -99;
    const mx = (def.lanes - 1) / 2;
    const kEnd = Math.ceil((arr + 0.55 - MOVE) / DT);
    let accepted = false;
    for (let tries = 0; tries < 40 && !accepted; tries++) {
      const relaxed = tries >= 25;
      // sichere Spur: neben einer Spur wählen, auf der man gerade tatsächlich sein kann
      const reach = [...new Set([...base.cur].flatMap((q) => [q - 1, q, q + 1]))].filter((q) => Math.abs(q) <= mx);
      let p2 = reach.length ? pick(reach) : Math.round(rnd() * (def.lanes - 1) - mx);
      if (relaxed) p2 = Math.round(rnd() * (def.lanes - 1) - mx);
      else if (p2 === path && stay >= def.maxStay) continue;
      const a = Array(def.lanes).fill('v');
      a[p2 + mx] = '.';
      const free = () => [...a.keys()].filter((q) => a[q] === 'v');
      if (r > 1 && !relaxed) {
        const roll = rnd();
        if (roll < def.laser) a[pick(free())] = 'L';
        else if (roll < def.laser + def.dive && arr - lastDive >= DIVE_SPACING) a[pick(free())] = 'F';
        if (def.double && rnd() < def.double && a.includes('L')) a[pick(free())] = 'L';
      }
      const row = a.join('');
      const add = rowEvents(row, arr);
      ev.push(...add);
      const state = simulate(base, ev, kEnd, waves);
      if (state) {
        chosen[i] = { row, path: p2, stay: p2 === path ? stay + 1 : 1, state, n: add.length, lastDive: row.includes('F') ? arr : lastDive };
        accepted = true;
      } else ev.length -= add.length;
    }
    if (accepted) {
      i++;
      continue;
    }
    if (i === 0 || ++backtracks > 600) return null;
    // Sackgassen zeigen sich erst ein bis zwei Reihen später: mehrere Reihen zurückgehen
    const back = Math.min(i, 1 + Math.floor(rnd() * 3));
    for (let q = 0; q < back; q++) {
      i--;
      ev.length -= chosen[i].n;
    }
    chosen.length = i;
  }
  chosen.forEach((ch, idx) => waves[slots[idx].wi].rows.push(ch.row));
  return waves;
}
// Prüft die komplette Strecke einmal von vorn.
function validate(waves) {
  const ev = [];
  for (const w of waves) w.rows.forEach((row, i) => ev.push(...rowEvents(row, w.start + i * w.gap)));
  const end = Math.max(...ev.map((e) => e.t1)) + 0.5;
  let state = { k: 0, cur: new Set([0]), pend: [] };
  // blockedIn schaut nur auf die letzten 60 Ereignisse; für die Gesamtprüfung wird daher in Zeitscheiben simuliert
  const kEnd = Math.ceil(end / DT);
  const sorted = ev.sort((x, y) => x.t0 - y.t0);
  for (let k = 0; k < kEnd; k += 10) {
    const t = k * DT;
    const window = sorted.filter((e) => e.t1 >= t - 0.1 && e.t0 <= t + 0.5 + MOVE + 0.2);
    state = simulate(state, window, Math.min(kEnd, k + 10), waves);
    if (!state) return false;
  }
  return true;
}

export function generateWaves(rnd = Math.random) {
  let last = null;
  for (let i = 0; i < 12; i++) {
    const w = build(rnd);
    if (!w) continue;
    last = w;
    if (validate(w)) return w;
  }
  // Notfall: gleiche Struktur ohne Laser/Stürze, praktisch immer machbar
  const easy = WAVE_DEFS.map((d) => ({ ...d, laser: 0, dive: 0, double: 0, maxStay: 9 }));
  return last ?? build(rnd, easy) ?? build(() => 0.5, easy);
}
