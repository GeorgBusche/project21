// Song-Ausschnitte der SUDO-Shows fuer Stage 4 (Start/Laenge in Sekunden in der jeweiligen MP3).
// Die Dateien sind kurze, bereits zugeschnittene Clips: gespielt wird (fast) die komplette Datei, am Ende laeuft ein Filter-Fade.
export const SONGS = {
  napoli: { file: 'bella_napoli.mp3', start: 0, len: 6.4 },
  gas: { file: 'gas.mp3', start: 0, len: 14.0 },
  tornado: { file: 'biertornado.mp3', start: 0, len: 17.6 },
  wolle: { file: 'wolle.mp3', start: 0, len: 18.6 },
  schuetteln: { file: 'schuettelkorn.mp3', start: 0, len: 17.4 },
  sonne: { file: 'sonne.mp3', start: 0, len: 31.6 }
};

// Playlist je Boss-Phase (Index = Phase): jede Phase hat genau einen eigenen Song, Rammstein (Sonne) ist das lange Finale
export const PLAYLISTS = [['napoli'], ['gas'], ['tornado'], ['wolle'], ['schuetteln'], ['sonne']];
