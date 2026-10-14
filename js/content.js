// Zentrale Steuerdatei (Single Source of Truth) für Eckdaten der Party.
export const EVENT_CORE = {
  hostName: 'Georg',
  age: 21,
  version: 'v21.0',
  phone: '4915174345666',

  adminPin: '2121',
  serverName: 'LOHHOF_49',
  // Nur hier Datum & Uhrzeit ändern – alles andere berechnet sich automatisch:
  partyDateIso: '2026-12-19', // YYYY-MM-DD der Party
  partyStartTime: '19:30', // Start-Uhrzeit (HH:MM)
  partyEndDateIso: '2026-12-20', // Ende am Folgetag
  partyEndTime: '06:00',
  partyModeUnlockIso: '2026-12-10T00:00:00', // Ab wann schaltet sich der Party-Modus frei?
  // Ort & Karte:
  locationName: 'Partyraum Lohhof 49',
  locationCity: '31600 Uchte',
  mapsUrl: 'https://maps.app.goo.gl/6eNiNjvt4FKFRNZV8',
  coords: [52.4832492, 8.8754388],
  siteUrl: 'https://GeorgBusche.github.io/project21', // <--- HIER DEINE GITHUB-PAGES-URL EINTRAGEN
  // Kurz-Infos:
  timeLabel: 'Ab 19:30 Uhr bis zum Systemabsturz',
  dresscode: 'Schick, verkleidet oder nackt... Mir doch egal!',
  gifts: 'Bringt einfach gute Laune mit!'
};

// Mittags-Uhrzeit vermeidet Zeitzonen-Verschiebungen beim Formatieren des reinen Datums.
const partyDate = new Date(`${EVENT_CORE.partyDateIso}T12:00:00`);

export const startIso = `${EVENT_CORE.partyDateIso}T${EVENT_CORE.partyStartTime}:00`;
export const endIso = `${EVENT_CORE.partyEndDateIso}T${EVENT_CORE.partyEndTime}:00`;
export const dateFormatted = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}).format(partyDate);
export const dateShort = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}).format(partyDate);
export const locationFull = `${EVENT_CORE.locationName}, ${EVENT_CORE.locationCity}`;

// Freischalt-Datum des Party-Modus, z. B. "10.12."
export const unlockDateShort = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit'
}).format(new Date(EVENT_CORE.partyModeUnlockIso));

const HOST_UPPER = EVENT_CORE.hostName.toUpperCase();

