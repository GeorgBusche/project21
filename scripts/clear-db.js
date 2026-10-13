/**
 * GEORG'S 21. GEBURTSTAG - DATENBANK BEREINIGUNG
 * 
 * Löscht wahlweise die Gästeliste (RSVPs), die Party-Playlist oder beides.
 * Erstellt VOR jedem Löschvorgang automatisch ein Sicherheits-Backup in backups/!
 * 
 * Aufruf im Terminal:
 *   node scripts/clear-db.js           (Interaktives Menü)
 *   node scripts/clear-db.js --rsvps   (Direkt nur RSVPs löschen)
 *   node scripts/clear-db.js --songs   (Direkt nur Songs löschen)
 *   node scripts/clear-db.js --all     (Alles löschen)
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backupsDir = path.join(rootDir, 'backups');

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

async function createSafetyBackup() {
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupsDir, `auto_backup_${timestamp}.json`);

  const [rsvpsRes, songsRes] = await Promise.all([
    fetch(`${DB_URL}/rsvps.json`),
    fetch(`${DB_URL}/songs.json`)
  ]);

  const data = {
    backedUpAt: new Date().toISOString(),
    rsvps: (await rsvpsRes.json()) || {},
    songs: (await songsRes.json()) || {}
  };

  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`🛡️  Sicherheits-Backup erstellt: ${path.relative(rootDir, backupFile)}`);
  return backupFile;
}

async function main() {
  console.log('\n========================================');
  console.log('   ⚠️  GEORG_v21.0 - DATENBANK RESET   ');
  console.log('========================================\n');

  const args = process.argv.slice(2);
  let mode = null;

  if (args.includes('--rsvps')) mode = '1';
  else if (args.includes('--songs')) mode = '2';
  else if (args.includes('--all')) mode = '3';

  if (!mode) {
    console.log('Was möchtest du löschen?');
    console.log('  [1] Nur Gästeliste (RSVPs) löschen');
    console.log('  [2] Nur Party-Playlist (Song-Votes) löschen');
    console.log('  [3] ALLES löschen (Gästeliste & Playlist)');
    console.log('  [0] Abbrechen\n');

    const choice = await askQuestion('Deine Auswahl (0-3): ');
    if (choice === '0' || !['1', '2', '3'].includes(choice)) {
      console.log('❌ Vorgang abgebrochen. Keine Daten wurden verändert.\n');
      process.exit(0);
    }
    mode = choice;
  }

  const confirm = await askQuestion(
    '\n⚠️  Bist du WIRKLICH sicher? Ein Backup wird vorab automatisch erstellt. (j/N): '
  );
  if (confirm.toLowerCase() !== 'j' && confirm.toLowerCase() !== 'ja' && confirm.toLowerCase() !== 'y') {
    console.log('❌ Vorgang abgebrochen.\n');
    process.exit(0);
  }

  console.log('\nErstelle Sicherheits-Backup...');
  await createSafetyBackup();

  if (mode === '1' || mode === '3') {
    console.log('🗑️  Lösche Gästeliste (RSVPs)...');
    await fetch(`${DB_URL}/rsvps.json`, { method: 'DELETE' });
    console.log('✓ Gästeliste geleert.');
  }

  if (mode === '2' || mode === '3') {
    console.log('🗑️  Lösche Party-Playlist (Songs)...');
    await fetch(`${DB_URL}/songs.json`, { method: 'DELETE' });
    console.log('✓ Playlist geleert.');
  }

  console.log('\n========================================');
  console.log('✨ Datenbank-Bereinigung erfolgreich abgeschlossen!');
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('Fehler bei der Bereinigung:', err);
  process.exit(1);
});
