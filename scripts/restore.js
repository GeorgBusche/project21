/**
 * GEORG'S 21. GEBURTSTAG - RESTORE SKRIPT
 * 
 * Stellt ein Backup aus einer JSON-Datei in Firebase wieder her.
 * 
 * Aufruf im Terminal:
 *   node scripts/restore.js backups/backup_2026-10-13....json
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const DB_URL = 'https://project21-2cea0-default-rtdb.europe-west1.firebasedatabase.app';

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('❌ Bitte gib den Pfad zur Backup-Datei an:');
    console.error('   node scripts/restore.js backups/dein_backup.json');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Datei nicht gefunden: ${filePath}`);
    process.exit(1);
  }

  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const rsvps = content.rsvps || {};
  const songs = content.songs || {};
  const snaps = content.snaps || {};

  const rsvpCount = Object.keys(rsvps).length;
  const songCount = Object.keys(songs).length;
  const snapCount = Object.keys(snaps).length;

  console.log('\n========================================');
  console.log('   🔄 GEORG_v21.0 - BACKUP WIEDERHERSTELLEN');
  console.log('========================================\n');
  console.log(`Datei: ${fileArg}`);
  console.log(`Enthält: ${rsvpCount} RSVPs, ${songCount} Songs, ${snapCount} Snaps\n`);

  const confirm = await askQuestion('⚠️  Sollen die Daten jetzt nach Firebase eingespielt werden? (j/N): ');
  if (confirm.toLowerCase() !== 'j' && confirm.toLowerCase() !== 'ja' && confirm.toLowerCase() !== 'y') {
    console.log('❌ Vorgang abgebrochen.');
    process.exit(0);
  }

  console.log('Schreibe RSVPs...');
  await fetch(`${DB_URL}/rsvps.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rsvps)
  });

  console.log('Schreibe Songs...');
  await fetch(`${DB_URL}/songs.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(songs)
  });

  console.log('Schreibe Snaps...');
  await fetch(`${DB_URL}/snaps.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snaps)
  });

  console.log('\n✓ Wiederherstellung erfolgreich abgeschlossen!\n');
}

main().catch((err) => {
  console.error('Fehler bei der Wiederherstellung:', err);
  process.exit(1);
});
