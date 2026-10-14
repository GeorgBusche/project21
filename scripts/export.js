/**
 * GEORG'S 21. GEBURTSTAG - EXPORT SKRIPT
 * 
 * Exportiert Gästeliste (CSV & Text), Party-Playlist, Einkaufsliste und ein JSON-Backup.
 * Aufruf im Terminal:
 *   npm run export
 * oder
 *   node scripts/export.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveDrinkCategory } from '../js/content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const exportsDir = path.join(rootDir, 'exports');

const DB_URL = 'https://project21-2cea0-default-rtdb.europe-west1.firebasedatabase.app';

function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}_${hh}-${mm}`;
}

function calculateDrinkEstimate(rsvpsList) {
  let beerDrinkers = 0;
  let kornDrinkers = 0;
  let wineDrinkers = 0;
  let driverDrinkers = 0;
  let totalPeople = 0;

  rsvpsList.forEach((r) => {
    const count = 1 + (r.plusOne ? 1 : 0);
    totalPeople += count;
    const category = resolveDrinkCategory(r.drink);
    if (category === 'korn') kornDrinkers += count;
    else if (category === 'wine') wineDrinkers += count;
    else if (category === 'driver') driverDrinkers += count;
    else beerDrinkers += count;
  });

  const beerCrates = Math.ceil((beerDrinkers * 4.5) / 24);
  const kornBottles = Math.ceil(kornDrinkers * 0.4);
  const colaBottles = Math.ceil(kornBottles * 2.5);
  const wineBottles = Math.ceil(wineDrinkers * 0.6);
  const softdrinkCrates = Math.ceil((totalPeople * 1.5) / 12);

  return {
    totalPeople,
    beerDrinkers,
    beerCrates,
    kornDrinkers,
    kornBottles,
    colaBottles,
    wineDrinkers,
    wineBottles,
    driverDrinkers,
    softdrinkCrates
  };
}

async function runExport() {
  console.log('\n========================================');
  console.log('   🎉 GEORG_v21.0 - DATEN EXPORT       ');
  console.log('========================================\n');

  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  const timestamp = formatDate(new Date());

  console.log('📡 Lade Daten von Firebase...');
  const [rsvpsRes, songsRes, snapsRes] = await Promise.all([
    fetch(`${DB_URL}/rsvps.json`),
    fetch(`${DB_URL}/songs.json`),
    fetch(`${DB_URL}/snaps.json`)
  ]);

  const rawRsvps = (await rsvpsRes.json()) || {};
  const rawSongs = (await songsRes.json()) || {};
  const rawSnaps = (await snapsRes.json()) || {};

  const rsvpsList = Object.entries(rawRsvps).map(([id, val]) => ({ id, ...val }));
  const songsList = Object.entries(rawSongs)
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));

  const totalGuests = rsvpsList.reduce((sum, r) => sum + 1 + (r.plusOne ? 1 : 0), 0);
  const totalVotes = songsList.reduce((sum, s) => sum + (s.votesCount || 0), 0);

  console.log(`✓ Geladen: ${rsvpsList.length} Anmeldungen (${totalGuests} Personen)`);
  console.log(`✓ Geladen: ${songsList.length} Songs (${totalVotes} Votes)`);
  console.log(`✓ Geladen: ${Object.keys(rawSnaps).length} Party-Snaps\n`);

  // 1. JSON Backup
  const backupPath = path.join(exportsDir, `backup_${timestamp}.json`);
  fs.writeFileSync(
    backupPath,
    JSON.stringify({ exportedAt: new Date().toISOString(), rsvps: rawRsvps, songs: rawSongs, snaps: rawSnaps }, null, 2),
    'utf-8'
  );
  console.log(`💾 Backup gespeichert: ${path.relative(rootDir, backupPath)}`);

  // 2. Gästeliste CSV (Excel-tauglich mit Semikolon & UTF-8 BOM)
  const csvPath = path.join(exportsDir, `gaesteliste_${timestamp}.csv`);
  const csvRows = [
    ['Name', 'Begleitung (+1)', 'Name Begleitung', 'Kraftstoff / Getränk', 'Ziel-Pegel (%)', 'Songwunsch', 'Notiz / Spruch an Georg', 'Datum'].join(';')
  ];

  rsvpsList.forEach((r) => {
    const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
    const songText = r.song ? `${r.song.title}${r.song.artist ? ' - ' + r.song.artist : ''}` : '';
    const dateText = r.updatedAt || r.timestamp ? new Date(r.updatedAt || r.timestamp).toLocaleString('de-DE') : '';
    csvRows.push([
      escapeCsv(r.name),
      escapeCsv(r.plusOne ? 'Ja' : 'Nein'),
      escapeCsv(r.plusOneName || ''),
      escapeCsv(r.drink || ''),
      escapeCsv(r.pegel || ''),
      escapeCsv(songText),
      escapeCsv(r.note || ''),
      escapeCsv(dateText)
    ].join(';'));
  });

  // UTF-8 BOM (\uFEFF) für problemloses Öffnen in Excel
  fs.writeFileSync(csvPath, '\uFEFF' + csvRows.join('\r\n'), 'utf-8');
  console.log(`📊 Gästeliste CSV:    ${path.relative(rootDir, csvPath)}`);

  // 3. Gästeliste Text-Zusammenfassung (WhatsApp / Druck)
  const txtPath = path.join(exportsDir, `gaesteliste_${timestamp}.txt`);
  let txtContent = `====================================================\n`;
  txtContent += `📋 GÄSTELISTE: GEORGS 21. GEBURTSTAG (${timestamp})\n`;
  txtContent += `Gesamt: ${totalGuests} Personen (${rsvpsList.length} Zusagen)\n`;
  txtContent += `====================================================\n\n`;

  if (rsvpsList.length === 0) {
    txtContent += `(Noch keine Zusagen eingetragen)\n`;
  } else {
    rsvpsList.forEach((r, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      txtContent += `[${num}] ${r.name}`;
      if (r.plusOne) {
        txtContent += ` +1 (${r.plusOneName || 'Begleitung'})`;
      }
      txtContent += `\n     ⛽ Getränk: ${r.drink || 'Keine Angabe'}`;
      txtContent += ` | 📈 Pegel: ${r.pegel || 0}%`;
      if (r.song) {
        txtContent += `\n     🎵 Song: ${r.song.title}${r.song.artist ? ' - ' + r.song.artist : ''}`;
      }
      if (r.note) {
        txtContent += `\n     💬 Notiz: "${r.note}"`;
      }
      txtContent += `\n\n`;
    });
  }

  fs.writeFileSync(txtPath, txtContent, 'utf-8');
  console.log(`📝 Gästeliste TXT:    ${path.relative(rootDir, txtPath)}`);

  // 4. Einkaufsliste & Getränkebedarf
  const estimate = calculateDrinkEstimate(rsvpsList);
  const einkaufPath = path.join(exportsDir, `einkaufsliste_${timestamp}.txt`);
  let einkaufContent = `====================================================\n`;
  einkaufContent += `🛒 EINKAUFSLISTE & GETRÄNKE-KALKULATION\n`;
  einkaufContent += `Basis: ${estimate.totalPeople} Personen (${timestamp})\n`;
  einkaufContent += `====================================================\n\n`;
  einkaufContent += `EMPFOHLENE GETRÄNKEMENGEN FÜR DEN GROSSEINKAUF:\n`;
  einkaufContent += `----------------------------------------------------\n`;
  einkaufContent += `🍺 BIER:\n`;
  einkaufContent += `   - ca. ${estimate.beerCrates} Kisten Bier (bei ca. ${estimate.beerDrinkers} Biertrinkern)\n\n`;
  einkaufContent += `🥃 HOCHPROZENTIGES & MISCHEN:\n`;
  einkaufContent += `   - ca. ${estimate.kornBottles} Flaschen Korn / Schnaps (bei ca. ${estimate.kornDrinkers} Misch-Fans)\n`;
  einkaufContent += `   - ca. ${estimate.colaBottles} Liter Cola / Mischgetränke\n\n`;
  einkaufContent += `🍷 WEIN / SEKT:\n`;
  einkaufContent += `   - ca. ${estimate.wineBottles} Flaschen Wein / Sekt (bei ca. ${estimate.wineDrinkers} Genießern)\n\n`;
  einkaufContent += `🥤 ALKOHOLFREI & SOFTDRINKS:\n`;
  einkaufContent += `   - ca. ${estimate.softdrinkCrates} Kisten Wasser / Softdrinks (Fahrer: ${estimate.driverDrinkers})\n\n`;
  einkaufContent += `💡 TIPP: Lieber etwas mehr auf Kommission kaufen, was ungeöffnet zurückgegeben werden kann!\n`;

  fs.writeFileSync(einkaufPath, einkaufContent, 'utf-8');
  console.log(`🛒 Einkaufsliste:     ${path.relative(rootDir, einkaufPath)}`);

  // 5. Party-Playlist TXT
  const playlistPath = path.join(exportsDir, `playlist_${timestamp}.txt`);
  let playlistContent = `====================================================\n`;
  playlistContent += `🎵 PARTY-PLAYLIST: DIE TOP-VOTES (${timestamp})\n`;
  playlistContent += `Tracks: ${songsList.length} | Gesamt-Votes: ${totalVotes}\n`;
  playlistContent += `====================================================\n\n`;

  if (songsList.length === 0) {
    playlistContent += `(Noch keine Songs vorgeschlagen)\n`;
  } else {
    songsList.forEach((s, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const votes = s.votesCount || 0;
      playlistContent += `[${num}] (${votes} Votes) ${s.title} - ${s.artist || 'Unbekannt'}\n`;
    });
  }

  fs.writeFileSync(playlistPath, playlistContent, 'utf-8');
  console.log(`🎵 Playlist TXT:      ${path.relative(rootDir, playlistPath)}`);

  console.log('\n========================================');
  console.log('✨ Export erfolgreich abgeschlossen!');
  console.log(`📁 Alle Dateien liegen im Ordner: exports/`);
  console.log('========================================\n');
}

runExport().catch((err) => {
  console.error('Fehler beim Exportieren:', err);
  process.exit(1);
});
