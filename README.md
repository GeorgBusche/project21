# Project21

Statische Party-Webseite mit RSVP, Firebase-GÃ¤stefunktionen und separaten SUDO-Shows.

## Entwicklung

- `npm install` installiert die Build-AbhÃ¤ngigkeiten.
- `npm run dev` startet den lokalen Vite-Entwicklungsserver.
- `npm run build` erstellt die optimierte Website unter `dist/`.
- `npm run preview` zeigt den erzeugten Build lokal an.
- `npm run format` formatiert die Projektdateien mit Prettier.
- `npm run format:check` prÃ¼ft die Formatierung.

Die Anwendung wird als Multi-Page-Build ausgeliefert. Gemeinsame JavaScript-AbhÃ¤ngigkeiten werden gebÃ¼ndelt, Tailwind-Utilities werden wÃ¤hrend des Builds in CSS umgewandelt, und die einzelnen SUDO-Seiten bleiben eigenstÃ¤ndige HTML-Einstiegspunkte. Die Audio-Dateien werden beim Build als statische Assets Ã¼bernommen.

## Projektstruktur

- `index.html` â€“ Haupteinstiegspunkt und Seitenstruktur
- `js/config.js` â€“ zentrale Party- und Spieleinstellungen
- `js/main.js` â€“ App-Einstiegspunkt und Ãœbergabe an HTML-Interaktionen
- `js/app/` â€“ Audio, OberflÃ¤che, Befehle, Spiel, SUDO-Steuerung und Party-Aktionen
- `js/sudo/` â€“ Cue-Zeitsteuerung und JavaScript pro SUDO-Show
- `css/style.css` â€“ gemeinsame Hauptseiten-Styles
- `css/sudo/` â€“ Styles pro SUDO-Show
- `sudo_frames/` â€“ eigenstÃ¤ndige HTML-Einstiegspunkte der Shows
- `assets/audio/` â€“ lokale Musiktitel
- `assets/sudo/<show>/` â€“ Grafiken der einzelnen SUDO-Shows (SVGs, Logos), per `import â€¦ ?raw` bzw. `new URL(â€¦)` eingebunden
- `js/sudo/shared/` â€“ gemeinsame Show-Helfer (`cue-timings.js`, `utils.js`, `logo-outro.js`)

## Arcade-Spielfigur

Alle vier Stages verwenden denselben Kernel-Piloten mit Helm. Nur das Fahrgestell wechselt (Cube-Cockpit, Raketenflug, Live-Show, Boss-Shooter). In Stage 1 dreht sich das Cube-Chassis, der Pilot im Cockpit bleibt aufrecht. Darstellung und Avatar-Laden sind in `js/app/arcade/player-rig.js` zentralisiert; Physik und KollisionsflÃ¤chen bleiben bei den jeweiligen Stages.

Beim Start eines Runs Ã¼bernimmt die Engine das Profil der Zusage dieses GerÃ¤ts aus dem synchronisierten RSVP-Cache, ersatzweise aus `party_rsvp_data`. Das ausgewÃ¤hlte Foto erscheint mittig zugeschnitten im Helmvisier; Emoji-Avatare werden ebenfalls Ã¼bernommen. Ohne Zusage wird der Standardpilot angezeigt. Bilder werden einmal pro Run geladen, nicht pro Frame oder Stage; Ladefehler werden in der Konsole gemeldet und der Standardpilot bleibt sichtbar.

## Arcade-Performance

