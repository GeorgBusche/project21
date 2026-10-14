import {
  EVENT_CORE,
  CONTENT,
  DRINKS_CONFIG,
  startIso,
  endIso,
  dateFormatted,
  dateShort,
  locationFull
} from './content.js';

export { EVENT_CORE, CONTENT, DRINKS_CONFIG };

export const CONFIG = {
  event: EVENT_CORE,
  content: CONTENT,
  drinks: DRINKS_CONFIG,
  firebase: {
    apiKey: 'AIzaSyDhQTJJSmk6L1XGIvwRIjR03VHY4HXUZ1A',
    authDomain: 'project21-2cea0.firebaseapp.com',
    databaseURL: 'https://project21-2cea0-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'project21-2cea0',
    storageBucket: 'project21-2cea0.firebasestorage.app',
    messagingSenderId: '879692488069',
    appId: '1:879692488069:web:82a55d6a3d5b39bfaa38ec',
    measurementId: 'G-35C5HH0RF0'
  },
  party: {
    hostName: EVENT_CORE.hostName,
    phone: EVENT_CORE.phone,
    date: dateFormatted,
    dateShort,
    time: EVENT_CORE.timeLabel,
    startIso,
    endIso,
    location: locationFull,
    mapsUrl: EVENT_CORE.mapsUrl,
    dresscode: EVENT_CORE.dresscode,
    gifts: EVENT_CORE.gifts,
    partyModeUnlockIso: EVENT_CORE.partyModeUnlockIso,
    spotify: { clientId: '', playlistId: '' },
    adminPin: EVENT_CORE.adminPin
  },
  // Auf einen Songnamen setzen, um den SUDO-Button vorübergehend darauf zu fixieren.
  // Erlaubt: "bella", "wolle", "rammstein", "biertornado", "ragecage", "schuettelkorn".
  // Zum Testen z.B. "biertornado" eintragen und danach wieder auf null setzen.
  sudoTestSong: null,
  game: {
    phase2_clicks: 4,
    phase3_clicks: 7,
    phase4_clicks: 11,
    phase5_clicks: 15,
    jumpIntervalSlow: 1100,
    jumpIntervalFast: 700
  }
};