// ---------------------------------------------------------------------------
// UI: Header, Server-Label, Status, Action-Bar, Befehls-Gitter, SUDO-Shows, Modals
// ---------------------------------------------------------------------------
const UI = {
  // <--- HIER ANPASSEN
  headerTitle: `${HOST_UPPER}_${EVENT_CORE.version}`,
  pageTitle: 'PARTYRAUM KERNEL ' + EVENT_CORE.version + ' - ' + HOST_UPPER,
  serverLabel: 'SERVER:',
  serverName: EVENT_CORE.serverName,
  commandsHeading: '⚡ Befehle',
  commandsExpand: '▲ AUSKLAPPEN',
  commandsCollapse: '▼ EINKLAPPEN',
  statusLabel: 'STATUS:',
  statusBadge: {
    invite: 'BEREIT 🍻', // Einladungs-Modus
    live: '🔥 PARTY LIVE' // Party-Modus
  },
  countdown: {
    prefix: 'T-MINUS:',
    running: '🔥 ESKALATION LÄUFT!'
  },
  actionBar: {
    rsvp: { icon: '👍', label: 'ZUSAGEN' },
    rsvpEdit: { icon: '✏️', label: 'ZUSAGE ANPASSEN' },
    decline: { icon: '❌', label: 'ABSAGEN' },
    // Live-Party-Modus mit Zusage: ersetzt ZUSAGEN/ABSAGEN
    liveSnap: { icon: '📸', label: 'PARTY-SNAP' },
    liveVote: { icon: '🎧', label: 'NEXT SONG VOTE' }
  },
  commands: {
    // Phase 1: Einladungs-Modus (vor Freischaltung des Party-Modus)
    invite: {
      info: { icon: 'ℹ️', label: 'INFOS' },
      radar: { icon: '📡', label: 'RADAR' },
      guests: { icon: '👥', label: 'GÄSTE' },
      playlist: { icon: '🎵', label: 'PLAYLIST' },
      sudo: { icon: '🎲', label: 'SUDO' },
      partyLocked: { icon: '🔒', label: `PARTY-MODUS (${unlockDateShort})` }
    },
    // Phase 2: Party-Modus
    live: {
      nextSong: { icon: '🎧', label: 'NEXT SONG' },
      wheel: { icon: '🎡', label: 'GLÜCKSRAD' },
      drinkingGame: { icon: '💣', label: 'TRINKSPIEL' },
      snap: { icon: '📸', label: 'PARTY-SNAP' },
      gallery: { icon: '🖼️', label: 'GALERIE' },
      sudo: { icon: '🎲', label: 'SUDO' }
    },
    // Kleine Schnellzugriffs-Leiste im Party-Modus
    miniBar: {
      title: '🔥 Live',
      info: 'ℹ️ INFOS',
      radar: '📡 RADAR',
      guests: '👥 GÄSTE'
    },
    // Die Keys (bella, wolle, ...) sind technische IDs und müssen bleiben.
    sudoJukeboxRandom: '🎲 ZUFALLS-ESKALATION STARTEN',
    sudoShows: {
      bella: { title: '🍕 Bella Napoli', subtitle: 'Dorf-Abriss & Piazza' },
      wolle: { title: '🎸 Wolle Petry', subtitle: 'Flanell & Stadion-Nacht' },
      rammstein: { title: '🔥 Rammstein – Sonne', subtitle: 'Pyro & Industriestahl' },
      biertornado: { title: '🌪️ Biertornado', subtitle: 'Sturm & Druckbetankung' },
      ragecage: { title: '🥤 Rage Cage', subtitle: 'Arena & Becher-Chaos' },
      schuettelkorn: { title: '🌾 Schüttelkorn', subtitle: 'Ahoi-Brause & Heinz Erhardt' }
    }
  },
  // Header-Titel und Untertitel je Modal. Leerer Untertitel = keiner anzeigen.
  // (Trophäen- und Galerie-Zähler sind dynamisch und werden separat gesetzt.)
  modals: {
    rsvp: {
      title: `[+] ZUSAGE: ${HOST_UPPER}S ${EVENT_CORE.age}. GEBURTSTAG`,
      subtitle: `Registrierung für den ${EVENT_CORE.locationName}`
    },
    radar: { title: '[HUD] TAKTISCHE KARTE', subtitle: '' },
    music: {
      title: '[PARTY-PLAYLIST] WAS MUSS IN DIE PLAYLIST? 🪩',
      subtitle: 'Suche Songs, vote deine Favoriten & bestimme den Party-Sound!'
    },
    guest: { title: 'GÄSTELISTE & GÄSTEBUCH 👥', subtitle: '' },
    stats: {
      title: 'PARTY-RADAR & STATISTIKEN',
      subtitle: 'Live-Auswertung aller Anmeldungen'
    },
    sudoJukebox: { title: '[SUDO] JUKEBOX', subtitle: 'Wähle deine Eskalationsstufe' },
    trophies: { title: '[🏆] TROPHÄEN', subtitle: '' },
    ticket: { title: '[🎟️] DEIN VIP-TICKET', subtitle: '' },
    wheel: { title: '[🎡] GLÜCKSRAD-ROULETTE', subtitle: '' },
    drinkingGame: { title: '[💣] TRINKSPIELE', subtitle: '' },
    nextSong: { title: '[🎧] NEXT SONG (3er-LIVE-VOTE)', subtitle: '' },
    snap: { title: '[📸] PARTY-SNAP', subtitle: '' },
    gallery: { title: '[🖼️] PARTY-GALERIE', subtitle: '' },
    admin: {
      title: `[ROOT] ${HOST_UPPER} ADMIN-COCKPIT`,
      subtitle: 'Verwaltung, Exporte & Party-Kontrolle'
    }
  }
};

