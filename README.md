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

Alle vier Stages verwenden denselben Kernel-Piloten mit Helm. Nur das Fahrgestell wechselt (Cube-Cockpit, Raketenflug, Live-Show, Boss-Shooter). In Stage 1 dreht sich das Cube-Chassis, der Pilot im Cockpit bleibt aufrecht. Darstellung und Avatar-Laden sind in `js/app/arcade/player-rig.js` zentralisiert; Physik und Kollisionsflächen bleiben bei den jeweiligen Stages.

Beim Start eines Runs übernimmt die Engine das Profil der Zusage dieses Geräts aus dem synchronisierten RSVP-Cache, ersatzweise aus `party_rsvp_data`. Das ausgewählte Foto erscheint mittig zugeschnitten im Helmvisier; Emoji-Avatare werden ebenfalls übernommen. Ohne Zusage wird der Standardpilot angezeigt. Bilder werden einmal pro Run geladen, nicht pro Frame oder Stage; Ladefehler werden in der Konsole gemeldet und der Standardpilot bleibt sichtbar.

## Arcade-Performance

Das Canvas verwendet maximal DPR 2. Das Spielfeld (360x600) sitzt oben unter einem kompakten HUD und füllt die Breite des Bildschirms; der freie Rest unten ist eine abgedunkelte Daumenzone aus den gestreckten Spielfeldrändern, damit Finger nichts Wichtiges verdecken. HUD-Elemente werden einmal referenziert und nur bei geaenderten Werten aktualisiert; der lokale Highscore wird nicht im Frame-Loop gelesen. Stage 2 rendert Hintergrund, Raster und Nebel einmal pro Farbsektor in einen Canvas-Layer und zeichnet keinen zusaetzlichen Engine-Hintergrund darueber. Der Cache folgt der Canvas-Aufloesung und wird beim Skalierungswechsel erneuert. Figuren, Stage-2-Torkanten und Stage-4-Effekte verwenden klare Konturen statt Blur-Schatten. Die Audio-Beat-Uhr bleibt framegenau; nur die Bass-Spektrumanalyse ist auf etwa 33 Messungen pro Sekunde begrenzt. Lautstaerkenormalisierung wird fuer denselben dekodierten Track und Loop-Bereich wiederverwendet.

## Temporäre Stage-Auswahl

Im Admin-Menü öffnet der Button **Arcade-Stages testen** die Auswahl für einen direkten Einstieg in Stage 1–4. Im Spiel ist die Auswahl auch über **STAGES** erreichbar. Jeder Test startet mit drei Leben und dem eigenen Avatar; nach Erfolg oder Niederlage kann dieselbe Stage wiederholt oder eine andere gewählt werden. Testläufe speichern keine Rekorde und vergeben keine Achievements. **Normaler Run ab Stage 1** startet den regulären Spielablauf. Das Menü gibt es nur über das Admin-Menü.

## Stage 2: Fiech Airways

Die Raketenflucht dauert 49 Beats (bei Stage-2-Tempo etwa 26,5 Sekunden ohne Intro). Fuenf Abschnitte bilden eine Verfolgungsjagd statt einer endlosen Torfolge: Slalom und versetzte Doppelroehren, einseitige Kolben und eine wandernde Schleuse, ein offener Jagdabschnitt mit Doppelsalven und Truemmern, eine Gabelung mit anschliessenden Kombinationen und ein finaler Sprint. Die 14 Tore haben spiegelbare Fluglinien; die Gabelung besitzt einen gefaehrlichen Kern und zwei sichere Routen. Normale Oeffnungen sind 104 bis 140 Pixel hoch. Zusaetzliche Schleusen und staerkere Hoehenwechsel verlangen praezises Bremsen. Erst nach der letzten Doppelroehre auf Beat 47 faellt das Fiech zurueck und verschwindet aus dem Bild; es gibt kein Zerquetschen.