Das Canvas verwendet maximal DPR 2. Das Spielfeld (360x600) sitzt oben unter einem kompakten HUD und fÃ¼llt die Breite des Bildschirms; der freie Rest unten ist eine abgedunkelte Daumenzone aus den gestreckten SpielfeldrÃ¤ndern, damit Finger nichts Wichtiges verdecken. HUD-Elemente werden einmal referenziert und nur bei geaenderten Werten aktualisiert; der lokale Highscore wird nicht im Frame-Loop gelesen. Stage 2 rendert Hintergrund, Raster und Nebel einmal pro Farbsektor in einen Canvas-Layer und zeichnet keinen zusaetzlichen Engine-Hintergrund darueber. Der Cache folgt der Canvas-Aufloesung und wird beim Skalierungswechsel erneuert. Figuren, Stage-2-Torkanten und Stage-4-Effekte verwenden klare Konturen statt Blur-Schatten. Die Audio-Beat-Uhr bleibt framegenau; nur die Bass-Spektrumanalyse ist auf etwa 33 Messungen pro Sekunde begrenzt. Lautstaerkenormalisierung wird fuer denselben dekodierten Track und Loop-Bereich wiederverwendet.

## TemporÃ¤re Stage-Auswahl

Im Admin-MenÃ¼ Ã¶ffnet der Button **Arcade-Stages testen** die Auswahl fÃ¼r einen direkten Einstieg in Stage 1â€“4. Im Spiel ist die Auswahl auch Ã¼ber **STAGES** erreichbar. Jeder Test startet mit drei Leben und dem eigenen Avatar; nach Erfolg oder Niederlage kann dieselbe Stage wiederholt oder eine andere gewÃ¤hlt werden. TestlÃ¤ufe speichern keine Rekorde und vergeben keine Achievements. **Normaler Run ab Stage 1** startet den regulÃ¤ren Spielablauf. Das MenÃ¼ gibt es nur Ã¼ber das Admin-MenÃ¼.

## Stage 2: Fiech Airways

Die Raketenflucht dauert 49 Beats (bei Stage-2-Tempo etwa 26,5 Sekunden ohne Intro). Fuenf Abschnitte bilden eine Verfolgungsjagd statt einer endlosen Torfolge: Slalom und versetzte Doppelroehren, einseitige Kolben und eine wandernde Schleuse, ein offener Jagdabschnitt mit Doppelsalven und Truemmern, eine Gabelung mit anschliessenden Kombinationen und ein finaler Sprint. Die 14 Tore haben spiegelbare Fluglinien; die Gabelung besitzt einen gefaehrlichen Kern und zwei sichere Routen. Normale Oeffnungen sind 104 bis 140 Pixel hoch. Zusaetzliche Schleusen und staerkere Hoehenwechsel verlangen praezises Bremsen. Erst nach der letzten Doppelroehre auf Beat 47 faellt das Fiech zurueck und verschwindet aus dem Bild; es gibt kein Zerquetschen.

Die Laser-Jagd dauert 16 Beats. Das Fiech feuert drei Doppelsalven auf Beat 22, 26 und 30: ein gezielter Hauptschuss und jeweils 1,1 Beats spaeter ein breiterer, um 95 Pixel versetzter Nachschuss. Beide Ziele rasten gemeinsam 0,72 Beats vor dem Hauptschuss ein und verfolgen danach nicht weiter. Gestrichelte Warnlinien und getrennte Beat-Countdowns zeigen auch gleichzeitig beide Gefahren an; der Nachschuss fordert zum Richtungswechsel auf. Jeder Strahl ist 0,35 Beats aktiv, seine sichtbare Breite entspricht der Kollisionsbreite. Einfach in der ersten Ausweichlinie stehen zu bleiben wird vom Nachschuss bestraft. Zwischen den Salven kreuzen zwei rotierende Truemmer mit echter Kollision die Flugbahn, erst nach dem jeweiligen Nachschuss. Jede Attacke kostet hoechstens ein Leben und nutzt die bestehende Unverwundbarkeit.

Halten gibt Schub, Loslassen laesst die Rakete sinken. Die Strecke und Flugphysik verwenden die laufende Audio-Beat-Uhr; Tor-Mittelpunkte passieren den Spieler auf ganzen Beats, auch bei Tempo-Rampen. Druckschleusen und Kolben zeigen ihre Endposition vorab und rasten einen Beat vor der Passage ein. Die breitere wandernde Schleuse bewegt ihre Oeffnung dagegen auch waehrend des Durchflugs weiter; eine markierte Fuehrung zeigt die Richtung. Versetzte Doppelroehren verlangen rechtzeitiges Bremsen. Saubere Durchfluege geben Combo-Punkte, goldene Ringe zusaetzliche Perfect-Boni; Punkte werden erst nach vollstaendigem Verlassen eines Tores vergeben.