export const CONTENT = {
  ui: UI,

  // Zeilen beim Starten des Terminals (HTML erlaubt, `delay` in ms)
  bootSequence: [
    {
      text: "<span class='text-emerald-500'>[SYS]</span> Lade Linux kernel 6.8.0-partyraum-generic...",
      delay: 100
    },
    {
      text: "<span class='text-emerald-500'>[MEM]</span> Initialisiere Hopfenspeicher & Mischen... <span class='text-emerald-400 font-bold'>[OK]</span>",
      delay: 350
    },
    {
      text: "<span class='text-cyan-400'>[AUDIO]</span> Druckkammer Lohhof: 120 dB eingemessen... <span class='text-emerald-400 font-bold'>[MAX]</span>",
      delay: 750
    },
    {
      text: `<span class='text-emerald-500'>[AUTH]</span> Host: <strong class='text-emerald-200'>${EVENT_CORE.hostName}</strong> | Upgrade: <strong>v${EVENT_CORE.age - 1}.0 &rarr; ${EVENT_CORE.version}</strong>`,
      delay: 1700
    },
    { text: '------------------------------------------------------------', delay: 1950 },
    {
      text: `<span class='text-cyan-300 font-bold text-sm'>🚨 OFFIZIELLE EINLADUNG: ${HOST_UPPER}'S ${EVENT_CORE.age}. GEBURTSTAG 🚨</span>`,
      delay: 2150
    },
    {
      text: `Nutze die Action-Bar unten für <strong class='text-emerald-300 bg-emerald-950 px-1 rounded'>${UI.actionBar.rsvp.label}</strong> oder <strong class='text-amber-300'>${UI.commands.invite.sudo.label}</strong>.`,
      delay: 2550
    }
  ],

  // Schwellenwerte (0-100) beliebig änder-/erweiterbar: der erste Wert >= Pegel gewinnt.
  pegelDescriptions: {
    0: 'Fahrer-Modus: 0,0 Promille & Softdrinks 🚗',
    15: 'Ganz entspannt nippen & anstoßen 🥤',
    35: '1-2 Bierchen, lockeres Aufwärmen 🍻',
    55: 'Gute Grundstimmung, Tanzbein zuckt schon 🕺',
    75: 'Pegel stabil! Wo is der DJ? Lass mal Meiern! 🪩',
    90: 'Volle Fahrt voraus! Schüttelkorn & Mischen fließen 🎊',
    99: 'Gefahrenzone: Textsicher bei jedem Track! 🤪',
    100: 'ABRISS! WO IST DER TRICHTER?! VOLLGAS! 🚨💥'
  },

  declineGame: {
    declinedTag: 'ABGELEHNT',
    declinePhrases: [
      'FEHLER 403: Recht des Gastgebers §21 Abs. 1 greift! Anwesenheitspflicht.',
      'SYSTEM FEHLER: Mutti hat bereits gekocht!',
      'SEGMENTATION FAULT: Bier-Integral divergiert ohne dich!',
      'KERNEL PANIC: Kater lässt sich nicht wegdiskutieren!',
      'WARNUNG: Wer nicht kommt ist doof!'
    ],
    phaseLogs: {
      phase2: '[PHASE 2] Fiech ist erwacht. Fang es!',
      phase3: '[PHASE 3] GRAVITATIONS-ANOMALIE ENTDECKT!',
      phase4: '[PHASE 4] PANIK-MODUS! BILDSCHIRM WIRD INSTABIL!',
      phase5: '[PHASE 5] FIECH ARCADE GESTARTET... VIEL GLÜCK.'
    },

    // FIECH ARCADE (4 Stages) <--- HIER ANPASSEN
    arcade: {
      // Stage 3: Pyro-Bühne <--- HIER ANPASSEN
      stage3: {
        waveHints: ['NUR FLAMMEN · WEICH AUS', 'NEU: LASER · ROT BLINKT = GLEICH BRENNT ES', 'NEU: FIECH-STURZ · SCHATTEN = WARNUNG', 'LASER + STURZ + FLAMMEN', 'ACHTUNG // 5 SPUREN'],
        waves: ['WELLE 1 // VORGLÜHEN', 'WELLE 2 // FEUER FREI', 'WELLE 3 // LASERSHOW', 'WELLE 4 // INFERNO', 'WELLE 5 // ZUGABE']
      },
      stage4: {
        name: 'OMEGA-FIECH',
        subtitle: 'DER DURSTIGE KOLOSS',
        phases: [
          { name: 'PHASE 1 // SCHNAPSLATTE & KORN-LASER', hint: 'Rot = Gefahr · Grün = Lücke · Gold = Konter' },
          { name: 'PHASE 2 // SCHÜTTELKORN & KRONKORKEN', hint: 'Fiech-Sturzflug · Sägen rollen · Gold einsammeln' },
          { name: 'PHASE 3 // TAKT-BLITZ', hint: 'Gerade / ungerade Spuren im Beat wechseln' },
          { name: 'PHASE 4 // STAMMTISCH-MELTDOWN', hint: 'Zweite Lücke: FINAL SMASH-Ring treffen!' }
        ],
        calls: {
          slam: 'SCHNAPSLATTE!',
          beam: 'KORN-STRAHL!',
          shake: 'SCHÜTTELKORN!!',
          saw: 'KRONKORKEN!',
          blitz: 'TAKT-BLITZ!',
          counter: ['PROST!', 'EX ODER KELLER!', 'SCHÜTTELN!'],
          safe: '✓ SAFE',
          hit: '⚡ HIT BOSS!',
          smash: 'FINAL SMASH!',
          ko: 'BOSS ZERLEGT // 100%'
        }
      },      toast: 'FIECH ARCADE GESTARTET',
      title: '👾 FIECH ARCADE',
      stageNames: [
        'STAGE 1 · FIECH-RUN',
        'STAGE 2 · FIECH AIRWAYS',
        'STAGE 3 · LIVE-SHOW',
        'STAGE 4 · OMEGA-FIECH'
      ],
      stageHints: [
        'Tippen / Leertaste = Springen',
        'Halten = Schub · Loslassen = Sinken',
        'Spur antippen / ←→ · Flammen sammeln, Minen & Fiech-Sturz meiden',
        'Spur per Pad/Tap wählen · Rot = Gefahr · Gold = Konter'
      ],
      excuses: [
        '🛋️ Sofa ruft',
        '🤕 Kopfweh',
        '👵 Oma-Geburtstag',
        '🌧️ Es regnet',
        '🐕 Hund',
        '📺 Serie läuft',
        '🥱 Zu müde',
        '💼 Arbeit',
        '🧺 Wäsche',
        '🚿 Duschen',
        '📵 Akku leer',
        '🐟 Fisch füttern'
      ],
      bossName: `OMEGA-FIECH v${EVENT_CORE.age}.0`,
      gameOver: {
        title: '💀 SYSTEM CRASH',
        retry: '🔄 NOCHMAL VERSUCHEN',
        giveUp: '🏳️ AUFGEBEN & ZUSAGEN',
        board: '🏆 BESTENLISTE ANSEHEN',
        back: '⬅️ ZURÜCK'
      },
      victory: {
        title: '🏆 ABSAGE-MODUL VERNICHTET!',
        subtitle: '100% DURCHGESPIELT',
        text: '... Leider ist bei der Explosion auch das Absage-Modul der Webseite komplett abgebrannt.',
        button: '👍 Na gut, dann halt ZUSAGEN (Ehren-Gast)'
      },
      boardTitle: '🏆 TOP 10 · FIECH ARCADE',
      boardEmpty: 'Noch niemand hat sich getraut. Sei der Erste!',
      victoryLog: '[ARCADE] Das Absage-Fiech wurde vernichtet! 100%',
      giveUpLog: '[ARCADE] Du ergibst dich und sagst zu.'
    }
  },

  secretCli: {
    // `ls` und `cat` lesen automatisch alle Keys. Beliebig erweiterbar.
    virtualFiles: {
      'geheimplan.txt':
        'PHASE 1: Ankommen & Pils.\nPHASE 2: Mischen.\nPHASE 3: ???\nPHASE 4: Profit (und Kater).\nStatus: Plan wird nicht eingehalten.',
      'bierzelt_protokoll.log': `[${EVENT_CORE.partyStartTime}] Erster Anstich. Stimmung: stabil.\n[21:12] Hubiturm auf Warnstufe Gelb.\n[23:47] Jemand hat "nur noch eins" gesagt.\n[03:00] lim Promille = 1.8. q.e.d.`,
      'georg_v21.conf': `host=${EVENT_CORE.hostName}\nversion=${EVENT_CORE.age}.0\nbier_leitung=1\ndresscode=mir_doch_egal\nkater_modus=morgen_problem\nmax_pegel=ABRISS`
    },
    // Eingabe-Prompt und Ziel für `ping <ziel>`
    prompt: 'gast@lohhof49:~$',
    pingTarget: 'lohhof',
    // Ausgabe von `help` (eine Zeile pro Eintrag)
    helpLines: [
      'Verfügbare Kernel-Befehle:',
      '  help               diese Hilfe',
      '  sudo [show]        SUDO-Show starten (bella, wolle, rammstein, biertornado, ragecage, schuettelkorn)',
      '  drunk              Promille-Simulation an/aus',
      '  flip | barrelroll  Bildschirm drehen',
      '  ls | cat <datei>   virtuelle Dateien',
      '  whoami             dein Gast-Profil',
      '  ping lohhof        Verbindung zum Partyraum',
      '  trophies           deine Trophäen',
      '  clear | cls        Terminal leeren',
      '  root | su          Admin-Login',
      '  exit               Eingabezeile schließen'
    ],
    // Hinweise in der Browser-Konsole
    consoleHint: [
      'Psst. Es gibt ein geheimes Terminal.',
      `  1) Klick oben im Terminal auf "${UI.serverLabel.replace(/:$/, '')}: ${EVENT_CORE.serverName}" (oder tipp am Desktop einfach los).`,
      '  2) Befehle: help | sudo [bella|wolle|rammstein|biertornado|ragecage|schuettelkorn] | drunk | flip | ls | cat <datei> | whoami | ping lohhof | trophies | clear | root | exit',
      '  Tipp: Sammle alle Trophäen.'
    ],
    drunkOn: '[KERNEL] Promille-Simulation aktiviert',
    drunkOff: '[KERNEL] Promille-Simulation deaktiviert. Nüchtern. Langweilig.',
    flipOn: '[KERNEL] Gravitation invertiert. Viel Spaß!',
    flipOff: '[KERNEL] Gravitation wiederhergestellt.',
    pingReply: '64 bytes from lohhof49 (Bierleitung_1): time=0.21ms - Pegel stabil',
    // HTML erlaubt
    matheFormula:
      'Sei N die Menge aller Gäste. &forall; x &isin; N gilt: lim<sub>t &rarr; 03:00</sub> Promille(x) &ge; 1.8. q.e.d.'
  },

  // Texte des VIP-Tickets (Canvas). Der große Titel wird aus Host-Name & Alter berechnet.
  ticket: {
    headerLine: `🚨 KERNEL ACCESS PASS // PROJECT ${EVENT_CORE.age}.0`,
    vipLine: 'VIP BACKSTAGE & DRUCKKAMMER LOHHOF',
    // Rang je Pegel: der erste Eintrag mit maxPegel >= Pegel gewinnt (aufsteigend sortiert lassen).
    ranks: [
      { maxPegel: 0, label: 'FAHRER-EINHEIT // 0,0‰' },
      { maxPegel: 35, label: 'WARM-UP CREW' },
      { maxPegel: 75, label: 'PARTY-OPERATIVE' },
      { maxPegel: 90, label: 'ESKALATIONS-STUFE' },
      { maxPegel: 100, label: 'ABRISS-OVERDRIVE // MAX LEVEL' }
    ],
    unlockedRanksTitle: '🏆 FREIGESCHALTETE RÄNGE',
    boxes: {
      date: '📅 DATUM & ZEIT',
      location: '📍 SEKTOR / ORT',
      drink: '⛽ KRAFTSTOFF',
      pegel: '📈 ZIEL-PEGEL',
      song: '🎵 PERSÖNLICHE HYMNE'
    },
    drinkFallback: 'Überraschung',
    noSong: 'Noch keine Hymne gewählt – DJ entscheidet!',
    unknownArtist: 'Unbekannter Interpret',
    stamp: '✓ ZUTRITT GEWÄHRT',
    footerLines: ['OFFIZIELLES ZUGANGSTICKET ·', 'SCREENSHOT ODER SPEICHERN FÜR INSTA / WHATSAPP']
  },
  // WhatsApp-Nachricht nach der Zusage
  whatsappTemplate({ wasExisting, hostName, age, name, hasPlusOne, plusOneName, drink, pegelValue, pegelText, songPayload, note }) {
    const head = wasExisting
      ? `🚨 Zusage-Update für deinen ${age}. Geburtstag! 🚨\nMoin ${hostName},\n\nhier ist ein Update zu meiner Zusage:`
      : `🚨 Zusage für deinen ${age}. Geburtstag! 🚨\nMoin ${hostName},\n\nBin dabei!`;
    let message =
      `${head}\n👤 Name: ${name}\n👥 Begleitung: ${hasPlusOne ? plusOneName || 'Ja (+1)' : 'Nein'}` +
      `\n⛽ Kraftstoff: ${drink}\n📊 Pegel: ${pegelValue}% (${pegelText})`;
    if (songPayload) {
      message += `\n🎵 Party-Playlist: ${songPayload.title}${songPayload.artist ? ` - ${songPayload.artist}` : ''}`;
    }
    if (note) message += `\n💬 Ansage / Wunsch: ${note}`;
    return message;
  },
  // Kalender-Eintrag (.ics)
  calendar: {
    summary: `🚨 ${EVENT_CORE.hostName}s ${EVENT_CORE.age}. Geburtstag (${EVENT_CORE.locationName})`,
    uidDomain: 'lohhof49'
  },

  partyMode: {
    duelTitle: 'LOHHOF-DUELL',
    lockedMessage: `🔒 Party-Features (Glücksrad, Trinkspiel, Live-Voting & Snap-Cam) starten am ${unlockDateShort}!`,
    unlockedToast: '🔥 PARTY-MODUS AKTIV! Neue Features freigeschaltet.',
    shotsList: [
      '🗼 Der Hubiturm muss wachsen!',
      '🎊 SCHÜTTELKORN!!!',
      '😩 Ich trink Ouzo was trinkst du so? ',
      '🍞 ET GIBT KORN!!!',
      '🫎 JÄGERMEISTER!',
      '🥃 Vodka is auch ne Option...'
    ],
    wheelCombos: [
      `Trinkt einen Schüttelkorn mit ${EVENT_CORE.hostName}`,
      'Muss den nächsten Song ansagen',
      'Ex oder Trichter!',
      'Verteilt 2 Shots',
      'Erzählt die peinlichste Party-Story',
      'Darf jemandem einen Schluck zuteilen',
      'Muss 30 Sekunden lang Wolle Petry singen',
      'Prostet allen mit einem Trinkspruch zu'
    ],
    // Fragen/Kategorien für "Kernel-Bombe"
    bombPrompts: [
      'Nenne eine Biermarke',
      'Nenne einen Song von Wolle Petry',
      'Nenne einen Grund für Kater',
      'Nenne ein Mischgetränk',
      'Nenne einen Ort in Uchte oder Umgebung',
      'Nenne einen Schlager-Hit',
      'Nenne etwas, das man auf einer Party vergisst',
      'Nenne einen Song von Rammstein',
      'Nenne eine Ausrede fürs Zuspätkommen',
      'Nenne ein Trinkspiel',
      'Nenne etwas, das in einen Dönerteller gehört',
      'Nenne einen Schnaps',
      'Nenne ein Wort, das man nach 3 Uhr morgens sagt',
      'Nenne eine Kneipe oder Disco',
      'Nenne einen Kartoffel-Snack'
    ],
    // Aufgaben für das "Lohhof-Duell"
    duelPrompts: [
      '⚡ Schere-Stein-Papier auf 1 – Verlierer trinkt!',
      '🍻 Staring-Contest: Wer zuerst blinzelt, holt die nächste Runde!',
      '🎤 Wer kann den Refrain von Bella Napoli lauter singen?',
      '🦵 Wer hält länger auf einem Bein? Verlierer trinkt!',
      '🤐 Wer zuerst lacht, trinkt – 30 Sekunden Blickkontakt!',
      '🧠 Abwechselnd Biermarken nennen – wer stockt, trinkt!',
      `🕺 Tanz-Battle zu ${EVENT_CORE.hostName}s nächstem Song – Publikum entscheidet!`,
      '🤏 Daumendrücken: Wer verliert, trinkt!',
      '🎯 Wer würde eher nackt in den Teich springen? Zeigt auf einen, Mehrheit entscheidet!',
      '🥇 Wer würde eher als Letzter die Party verlassen? Abstimmung per Fingerzeig!',
      `🎭 Imitiert ${EVENT_CORE.hostName} – wer besser ist, darf einen Trinkspruch verteilen!`,
      '📵 Wer zuerst aufs Handy schaut, trinkt – 2 Minuten Handyverbot!',
      '🍺 Wettrennen: Wer sein Glas zuerst leer hat, darf den anderen Shots zuteilen!',
      '🗣️ Wer würde eher einen Ex-Anruf um 3 Uhr nachts machen? Gruppe entscheidet!',
      '🎸 Luftgitarren-Duell zu Wolle Petry – Applaus entscheidet!'
    ],
    // Die `id`s sind technische Schlüssel (zeichnen den passenden Filter) und müssen bleiben.
    snapFilters: [
      {
        id: 'scanner',
        label: '🤖 PEGEL-SCANNER',
        hud: `${EVENT_CORE.serverName} // CAM_01`,
        stamps: [
          'SCAN: PEGEL KRITISCH 🚨',
          'SCAN: PEGEL STABIL 🍻',
          'SCAN: DURST ERKANNT 💧',
          'SCAN: SCHÜTTELKORN-ALARM 🌾',
          'SCAN: TANZBEIN AKTIV 🕺'
        ]
      },
      { id: 'wolle', label: '🎸 WOLLE-MODUS', stamps: ['WAHNSINN! 🎸'] },
      {
        id: 'rammstein',
        label: '🔥 RAMMSTEIN-PYRO',
        stamps: [`FEUER FREI // ${HOST_UPPER} ${EVENT_CORE.age}`]
      },
      {
        id: 'schuettelkorn',
        label: '🎊 SCHÜTTELKORN-BRAUSE',
        stamps: ['ERST SCHÜTTELN, DANN TRINKEN! 🌾']
      },
      {
        id: 'polaroid',
        label: '📸 POLAROID LOHHOF',
        stamps: [`${HOST_UPPER}S ${EVENT_CORE.age}. GEBURTSTAG`],
        subStamp: `${dateShort} · LOHHOF`
      }
    ]
  },

  // Arcade-Soundtrack: Track, Takt-Raster und Loop-Abschnitte je Stage.
  arcadeAudio: {
    // <--- HIER ANPASSEN: Standardpfad (assets/audio/fear.mp3) wird mit dem Build gebündelt,
    // jeder andere Pfad wird relativ zur Seite geladen (z. B. Datei in public/ ablegen).
    trackUrl: 'assets/audio/fear.mp3',
    baseBpm: 105, // Basis-BPM von "Fear" (für das mathematische Takt-Raster)
    beatOffsetSec: 0.0, // Fein-Offset für den ersten Taktschlag in Sekunden
    // Der Track läuft als EIN durchgehender Stream (Loop über den ganzen Song). Jede Stage verändert nur
    // Tempo (playbackRate) und Filter-Cutoff (Hz) per sanfter Rampe (0,45 s).
    // Stage 1 öffnet den Filter bei Beat `openBeat` auf `openHz`.
    stage1Open: { openBeat: 8, openHz: 12000 },
    // DEV-Direktstart ab Stage 2: Beat, an dem der Drop beginnt (Takt 16 von fear.mp3 = Beat 64)
    devDropBeat: 64,
    stages: {
      1: { rate: 1.0, filterHz: 2600, label: 'STAGE 1 // DARK PULSE' },
      2: { rate: 1.06, filterHz: 18000, label: 'STAGE 2 // MAIN DROP' },
      3: { rate: 1.12, filterHz: 20000, label: 'STAGE 3 // HIGH VOLTAGE' },
      4: { rate: 1.19, filterHz: 20000, label: 'STAGE 4 // FINAL BOSS' }
    }
  },

  // Texte der Trophäen. Die Keys (legende, eskalierer, ...) sind technische IDs.
  achievements: {
    legende: {
      title: 'Party-Legende',
      desc: 'Alle 5 anderen Trophäen freigeschaltet. Absoluter Endgegner!',
      hint: 'Schalte alle 5 anderen Trophäen frei.'
    },
    eskalierer: {
      title: 'Vollzeit-Eskalierer',
      desc: 'Alle 6 SUDO-Shows komplett durchgezogen.',
      hint: 'Sechs Shows. Eine Jukebox (SUDO gedrückt halten). Kein Entkommen.'
    },
    sturkopf: {
      title: 'Fiech-Bändiger',
      desc: 'Die FIECH ARCADE auf 100% durchgespielt und das Absage-Modul vernichtet.',
      hint: 'Nein heißt nein? Sag hartnäckig ab – und überlebe die Arcade.'
    },
    hacker: {
      title: 'System-Hacker',
      desc: 'Geheimes Terminal geknackt, vertrauliche Datei gelesen und System-Physik manipuliert.',
      hint: `Klicke auf ${UI.serverLabel} ${EVENT_CORE.serverName}, lies eine Datei (cat) und verdreh die Optik (drunk/flip).`
    },
    dj: {
      title: 'Resident-DJ',
      desc: 'Mindestens 3 Songs für die Party-Playlist gevotet und eine Hörprobe gecheckt.',
      hint: 'Hör in einen Track rein (▶️) und gib mindestens 3 Songs deine Stimme.'
    },
    vollgas: {
      title: 'Vollgas-Pionier',
      desc: '100% Ziel-Pegel eingeloggt oder 5x das Schicksal (Pegel-Würfel / Glücksrad) herausgefordert.',
      hint: 'Dreh den Pegel-Regler auf 100% oder würfle 5x deinen Pegel (🎲).'
    }
  }
};

