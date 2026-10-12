const CONFIG = {
  firebase: {
    apiKey: "AIzaSyDhQTJJSmk6L1XGIvwRIjR03VHY4HXUZ1A",
    authDomain: "project21-2cea0.firebaseapp.com",
    databaseURL: "https://project21-2cea0-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "project21-2cea0",
    storageBucket: "project21-2cea0.firebasestorage.app",
    messagingSenderId: "879692488069",
    appId: "1:879692488069:web:82a55d6a3d5b39bfaa38ec",
    measurementId: "G-35C5HH0RF0"
  },
  party: {
    hostName: "Georg",
    phone: "4915174345666", 
    date: "Samstag, 19.12.2026",
    time: "Ab 19:30 Uhr bis zum Systemabsturz",
    location: "Partyraum Lohhof 49, 31600 Uchte",
    mapsUrl: "https://maps.app.goo.gl/6eNiNjvt4FKFRNZV8",
    dresscode: "Schick, verkleidet oder nackt... Mir doch egal!"
  },
  game: {
    phase2_clicks: 4,      
    phase3_clicks: 7,      
    phase4_clicks: 11,     
    phase5_clicks: 15,     
    jumpIntervalSlow: 1100,  
    jumpIntervalFast: 700    
  },
  pegelDescriptions: {
    0: "p = 0.0 : Also ich bleibe nüchtern! (Fahrer / Softdrinks)",
    25: "p = √2 : 1-2 Bierchen und dann mal sehen...",
    50: "p = e¹ : Die Tanzfläche ist mein! Wo is der DJ?",
    75: "p = π² : Lass mal ne Runde Meiern!",
    100: "p → ∞ : WO IST DER TRICHTER? (VOLLGAS!)"
  },
  shotsList: [
    "🗼 Der Hubiturm muss wachsen!",
    "🎊 SCHÜTTELKORN!!!",
    "😩 Ich trink Ouzo was trinkst du so? ",
    "🍞 ET GIBT KORN!!!",
    "🫎 JÄGERMEISTER!",
    "🥃 Vodka is auch ne Option..."
  ],
  declinePhrases: [
    "FEHLER 403: Recht des Gastgebers §21 Abs. 1 greift! Anwesenheitspflicht.",
    "SYSTEM FEHLER: Mutti hat bereits gekocht!",
    "SEGMENTATION FAULT: Bier-Integral divergiert ohne dich!",
    "KERNEL PANIC: Kater lässt sich nicht wegdiskutieren!",
    "WARNUNG: Wer nicht kommt ist doof!"
  ]
};

// GLOBALE ZUSTÄNDE (Wichtig für die Sudo-Skripte)
window.isSudoRunning = false;
window.canSkip = false;
window.lastSudoParty = null;