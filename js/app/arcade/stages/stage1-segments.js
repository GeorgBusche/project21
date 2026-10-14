// ============================================================================
// STAGE 1 · SEGMENT-BAUKASTEN  (hier werden die 20 Strecken-Abschnitte bearbeitet)
// ============================================================================
//
// So liest du ein Segment:
//   x                   Abstand in px vom Spawnpunkt (rechter Bildrand), in dem das Element erscheint.
//                       130 px = 1 Beat. Der Würfel läuft links bei ca. x = -80 vorbei.
//   width / height      Breite / Höhe in px.
//   heightAboveGround   Höhe über dem Boden in px (größer = höher in der Luft).
//   heightBelowCeiling  Abstand zur Decke in px (nur bei Gravity-Flip-Abschnitten).
//   label               Kleiner Text über dem Element ('▲ JUMP UP', 'TAP!' ...).
//
// Sprung-Referenz (bei 105 BPM): normaler Sprung = 85 px hoch, ca. 121 px weit.
//
// Elemente (Parameter in { }):
//   spike({ x, width, height, onCeiling, baseHeightAboveGround, hangsFromCeiling, label })
//   spikeRow({ from, to, spacing })            Reihe aus Stacheln
//   block({ x, width, height, crate, label })   Plattform / Kiste (man kann draufstehen)
//   lift({ x, width, phase })                   Plattform, die auf und ab fährt (phase 0 oder Math.PI)
//   pad({ x, power, standsOnHeight, color, label })   Sprungfeld, power = PAD_POWER.STRONG/MEDIUM/LOW
//   bumper({ x, heightAboveGround })            Blauer Decken-Abpraller (drückt nach unten)
//   orb({ x, heightAboveGround | heightBelowCeiling, label })   Luft-Ring: in der Nähe NEU klicken
//   saw({ x, heightAboveGround })               Kreissäge
//   beam({ x, width, heightAboveGround, thickness, armTime, label })   Laser (aktiv nach armTime Sekunden)
//   stomper({ x, width, stopsAboveGround, label })   Stampfer von der Decke
//   guillotine({ x, width, height })            Fallbeil
//   keg({ x })                                  rollendes Fass
//   wave({ x, width, height, speed })           flache Welle
//   pendulum({ x, phase, length })              Abrissbirne (das Fiech selbst)
//   runner({ x, speed })                        Fiech als Rammbock
//   lava({ x, width })                          Lava-Bodenstreifen
//   popup({ x, width })                         Versteckte Falle
//   scissors({ x, closesAt: 'high' | 'mid', phase })   Schere, schließt oben oder in der Mitte
//   portal({ x, direction: 'down' | 'up' })     Gravity-Flip, track({ x, width }) = Deckenstrecke
//   gate({ x })                                 Finales Tor
//
// Segment-Einstellungen:
//   difficulty    'easy' | 'medium' | 'hard'   (bestimmt das Design und wann es im Run drankommt)
//   fiechPose     wo das Fiech steht: 'ground' | 'ceil' | 'top' | 'right' | 'topRight' | 'leftTop' | 'bg' | 'mid'
//                 (weglassen = automatisch wechselnd)
//   fiechAction   Aktion beim Bauen: 'slam' | 'push' | 'laser' | 'crush' | 'laugh'
//   shout         Text, den das Fiech ruft
//   minBeats      Mindestlänge des Segments in Beats
//   warnMarks     Warnmarkierungen am Spawn: { x, on: 'ground' | 'ceiling', width }
// ============================================================================

// Sprungfeld-Stärken (negativ = nach oben). Apex: STRONG ≈ 208 px, MEDIUM ≈ 161 px, LOW ≈ 120 px.
export const PAD_POWER = {
  STRONG: -1000,
  MEDIUM: -880,
  LOW: -760
};

// Das Finale – kommt immer als letztes Segment
export const FINAL_SEGMENT_ID = 'H6_FINAL_GATE_BREAKER';