// Getränke: `id` und `category` sind stabil, `label` darf frei umbenannt werden.
export const DRINKS_CONFIG = [
  { id: 'pils', label: '🍺 Kühles Pils', category: 'beer', icon: '🍺' },
  { id: 'mische', label: '🥃 Cola-Korn / 50/50 Mischen', category: 'korn', icon: '🥃' },
  { id: 'schuettelkorn', label: '🎊 SCHÜTTELKORN!!!', category: 'korn', icon: '🎊' },
  { id: 'omas', label: '🥶 Omas Guter ;)', category: 'korn', icon: '🥶' },
  { id: 'wein', label: '🍷 Wein / Sekt', category: 'wine', icon: '🍷' },
  { id: 'fahrer', label: '🚗 Fahrer-Modus (0,0 Promille)', category: 'driver', icon: '🚗' },
  { id: 'eigenes', label: '🎒 Bring eigenes Zeug mit', category: 'other', icon: '🎒' }
];

export const DRINK_CATEGORY_EMOJI = { beer: '🍺', korn: '🥃', wine: '🍷', driver: '🚗' };

export function findDrinkConfig(drinkValueOrId) {
  const value = String(drinkValueOrId ?? '').trim();
  if (!value) return null;
  return DRINKS_CONFIG.find((d) => d.id === value || d.label === value) || null;
}

// Ermittelt die Kategorie per id/label, sonst per Regex für alte DB-Einträge.
export function resolveDrinkCategory(drinkValueOrId) {
  const known = findDrinkConfig(drinkValueOrId);
  if (known) return known.category;
  const d = String(drinkValueOrId ?? '').toLowerCase();
  if (/pils|bier/.test(d)) return 'beer';
  if (/korn|mische|omas/.test(d)) return 'korn';
  if (/wein|sekt/.test(d)) return 'wine';
  if (/fahrer|0,0|softdrink/.test(d)) return 'driver';
  return 'other';
}
