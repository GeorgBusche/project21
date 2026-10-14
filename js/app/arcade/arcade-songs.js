// Song-Ausschnitte der SUDO-Shows fuer den DJ-Modus von Stage 4 (Start/Laenge in Sekunden in der jeweiligen MP3).
// Die Schnitte liegen auf Energie-Tiefpunkten (Takt-/Satzgrenzen); am Ende laeuft ein Filter-Fade, damit nichts hart abreisst.
export const SONGS = {
  sonne: { file: 'sonne.mp3', start: 5.6, len: 7.3 },
  tornado: { file: 'biertornado.mp3', start: 0, len: 8.8 },
  gas: { file: 'gas.mp3', start: 0, len: 7.0 },
  schuetteln: { file: 'schuettelkorn.mp3', start: 4.5, len: 7.6 },
  wolle: { file: 'wolle.mp3', start: 0, len: 7.0 }
};

export const SONG_SET = ['sonne', 'tornado', 'gas', 'schuetteln', 'wolle'];
