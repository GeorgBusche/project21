# Project21

Statische Party-Webseite mit RSVP, Firebase-Gästefunktionen und separaten SUDO-Shows.

## Entwicklung

- `npm install` installiert die Build-Abhängigkeiten.
- `npm run dev` startet den lokalen Vite-Entwicklungsserver.
- `npm run build` erstellt die optimierte Website unter `dist/`.
- `npm run preview` zeigt den erzeugten Build lokal an.
- `npm run format` formatiert die Projektdateien mit Prettier.
- `npm run format:check` prüft die Formatierung.

Die Anwendung wird als Multi-Page-Build ausgeliefert. Gemeinsame JavaScript-Abhängigkeiten werden gebündelt, Tailwind-Utilities werden während des Builds in CSS umgewandelt, und die einzelnen SUDO-Seiten bleiben eigenständige HTML-Einstiegspunkte. Die Audio-Dateien werden beim Build als statische Assets übernommen.

## Projektstruktur

- `index.html` – Haupteinstiegspunkt und Seitenstruktur
- `js/config.js` – zentrale Party- und Spieleinstellungen
- `js/main.js` – App-Einstiegspunkt und Übergabe an HTML-Interaktionen
- `js/app/` – Audio, Oberfläche, Befehle, Spiel, SUDO-Steuerung und Party-Aktionen
- `js/sudo/` – Cue-Zeitsteuerung und JavaScript pro SUDO-Show
- `css/style.css` – gemeinsame Hauptseiten-Styles
- `css/sudo/` – Styles pro SUDO-Show
- `sudo_frames/` – eigenständige HTML-Einstiegspunkte der Shows
- `assets/audio/` – lokale Musiktitel
- `assets/sudo/<show>/` – Grafiken der einzelnen SUDO-Shows (SVGs, Logos), per `import … ?raw` bzw. `new URL(…)` eingebunden
- `js/sudo/shared/` – gemeinsame Show-Helfer (`cue-timings.js`, `utils.js`, `logo-outro.js`)

## Arcade-Spielfigur

Alle fünf Stages verwenden denselben Kernel-Piloten mit Helm. Nur das Fahrgestell wechselt (Cube-Cockpit, Raketenflug, Shooter, Wave). In Stage 1 dreht sich das Cube-Chassis, der Pilot im Cockpit bleibt aufrecht. Darstellung und Avatar-Laden sind in `js/app/arcade/player-rig.js` zentralisiert; Physik und Kollisionsflächen bleiben bei den jeweiligen Stages.

Beim Start eines Runs übernimmt die Engine das Profil der Zusage dieses Geräts aus dem synchronisierten RSVP-Cache, ersatzweise aus `party_rsvp_data`. Das ausgewählte Foto erscheint mittig zugeschnitten im Helmvisier; Emoji-Avatare werden ebenfalls übernommen. Ohne Zusage wird der Standardpilot angezeigt. Bilder werden einmal pro Run geladen, nicht pro Frame oder Stage; Ladefehler werden in der Konsole gemeldet und der Standardpilot bleibt sichtbar.

## Arcade-Performance

Das Canvas verwendet maximal DPR 1,5. HUD-Elemente werden einmal referenziert und nur bei geaenderten Werten aktualisiert; der lokale Highscore wird nicht im Frame-Loop gelesen. Stage 2 rendert Hintergrund, Raster und Nebel einmal pro Farbsektor in einen Canvas-Layer und zeichnet keinen zusaetzlichen Engine-Hintergrund darueber. Der Cache folgt der Canvas-Aufloesung und wird beim Skalierungswechsel erneuert. Figuren, Stage-2-Torkanten und Stage-4/5-Effekte verwenden klare Konturen statt Blur-Schatten. Die Audio-Beat-Uhr bleibt framegenau; nur die Bass-Spektrumanalyse ist auf etwa 33 Messungen pro Sekunde begrenzt. Lautstaerkenormalisierung wird fuer denselben dekodierten Track und Loop-Bereich wiederverwendet.

## Temporäre Stage-Auswahl

Im lokalen Vite-Entwicklungsserver öffnet der Button **DEV · STAGES** die Auswahl für einen direkten Einstieg in Stage 1–5. Im Spiel ist die Auswahl auch über **STAGES** erreichbar. Jeder Test startet mit drei Leben und dem eigenen Avatar; nach Erfolg oder Niederlage kann dieselbe Stage wiederholt oder eine andere gewählt werden. Testläufe speichern keine Rekorde und vergeben keine Achievements. **Normaler Run ab Stage 1** startet den regulären Spielablauf. Das Menü ist über `import.meta.env.DEV` begrenzt und im Produktionsbuild nicht vorhanden.