Die Laser-Jagd dauert 16 Beats. Das Fiech feuert drei Doppelsalven auf Beat 22, 26 und 30: ein gezielter Hauptschuss und jeweils 1,1 Beats spaeter ein breiterer, um 95 Pixel versetzter Nachschuss. Beide Ziele rasten gemeinsam 0,72 Beats vor dem Hauptschuss ein und verfolgen danach nicht weiter. Gestrichelte Warnlinien und getrennte Beat-Countdowns zeigen auch gleichzeitig beide Gefahren an; der Nachschuss fordert zum Richtungswechsel auf. Jeder Strahl ist 0,35 Beats aktiv, seine sichtbare Breite entspricht der Kollisionsbreite. Einfach in der ersten Ausweichlinie stehen zu bleiben wird vom Nachschuss bestraft. Zwischen den Salven kreuzen zwei rotierende Truemmer mit echter Kollision die Flugbahn, erst nach dem jeweiligen Nachschuss. Jede Attacke kostet hoechstens ein Leben und nutzt die bestehende Unverwundbarkeit.

Halten gibt Schub, Loslassen laesst die Rakete sinken. Die Strecke und Flugphysik verwenden die laufende Audio-Beat-Uhr; Tor-Mittelpunkte passieren den Spieler auf ganzen Beats, auch bei Tempo-Rampen. Druckschleusen und Kolben zeigen ihre Endposition vorab und rasten einen Beat vor der Passage ein. Die breitere wandernde Schleuse bewegt ihre Oeffnung dagegen auch waehrend des Durchflugs weiter; eine markierte Fuehrung zeigt die Richtung. Versetzte Doppelroehren verlangen rechtzeitiges Bremsen. Saubere Durchfluege geben Combo-Punkte, goldene Ringe zusaetzliche Perfect-Boni; Punkte werden erst nach vollstaendigem Verlassen eines Tores vergeben.

`js/app/arcade/stages/stage2-flappy.js` enthaelt Flugmuster, Beat-Zeitsteuerung, Physik und Kollisionen. `stage2-draw.js` zeichnet Flugschacht, Tore, Fiech-Aktionen und Feedback. Die gemeinsame Pilot-/Avatar-Darstellung bleibt unveraendert.

Die Stage-2-Regressionstests laufen mit `node --test js/app/arcade/stages/stage2-flight.test.js`. Sie pruefen die Dauer, Varianten und Spiegelungen, vollstaendige Routen bei 20 bis 120 FPS und verschiedenen Tempos, Zielverfolgung und Lock, Kolben- und Truemmerkollisionen, Beat-Ausrichtung, Audio-Notlauf, Treffer und Bonuspunkte. `node --test js/app/arcade/render-performance.test.js` prueft Hintergrund-Caches, Skalierungswechsel und schattenarme Darstellung.

**Stage 4 · Omega-Fiech (Boss):** dunkler Bierkeller, Panzerkern mit Fiech im Bullauge und vier Getraenke-Phasen mit je 5 Treffern: Bier-Kanone (Schaumkugeln), Korn-Flasche (Schuettelkorn-Flaschen plus Zielstrahl), Ahoi-Brause (wackelnde Blasen) und Schnapslatte (Latten mit Luecke plus Strahl). Der Spieler feuert jeden 2. Beat automatisch, der Boss schwingt, also muss man unter ihm stehen und gleichzeitig ausweichen. Jede Phase endet mit Schild, Banner und zerstoertem Pod, der Tod mit Explosionssequenz. Texte stehen in `content.js` (`declineGame.arcade.stage4`). `node --test js/app/arcade/stages/stage4-boss.test.js` laesst einen Ausweich-Bot ueber mehrere Seeds, FPS und BPM laufen und erwartet 0 Treffer, damit die Reihen immer fair loesbar bleiben.

## GitHub Pages

Der Workflow unter `.github/workflows/deploy.yml` baut `dist/` und veröffentlicht es auf GitHub Pages. In den Repository-Einstellungen muss unter **Settings → Pages → Build and deployment → Source** einmalig **GitHub Actions** ausgewählt werden.
