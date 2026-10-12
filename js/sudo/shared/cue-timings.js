// Cue-Zeiten in Millisekunden ab Musikstart.
// Einzelne Cue-Zeiten unten anpassen; pro Song lassen sich alle Cues gemeinsam
// über SUDO_CUE_OFFSETS vor- oder zurückverschieben.
export const SUDO_CUE_TIMINGS = {
  bella: {
    hit1: 250, // "bella"
    hit2: 2000, // "bella"
    drop: 3400 // "napoli"
  },
  wolle: {
    cut1_bronze: 100, // "bronze"
    cut2_silber: 500, // "silber"
    cut3_gold: 900, // "gold"
    cut4_niegewollt: 1500, // "nie gewollt"
    cut5_ichwill: 3950, // "ich will"
    cut6_allein: 5500, // "nur dich allein"
    cut7_bronze2: 7100, // "bronze silber gold"
    cut8_niegewollt2: 8900, // "nie gewollt"
    cut9_nureins: 11000, // "ich will nur eins"
    cut10_allein2: 12500 // "nur dich allein"
  },
  rammstein: {
    eins: 6500, // "eins"
    sonne1: 8300, // "hier kommt die sonne"
    zwei: 13000, // "zwei"
    sonne2: 14800, // "hier kommt die sonne"
    drei: 19100, // "drei"
    stern: 20000, // "hellste stern"
    vier: 25500, // "vier"
    sonne3: 27300 // "hier kommt die sonne"
  },
  biertornado: {
    c1_sturm: 100, // "sturm"
    c2_ricardo: 800, // "ricardo"
    c3_bier: 2100, // "bier"
    c4_tornado: 2600, // "tornado"
    c5_gib1: 3500, // "gib"
    c6_mal1: 3800, // "mal"
    c7_bier1: 4050, // "bier"
    c8_gib2: 4400, // "gib"
    c9_mal2: 4700, // "mal"
    c10_bier2: 4950, // "bier"
    c11_ladung: 5300, // "ladung"
    c12_sternburg: 7700, // "sternburg"
    c13_anzug: 8700, // "anzug"
    c14_meine: 9800, // "meine"
    c15_tarnung: 10800, // "tarnung"
    c16_gib3: 11200, // "gib"
    c17_mal3: 11500, // "mal"
    c18_bier3: 11750, // "bier"
    c19_gib4: 12100, // "gib"
    c20_mal4: 12400, // "mal"
    c21_bier4: 12650, // "bier"
    c22_warnung: 13800 // "warnung"
  },
  ragecage: {
    c1_gas1: 100, // "gas"
    c2_gas2: 800, // "gas"
    c3_gas3: 1500, // "gas"
    c4_gas4: 1900, // "gas"
    c5_gas5: 2300 // "gas"
  },
  schuettelkorn: {
    c1_traurig1: 100, // "traurig"
    c2_korn1: 2900, // "korn"
    c3_traurig2: 4500, // "traurig"
    c4_brause_alert: 5500, // "ahoi brause"
    c5_korn2: 7500, // "korn"
    c6_traurig3: 8500, // "traurig"
    c7_schuetteln: 11000, // "schuetteln"
    c8_korn3: 12300, // "korn"
    c9_undwenn: 13500, // "und dann"
    c11_vorn: 16000 // "von vorn"
  }
};

// Positive Werte verschieben die Einblendungen nach hinten, negative nach vorn.
const SUDO_CUE_OFFSETS = {
  bella: -50,
  wolle: -100,
  rammstein: -250,
  biertornado: -250,
  ragecage: 70,
  schuettelkorn: 250
};

for (const [song, cues] of Object.entries(SUDO_CUE_TIMINGS)) {
  const offset = SUDO_CUE_OFFSETS[song] || 0;
  for (const cue of Object.keys(cues)) {
    cues[cue] += offset;
  }
}

export const startSudoTimeline = (audio, startTimeline, songName, onAudioFailure) => {
  let started = false;
  const startOnce = () => {
    if (started) return;
    started = true;
    startTimeline();
  };
  const reportFailure = (error) => {
    console.warn(`${songName} audio could not start; starting its timeline without music.`, error);
    if (typeof window.parent.appendLine === 'function') {
      window.parent.appendLine(
        `<span class='text-yellow-400 font-bold'>[AUDIO] ${songName}: Musiktitel konnte nicht starten; Animation läuft ohne Musik.</span>`
      );
    }
    if (onAudioFailure) onAudioFailure(error);
    startOnce();
  };

  if (!audio || !audio.src) {
    reportFailure(new Error('Audio source is missing.'));
    return;
  }

  try {
    audio.currentTime = 0;
    audio.volume = 1;
    const playAttempt = audio.play();
    if (playAttempt && typeof playAttempt.then === 'function') {
      playAttempt.then(startOnce, reportFailure);
    } else {
      startOnce();
    }
  } catch (error) {
    reportFailure(error);
  }
};