## Stage 2: Fiech Airways

Die Raketenflucht dauert 64 Beats (bei Stage-2-Tempo etwa 34,5 Sekunden ohne Intro). Fuenf Abschnitte bilden eine Verfolgungsjagd statt einer endlosen Torfolge: Slalom und versetzte Doppelroehren, einseitige Kolben und eine wandernde Schleuse, ein offener Jagdabschnitt mit Doppelsalven und Truemmern, eine Gabelung mit anschliessenden Kombinationen und ein finaler Sprint. Die 20 Tore haben spiegelbare Fluglinien; die Gabelung besitzt einen gefaehrlichen Kern und zwei sichere Routen. Normale Oeffnungen sind 86 bis 120 Pixel hoch, die letzten Passagen hoechstens 90 Pixel. Zusaetzliche Schleusen und staerkere Hoehenwechsel verlangen praezises Bremsen. Erst nach der letzten Doppelroehre auf Beat 63 faellt das Fiech zurueck und verschwindet aus dem Bild; es gibt kein Zerquetschen.

Die Laser-Jagd dauert 20 statt 12 Beats. Das Fiech feuert vier Doppelsalven auf Beat 29, 33, 37 und 41: ein gezielter Hauptschuss und jeweils 1,1 Beats spaeter ein breiterer, um 95 Pixel versetzter Nachschuss. Beide Ziele rasten gemeinsam 0,72 Beats vor dem Hauptschuss ein und verfolgen danach nicht weiter. Gestrichelte Warnlinien und getrennte Beat-Countdowns zeigen auch gleichzeitig beide Gefahren an; der Nachschuss fordert zum Richtungswechsel auf. Jeder Strahl ist 0,35 Beats aktiv, seine sichtbare Breite entspricht der Kollisionsbreite. Einfach in der ersten Ausweichlinie stehen zu bleiben wird vom Nachschuss bestraft. Zwischen den Salven kreuzen vier rotierende Truemmer mit echter Kollision die Flugbahn, erst nach dem jeweiligen Nachschuss. Jede Attacke kostet hoechstens ein Leben und nutzt die bestehende Unverwundbarkeit.

Halten gibt Schub, Loslassen laesst die Rakete sinken. Die Strecke und Flugphysik verwenden die laufende Audio-Beat-Uhr; Tor-Mittelpunkte passieren den Spieler auf ganzen Beats, auch bei Tempo-Rampen. Druckschleusen und Kolben zeigen ihre Endposition vorab und rasten einen Beat vor der Passage ein. Die breitere wandernde Schleuse bewegt ihre Oeffnung dagegen auch waehrend des Durchflugs weiter; eine markierte Fuehrung zeigt die Richtung. Versetzte Doppelroehren verlangen rechtzeitiges Bremsen. Saubere Durchfluege geben Combo-Punkte, goldene Ringe zusaetzliche Perfect-Boni; Punkte werden erst nach vollstaendigem Verlassen eines Tores vergeben.

`js/app/arcade/stages/stage2-flappy.js` enthaelt Flugmuster, Beat-Zeitsteuerung, Physik und Kollisionen. `stage2-draw.js` zeichnet Flugschacht, Tore, Fiech-Aktionen und Feedback. Die gemeinsame Pilot-/Avatar-Darstellung bleibt unveraendert.

Die Stage-2-Regressionstests laufen mit `node --test js/app/arcade/stages/stage2-flight.test.js`. Sie pruefen die Dauer, Varianten und Spiegelungen, vollstaendige Routen bei 20 bis 120 FPS und verschiedenen Tempos, Zielverfolgung und Lock, Kolben- und Truemmerkollisionen, Beat-Ausrichtung, Audio-Notlauf, Treffer und Bonuspunkte. `node --test js/app/arcade/render-performance.test.js` prueft Hintergrund-Caches, Skalierungswechsel und schattenarme Darstellung.

## GitHub Pages

Der Workflow unter `.github/workflows/deploy.yml` baut `dist/` und veröffentlicht es auf GitHub Pages. In den Repository-Einstellungen muss unter **Settings → Pages → Build and deployment → Source** einmalig **GitHub Actions** ausgewählt werden.