`js/app/arcade/stages/stage2-flappy.js` enthaelt Flugmuster, Beat-Zeitsteuerung, Physik und Kollisionen. `stage2-draw.js` zeichnet Flugschacht, Tore, Fiech-Aktionen und Feedback. Die gemeinsame Pilot-/Avatar-Darstellung bleibt unveraendert.

Die Stage-2-Regressionstests laufen mit `node --test js/app/arcade/stages/stage2-flight.test.js`. Sie pruefen die Dauer, Varianten und Spiegelungen, vollstaendige Routen bei 20 bis 120 FPS und verschiedenen Tempos, Zielverfolgung und Lock, Kolben- und Truemmerkollisionen, Beat-Ausrichtung, Audio-Notlauf, Treffer und Bonuspunkte. `node --test js/app/arcade/render-performance.test.js` prueft Hintergrund-Caches, Skalierungswechsel und schattenarme Darstellung.

**Stage 4 � Der Teufels-Bierdeckel (Finale, 360�-Orbit-Arena, ca. 2-3 min):** Der Spielerwuerfel faehrt auf einer Orbit-Schiene um das Boss-Fiech, umgeben von 22 Korn-Pinnchen (= Boss-HP, nur ueber Gold-Konter-Kapseln zu knacken). Steuerung: Tap = Richtung umkehren, links/rechts halten (Pfeile/A/D) = lenken; ab dem 4. Pinnchen schaltet sich der Innenring frei (Cockpit-Mitte, Leertaste/W/Pfeil-Hoch oder Doppel-Tap wechselt den Ring). Immer nur ein Angriff gleichzeitig. Farbgesetz: Rot = Gefahr (vorher angekuendigt), Gruen = sicher, Gold = Konter. **6 Phasen, je ein eigener Song mit eigenem Look und eigenen Angriffen:** Bella Napoli (Flagge, Konfetti, Vesuv), Rage Cage / Gas (Warnstreifen, Becherpyramide, Gas-Pedal), Biertornado (Trichter, Schaum, Sturm-Laser), Wolle (Flanell, Vorhaenge, Discokugel, Stadion-Welle), DJ SUDO / Schuettelkorn (Matrix-Look, Vinyl, Equalizer + [ sudo ! ]-Kapseln mit 	riggerSudoSound) und das laengste Finale mit der Rammstein-Sonne im Stil der SUDO-Buehne (Lamellenwand, Lichtkegel, Boden-Flammen, Publikum mit Handylichtern, Stroboskop). Jeder Song startet sofort mit seiner Phase (Retry, falls das Sample noch laedt); danach folgen [ SUDO SMASH! ] und der Sieg. Vorwarnungen von Sturm-Laser und Equalizer zielen nie direkt auf den Spieler. Audio in rcade-audio.js/rcade-songs.js, Logik in stage4-orbit.js, Texte in content.js (declineGame.arcade.stage4).  Jede der 6 Phasen hat eigene Angriffe (Pizza-Keil, Boxengasse, Bier-Sog, Vorhang, Scheinwerfer, Tonarm, Lauffeuer ...), eigene Schienen-Optik, eigene Fiech-Animation, Emoji-Ausbrueche und einen eigenen Phasen-Einzug.
ode --test js/app/arcade/stages/stage4-orbit.test.js laesst einen Bot ueber mehrere Seeds, FPS und BPM laufen (0 Treffer, 90-280 s, alle Songs, max. 2 gleichzeitige Gefahren).

## GitHub Pages

Der Workflow unter `.github/workflows/deploy.yml` baut `dist/` und verÃ¶ffentlicht es auf GitHub Pages. In den Repository-Einstellungen muss unter **Settings â†’ Pages â†’ Build and deployment â†’ Source** einmalig **GitHub Actions** ausgewÃ¤hlt werden.
