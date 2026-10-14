/**
 * GEORG'S 21. GEBURTSTAG - BACKUP SKRIPT
 * 
 * Sichert die aktuellen Daten in den Ordner backups/.
 * Aufruf im Terminal:
 *   npm run backup
 * oder
 *   node scripts/backup.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backupsDir = path.join(rootDir, 'backups');

const DB_URL = 'https://project21-2cea0-default-rtdb.europe-west1.firebasedatabase.app';

async function main() {
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_${timestamp}.json`;
  const targetPath = path.join(backupsDir, filename);

  console.log('📡 Lade Daten von Firebase...');
  const [rsvpsRes, songsRes, snapsRes] = await Promise.all([
    fetch(`${DB_URL}/rsvps.json`),
    fetch(`${DB_URL}/songs.json`),
    fetch(`${DB_URL}/snaps.json`)
  ]);

  const data = {
    backedUpAt: new Date().toISOString(),
    rsvps: (await rsvpsRes.json()) || {},
    songs: (await songsRes.json()) || {},
    snaps: (await snapsRes.json()) || {}
  };

  fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✓ Backup erfolgreich gespeichert: ${path.relative(rootDir, targetPath)}`);
}

main().catch((err) => {
  console.error('Fehler beim Backup:', err);
  process.exit(1);
});