const TIER = { easy: 0, medium: 1, hard: 2 };

// k = Baukasten mit den Elementen oben (wird von stage1-cube.js übergeben)
export function createSegments(k) {
  const { spike, spikeRow, block, lift, pad, bumper, orb, saw, beam, stomper, guillotine, keg, wave, pendulum, runner, lava, popup, scissors, portal, track, gate } = k;
  const PAD = PAD_POWER;

  const segments = [
    // ------------------------------------------------------------ EASY
    {
      id: 'E1_BEAT_TRIO_RUN',
      difficulty: 'easy',
      fiechPose: 'ground',
      fiechAction: 'slam',
      shout: 'TAP – TAP – TAP!',
      minBeats: 4,
      warnMarks: [{ x: 0, on: 'ground', width: 34 }],
      elements: () => [
        spike({ x: 0, width: 34, height: 40 }),
        spike({ x: 160, width: 34, height: 40 }),
        spike({ x: 320, width: 34, height: 40 })
      ]
    },
    {
      id: 'E2_CRATE_TO_ORB_HOP',
      difficulty: 'easy',
      fiechPose: 'ground',
      fiechAction: 'push',
      shout: 'KISTEN-HOP!',
      minBeats: 4,
      warnMarks: [{ x: 0, on: 'ground', width: 90 }],
      elements: () => [
        block({ x: 0, width: 110, height: 34, crate: true, label: '▲ JUMP UP' }),
        spike({ x: 115 }),
        spike({ x: 145 }),
        block({ x: 180, width: 110, height: 62, crate: true }),
        block({ x: 320, width: 90, height: 34, crate: true })
      ]
    },
    {
      id: 'E3_PAD_INTO_AIR_RING',
      difficulty: 'easy',
      fiechPose: 'mid',
      fiechAction: 'laser',
      shout: 'PAD + RING!',
      minBeats: 4,
      warnMarks: [{ x: 0, on: 'ground', width: 34 }],
      elements: () => [
        pad({ x: 0, power: PAD.STRONG, label: 'AUTO >>' }),
        spike({ x: 45 }),
        spike({ x: 75 }),
        spike({ x: 105 }),
        orb({ x: 70, heightAboveGround: 222, label: 'TAP!' }),
        saw({ x: 215, heightAboveGround: 35 }),
        block({ x: 300, width: 90, height: 36 })
      ]
    },
    {
      id: 'E4_DUCK_THEN_SNAP_JUMP',
      difficulty: 'easy',
      fiechPose: 'ceil',
      fiechAction: 'crush',
      shout: 'DUCK & JUMP!',
      minBeats: 5,
      warnMarks: [{ x: 0, on: 'ceiling', width: 70 }],
      elements: () => [
        stomper({ x: 0, width: 65, stopsAboveGround: 50, label: 'STAY LOW!' }),
        spike({ x: 140 }),
        block({ x: 215, width: 110, height: 34, label: '▲ LAND' }),
        stomper({ x: 375, width: 65, stopsAboveGround: 50 })
      ]
    },
    {
      id: 'E5_ASCENDING_CASCADE',
      difficulty: 'easy',
      fiechPose: 'ground',
      fiechAction: 'slam',
      shout: 'AUFSTIEG!',
      minBeats: 5,
      warnMarks: [{ x: 0, on: 'ground', width: 50 }],
      elements: () => [
        block({ x: 0, width: 75, height: 28 }),
        block({ x: 110, width: 75, height: 56 }),
        block({ x: 220, width: 85, height: 84, label: '▲ TOP' }),
        keg({ x: 420 })
      ]
    },
    {
      id: 'E6_DOUBLE_KEG_AMBUSH',
      difficulty: 'easy',
      fiechPose: 'ground',
      fiechAction: 'slam',
      shout: 'KICK KICK!',
      minBeats: 4,
      warnMarks: [{ x: 0, on: 'ground', width: 32 }],
      elements: () => [
        keg({ x: 0 }),
        block({ x: 150, width: 100, height: 38, crate: true, label: '▲ SAFE' }),
        keg({ x: 320 })
      ]
    },
    {
      id: 'E7_SWEEPING_LASER_GAUNTLET',
      difficulty: 'easy',
      fiechPose: 'mid',
      fiechAction: 'laser',
      shout: 'LASER-SERIE!',
      minBeats: 5,
      warnMarks: [{ x: 0, on: 'ground', width: 60 }],
      elements: () => [
        beam({ x: 0, width: 55, heightAboveGround: 16, thickness: 10, armTime: 0.35, label: 'JUMP!' }),
        block({ x: 150, width: 150, height: 40, label: '▲ BRIDGE' }),
        spike({ x: 275, baseHeightAboveGround: 40, height: 26 })
      ]
    },

    // ------------------------------------------------------------ MEDIUM
    {
      id: 'M1_FIECH_METEOR_DIVE',
      difficulty: 'medium',
      fiechPose: 'top',
      fiechAction: 'laugh',
      shout: 'METEOR!',
      minBeats: 5,
      warnMarks: [{ x: 140, on: 'ground', width: 56 }],
      elements: () => [
        wave({ x: 0, width: 45, height: 18, speed: 1.15 }),
        pad({ x: 115, power: PAD.STRONG, label: 'BOOST!' }),
        lava({ x: 160, width: 150 }),
        runner({ x: 200, speed: 1 }),
        orb({ x: 195, heightAboveGround: 218, label: 'TAP!' })
      ]
    },
    {
      id: 'M2_ZIGZAG_ORB_CANYON',
      difficulty: 'medium',
      fiechPose: 'ceil',
      fiechAction: 'laugh',
      shout: 'CANYON!',
      minBeats: 5,
      warnMarks: [{ x: 0, on: 'ground', width: 360 }],
      elements: () => [
        block({ x: 0, width: 45, height: 32 }),
        ...spikeRow({ from: 30, to: 330 }),
        orb({ x: 95, heightAboveGround: 75, label: 'TAP!' }),
        saw({ x: 155, heightAboveGround: 25 }),
        orb({ x: 205, heightAboveGround: 105, label: 'TAP!' }),
        block({ x: 310, width: 95, height: 44, label: '▲ LAND' })
      ]
    },
    {
      id: 'M3_CHAIN_GUILLOTINE_RUN',
      difficulty: 'medium',
      fiechPose: 'ceil',
      fiechAction: 'crush',
      shout: 'DOPPEL-CRUSH!',
      minBeats: 5,
      warnMarks: [{ x: 0, on: 'ceiling', width: 44 }],
      elements: () => [
        guillotine({ x: 0, width: 75, height: 32 }),
        spike({ x: 100 }),
        spike({ x: 128 }),
        guillotine({ x: 200, width: 75, height: 56 }),
        spike({ x: 310 })
      ]
    },
    {
      id: 'M4_SAW_TUNNEL_SLALOM',
      difficulty: 'medium',
      fiechPose: 'ceil',
      fiechAction: 'laser',
      shout: 'SÄGEN-SLALOM!',
      minBeats: 5,
      warnMarks: [{ x: 0, on: 'ground', width: 34 }],
      elements: () => [
        block({ x: 0, width: 90, height: 40, label: '▲ UP' }),
        saw({ x: 125, heightAboveGround: 20 }),
        block({ x: 175, width: 80, height: 40 }),
        pad({ x: 275, power: PAD.LOW, color: '#38bdf8', label: 'FLAT >>' }),
        spike({ x: 350 }),
        saw({ x: 375, heightAboveGround: 115 })
      ]
    },
    {
      id: 'M5_WRECKING_FIECH_SWING',
      difficulty: 'medium',
      fiechPose: 'ceil',
      fiechAction: 'laugh',
      shout: 'ABRISSBIRNE!',
      minBeats: 5,
      warnMarks: [{ x: 0, on: 'ground', width: 300 }],
      elements: () => [
        lava({ x: 0, width: 380 }),
        block({ x: 0, width: 160, height: 36, label: '▲ BRIDGE' }),
        pendulum({ x: 80, phase: 0 }),
        orb({ x: 198, heightAboveGround: 85, label: 'TAP!' }),
        block({ x: 260, width: 120, height: 36 })
      ]
    },
    {
      id: 'M6_FAKEOUT_POPUP_MAZE',
      difficulty: 'medium',
      fiechPose: 'ceil',
      fiechAction: 'laser',
      shout: 'FALLEN!',
      minBeats: 5,
      warnMarks: [{ x: 0, on: 'ground', width: 60 }],
      elements: () => [
        popup({ x: 15, width: 75 }),
        block({ x: 95, width: 95, height: 45, label: '▲ SAFE' }),
        popup({ x: 215, width: 90 }),
        orb({ x: 240, heightAboveGround: 85, label: 'TAP!' }),
        block({ x: 330, width: 80, height: 32 })
      ]
    },
    {
      id: 'M7_ELEVATOR_PISTON_PRESS',
      difficulty: 'medium',
      fiechPose: 'ceil',
      fiechAction: 'laugh',
      shout: 'FAHRSTUHL!',
      minBeats: 5,
      warnMarks: [{ x: 0, on: 'ground', width: 330 }],
      elements: () => [
        lava({ x: 30, width: 300 }),
        lift({ x: 65, width: 95, phase: 0 }),
        lift({ x: 200, width: 95, phase: Math.PI }),
      ]
    },

    // ------------------------------------------------------------ HARD
    {
      id: 'H1_GRAVITY_FLIP_COASTER',
      difficulty: 'hard',
      fiechAction: 'laugh',
      shout: 'GRAVITY FLIP!',
      minBeats: 6,
      warnMarks: [{ x: 0, on: 'ground', width: 18 }],
      elements: () => [
        portal({ x: 0, direction: 'down' }),
        track({ x: 0, width: 320 }),
        spike({ x: 135, onCeiling: true }),
        spike({ x: 260, onCeiling: true }),
        orb({ x: 275, heightBelowCeiling: 65, label: 'TAP!' }),
        spike({ x: 290, onCeiling: true }),
        portal({ x: 410, direction: 'up' }),
        block({ x: 460, width: 90, height: 32 })
      ]
    },
    {
      id: 'H2_LAVA_ORB_GAUNTLET',
      difficulty: 'hard',
      fiechPose: 'bg',
      fiechAction: 'laugh',
      shout: 'LAVA!',
      minBeats: 6,
      warnMarks: [{ x: 0, on: 'ground', width: 670 }],
      elements: () => [
        // 1) Start-Insel mit Pad -> erster Ring
        block({ x: 0, width: 60, height: 36 }),
        pad({ x: 20, power: PAD.MEDIUM, standsOnHeight: 36, label: 'LAUNCH!' }),
        lava({ x: 60, width: 260 }),
        orb({ x: 75, heightAboveGround: 213, label: 'TAP!' }),
        // 2) Weggabelung: der hohe Ring ist ein Köder, er verschwindet kurz vor dem Erreichen.
        //    Erst dann erscheint der tiefe Ring. Wer den Köder zu früh antippt, fällt in die Lava.
        orb({ x: 175, heightAboveGround: 215, vanishesWhenCloserThan: 75 }),
        orb({ x: 221, heightAboveGround: 133, label: 'JETZT!', appearsWhenBaitVanishes: true }),
        // 3) Mittel-Insel: Landung löst das starke Pad aus -> hoher Ring -> Ziel
        block({ x: 320, width: 110, height: 36 }),
        pad({ x: 355, power: PAD.STRONG, standsOnHeight: 36, label: 'BOOST!' }),
        lava({ x: 430, width: 140 }),
        orb({ x: 440, heightAboveGround: 250, label: 'TAP!' }),
        block({ x: 570, width: 100, height: 36 })
      ]
    },
    {
      id: 'H3_SCISSOR_LASER_RUSH',
      difficulty: 'hard',
      fiechAction: 'laser',
      shout: 'SCHEREN!',
      minBeats: 5,
      warnMarks: [{ x: 0, on: 'ground', width: 34 }],
      elements: () => [
        pad({ x: 60, power: PAD.MEDIUM, label: 'UP >>' }),
        scissors({ x: 160, closesAt: 'high', phase: 0 }),
        spike({ x: 200 }),
        block({ x: 235, width: 110, height: 48 }),
        scissors({ x: 375, closesAt: 'mid', phase: 0 })
      ]
    },
    {
      id: 'H4_FIECH_HUNTER_CHASE',
      difficulty: 'hard',
      fiechPose: 'topRight',
      fiechAction: 'laugh',
      shout: 'JAGD!',
      minBeats: 8,
      warnMarks: [{ x: 0, on: 'ground', width: 60 }],
      elements: () => [
        // 1) Treppe nach oben – das Fiech nimmt die Verfolgung auf
        block({ x: 0, width: 75, height: 32 }),
        block({ x: 100, width: 75, height: 62 }),
        block({ x: 200, width: 90, height: 92 }),
        // 2) Gipfel: das Pad schleudert dich über die Lava-Schlucht, unter dir rast das Fiech durch
        pad({ x: 230, power: PAD.MEDIUM, standsOnHeight: 92, label: 'ESCAPE!' }),
        lava({ x: 290, width: 95 }),
        // 3) Landeplattform, dann Abstieg zwischen Stacheln
        block({ x: 385, width: 100, height: 92, label: '▲ LAND' }),
        spike({ x: 510 }),
        spike({ x: 540 }),
        // 4) Das Fiech wendet und rast direkt auf deinen Landepunkt zu
        runner({ x: 700, speed: 1.4 }),
        spike({ x: 760 })
      ]    },
    {
      id: 'H5_CYBER_PINBALL_COMBO',
      difficulty: 'hard',
      fiechPose: 'topRight',
      fiechAction: 'laugh',
      shout: 'PINBALL!',
      minBeats: 5,
      warnMarks: [{ x: 0, on: 'ground', width: 34 }],
      elements: () => [
        pad({ x: 0, power: PAD.STRONG, label: 'PINBALL >>' }),
        lava({ x: 40, width: 380 }),
        bumper({ x: 70, heightAboveGround: 236 }),
        block({ x: 115, width: 80, height: 28 }),
        pad({ x: 150, power: PAD.STRONG, standsOnHeight: 28 }),
        orb({ x: 225, heightAboveGround: 250, label: 'TAP!' }),
        block({ x: 375, width: 85, height: 36 })
      ]
    },
    {
      id: FINAL_SEGMENT_ID,
      difficulty: 'hard',
      fiechPose: 'right',
      fiechAction: 'laugh',
      shout: 'FINAL GATE!',
      minBeats: 6,
      warnMarks: [{ x: 0, on: 'ground', width: 34 }],
      elements: () => [
        block({ x: 0, width: 110, height: 36, label: '▲ RUN UP' }),
        pad({ x: 70, power: PAD.MEDIUM, standsOnHeight: 36, label: 'BOOST' }),
        lava({ x: 115, width: 190 }),
        orb({ x: 133, heightAboveGround: 212, label: 'SMASH TAP!' }),
        gate({ x: 340 })
      ]
    }
  ];

  // Interne Form für die Stage-Logik
  return segments.map((s) => ({
    id: s.id,
    tier: TIER[s.difficulty],
    pose: s.fiechPose,
    act: s.fiechAction,
    call: s.shout,
    len: s.minBeats,
    mk: (s.warnMarks || []).map((m) => [m.x, m.on === 'ceiling' ? 'c' : 'g', m.width]),
    build: s.elements
  }));
}
