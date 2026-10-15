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

## Soundtrack und Stage-Uebergaenge

Im normalen Run laeuft `fear.mp3` ohne Neustart und im Originaltempo. Zum Anpassen aller Uebergaenge nur **`CONTENT.arcadeAudio.stageEndSec` in `js/content.js`** aendern. Die drei Werte sind **absolute Sekunden der Originalaufnahme**, keine Stage-Dauern:

```js
stageEndSec: [35.5, 72, 107],
//             |    |    +-- Beginn Boss-Cutscene (1:47)
//             |    +------- Beginn Stage-3-Cutscene (1:12)
//             +------------ Stage 1 -> Stage 2 (0:35,5)
```

Der erste Cue macht Stage 2 sofort spielbar. Der zweite Cue startet die **3 Track-Sekunden lange Stage-3-Cutscene**, der dritte die **18 Track-Sekunden lange Boss-Cutscene**. Das jeweilige Gameplay beginnt also beim Cue **plus 3 bzw. 18 Sekunden**, ohne Aufrunden auf einen Takt. Die Beispielwerte oben sind frei einstellbar; massgeblich sind die aktuellen Werte in der Konfiguration. Der Boss hat **keine Endzeit** und dauert bis zu seinem Sieg. Die Audio-Uhr beruecksichtigt die Ausgabelatenz und wartet beim Start auf das Dekodieren; ohne Web Audio laeuft ein stummer Ersatz-Takt mit 105 BPM. Die zufaelligen Strecken werden vor Musikbeginn vorbereitet, damit die Generierung keinen Uebergang verzoegert.

**Stage 1:** plant das Schlusssegment rueckwaerts vom Drop. Davor fuellt eine zufaellige Route aus allen drei Schwierigkeiten das komplette Zeitfenster. Im Standardfenster bleiben Aufgaben wiederholungsfrei; laengere Fenster erlauben getrennte Wiederholungen, nie direkt hintereinander. Die Auswahl erfolgt im Viertel-Beat-Raster anhand der tatsaechlichen Hindernislaengen, inklusive schneller Gegner; Restbruchteile werden auf die kurzen Uebergaenge verteilt, nicht ans Ende gehaengt. Zwischen Aufgaben bleiben 1 bis 1,5 Beats Erholung (plus maximal ein halber Beat Raster-/Layoutausgleich), nach dem Gravity-Flip mehr Zeit fuer die Rueckkehr zum Boden. Hindernisabstaende innerhalb der Aufgaben und Sprungphysik bleiben unveraendert. Einzelne Segmenttests behalten ihren bisherigen Ablauf.

**Stage 2:** kuerzere Fenster verwenden einen kompakten Einstieg; laengere Fenster ergaenzen vollstaendige Roehrenpaare, Kolben-/Wandertor-Muster und Doppelsalven. Schussabstand, Lock-Zeit, Flugphysik und Abstaende innerhalb der Muster werden nicht beschleunigt. Gabelung und Fluchtfinale bleiben erhalten, das letzte Tor liegt 0,6 Beats vor dem Wechsel.

**Stage 3:** passt die Reihenzahl in allen fuenf Showphasen an, nicht die Fallgeschwindigkeit oder Reaktionszeit. Die letzte Phase hat weiterhin fuenf Spuren. Kurze Show-Uebergaenge und eine eigene Umbaupause bleiben reserviert; die letzte Reihe kommt 0,9 Beats vor dem Boss, damit Laser und Fiech-Sturz noch enden koennen. Jede erzeugte Strecke durchlaeuft eine Erreichbarkeitspruefung mit der echten Laser-Aktivzeit.

Alle drei Stages folgen derselben absoluten Audio-Uhr. Die letzten vier Beats kuendigen den naechsten Wechsel an. Admin-Direktstarts zeigen dieselben Cutscenes; nur Stage 2 hat einen klassischen 1,8-Sekunden-Vorlauf vor ihrem Cue. Dev-Stage-Einstiege laufen ab der gewaehlten Stage durch alle folgenden Stages bis zum Boss weiter, mit durchgehender Musik und ohne Rekorde oder Achievements. Nach Niederlage kann die aktuelle Stage erneut gestartet werden. Nur einzelne Stage-1-Segmenttests enden weiterhin nach ihrem Segment. Stress veraendert im Soundtrack-Sync-Modus Filter und Effekte, aber nicht das Musiktempo. Boss-Samples und deren Effekte bleiben erhalten.

**Canvas-Cutscenes:** `arcade-cutscenes.js` zeichnet Stahl-Schotten, Funken, drei Pyro-Saeulen und das Feuer-frei-Signet fuer Stage 3. Der Boss bekommt vier Akte mit EKG/Notfallprotokoll, einem Ritual aller **22 Pinnchen**, Fiech-Mutation und Overdrive-Countdown. Die bestehenden **3 -> 5 Spuren** bleiben unveraendert. `renderIntro()` erhaelt ausschliesslich Track-Zeit; `getBeatInfo().rate` liefert die aktuelle Playback-Rate. Die Engine nutzt die integrierte Audio-Uhr statt aufsummierter, begrenzter Physik-Frames: auch Tempo-Rampen, Ladezeit und Frame-Aussetzer verschieben den Drop nicht. Im adaptiven Modus dauern beispielsweise 18 Track-Sekunden bei konstanter Rate 1,19 nur ca. 15,126 Echtzeit-Sekunden. Im Sync-Modus bleibt die konfigurierte Rate 1 erhalten.

Der Intro-Lowpass bleibt atmosphaerisch geschlossen und oeffnet bei Gameplay-Beginn auf 20000 Hz mit genau einem Drop-Impuls, Blitz und Druckwelle. Nach den vier Schutz-Beats beginnt ein eigener Reaktor-Prolog ohne Zusatzsong: **18 Sekunden ab Gameplay-Beginn**, danach endet die laufende Angriffsfolge vor Bella Napoli. Kaltes Blau, technische Raster, Radar und Zielklammern statt Party-Dekor; eingefrorene Echo-Ziele und abwechselnde stationaere Kreuzstrahlen statt Flaschen/Lava. Alle Gefahren behalten rote Vorwarnungen. Konter werden erst mit Bella Napoli freigegeben, damit die erste Musikphase nicht uebersprungen wird. Der Wechsel bringt Lichtblitz, Glut-Ausbruch, Trikolore und sichtbare Platten-Cue als bewussten Warm/Kalt-Kontrast. Nach einem **vollstaendig gesehenen** Boss-Intro wird lokal `arcade_boss_intro_seen` gespeichert. Erst danach erscheinen Skip-Hinweis und Freigabe fuer Leertaste/Doppel-Tap. Ein Abbruch zaehlt nicht als gesehen. Skip springt auch die Musik zum Intro-Ende, wartet auf den hoerbaren Quellenstart und gibt keine Skip-Eingabe an den Boss weiter. Normale Stage-Wechsel behalten dieselbe Audioquelle; nur ein ausdrueckliches Skip ersetzt sie zum gezielten Seek.

**Boss-Performance und Mix:** Intro und Kampf verwenden denselben animierten Titan-Kern aus `stage4-show.js`: asymmetrische rot/cyan leuchtende Augen, Brust-X, Reaktor und gelenkige Arme bleiben beim Drop erhalten. Jeder Song wird durch eine **0,9-Sekunden-Platten-/Play-Geste** des Fiechs angekuendigt, bevor das Sample startet. Ofen, Turbo, Sturm, Dirigentenstab/Mikrofon und Schulter-Pyro unterscheiden die fuenf Performances. Jede Phase startet mit ihrer Signatur und nur einem Drucksektor; die zweite Angriffsfolge fuehrt eine neue Mechanik ein: Vesuv-Nachbeben mit wiederkehrenden Lavazielen, Turbo-Bremsmanoever (Gegenlaser, dann Ring-Sperre), breite wechselnde Zyklon-Windwaende, Stadion-Gegenchor mit gegenueberliegenden Scheinwerferzielen und eine ringwechselnde Feuerspirale. Danach kommen die regulaeren Phasenangriffe der Reihe nach hinzu, statt sofort den ganzen Pool zu mischen. Die Signatur kehrt alle drei Angriffsfolgen zurueck, die neue Mechanik alle sechs; spaetere Folgen bekommen bis zu zwei Drucksektoren. Vorwarnungen und Gold-Konter bleiben erhalten. Schuettelkorn und der Root-Hack sind komplett aus dem Bosskampf entfernt; Wolle geht direkt in Sonne ueber. Alle 22 Pinnchen bleiben erhalten: Grenzen 19/16/13/7, danach Finale. Laedt ein Sample noch, wartet die sichtbare Cue ohne neue Angriffe. Ein endgueltiger Ladefehler wird protokolliert und als `SAMPLE OFFLINE` angezeigt; die visuelle Performance und der Kampf laufen weiter.

Samples liegen als Nebenebene unter dem Haupttrack: RMS-Ziel 0,06 statt 0,14, maximaler Sample-Gain 0,42, Peak-Beitrag hoechstens 0,30, Hochpass 180 Hz, Tiefpass 9000 Hz und 0,18 Sekunden weiches Einblenden. Das ist etwa 2,5 dB lauter als der vorherige Mix. Boss-Scratch und Sample-Ende loesen keinen zusaetzlichen Musik-Drop aus; der Haupttrack wird fuer die Songs nicht mehr tiefpass-gefiltert.

**Finale und Sieg:** Die Sonne-Performance bekommt eine animierte LED-Wand, Stahltraversen, Lautsprechertuerme, schwenkende Lichtkoepfe und seitliche Pyro-Batterien zusaetzlich zum wachsenden Boden-Inferno. Nach dem letzten Konter folgt eine 5,2-Sekunden-Siegsequenz: Reaktor-Implosion, dreifache Druckwelle, Truemmerregen und der Spieler als gekroenter Cyan-Komet, bevor das Ergebnis erscheint.

**Boss-HP und Gefahren:** Die 22 goldenen Ritual-Pinnchen stehen aufrecht auf einem Radius von 78 Pixeln ausserhalb des Titan-Kerns und werden vor Reaktor/Deck gezeichnet. Das Intro faehrt auf denselben Radius zurueck. Keine zusaetzliche HP-Leiste. Angriffe markieren ausschliesslich bevorstehenden Schaden rot; sichere Ringe, gruene Ausweichsektoren und SAFE-ZONE-Texte entfallen. Alle Phasen inklusive Reaktor-Prolog haben 8 Prozent breitere Winkelangriffe (ausser der Boxengassen-Geometrie), Geysire 0,24 statt 0,22 Halbbreite und einen statt zwei Beats Abstand zwischen Angriffsfolgen. Die Vorwarnzeiten und Spielerphysik bleiben unveraendert.

Angriffsfolgen bekommen bis zu zwei gezielte Drucksektoren: Ein eingefrorener Zielbereich wird 0,95 Sekunden vorher angekuendigt und feuert 0,1 Sekunden nach dem Hauptangriff auf dem anderen Ring (vor Freischaltung auf dem Aussenring). Die Sektoren ueberlappen ihren Hauptangriff fuer hoechstens 0,65 Sekunden und halten untereinander mindestens eine volle Vorwarnzeit Abstand. So ist Ringwechsel allein keine dauerhafte Loesung; freie Winkel und Bewegung bleiben entscheidend. Die Tests pruefen offene Ausweichkorridore waehrend der Ueberlappungen sowie komplette trefferfreie Runs bei verschiedenen Tempi und Bildraten. Zusaetzlich decken 24 weitere Seeds 30/60/120 FPS, 100/105/111/120 BPM und Entscheidungsintervalle von 80/120/160 ms ab. Der Bot plant nur anhand bereits sichtbarer Vorwarnungen, mit der echten Beat-Geschwindigkeit und dem Beschleunigungsschub bei Richtungs-/Ringwechseln; die Tap-Sperre gegen versehentliche Doppel-Taps bleibt aktiv. Das belegt erreichbare Routen fuer die getesteten Folgen, nicht Fehlerfreiheit fuer jede beliebige Eingabe.

**Soundtrack-Endlosschleife:** Der erste Durchlauf beginnt weiterhin am Trackanfang beziehungsweise am Dev-/Retry-Cue. Danach wiederholt dieselbe Web-Audio-Quelle nur die letzten `arcadeAudio.outroLoopBars` vollen Takte (Standard 16, bei 105 BPM ca. 36,57 Sekunden), nicht die ruhige Einleitung. Start und Ende liegen im Beat-Raster vor Dateiende. Musiktempo, Filter und die monoton weiterlaufende Spiel-Uhr werden beim Loop nicht zurueckgesetzt.

Die Zeiten muessen aufsteigend sein und genug Platz fuer faire Muster lassen: Stage 1 mindestens 45 Beats **nach dem 1,8-Sekunden-Intro**, Stage 2 und 3 jeweils mindestens 35 Beats Spielzeit. Stage 3 reserviert davor zusaetzlich ihre 3 Track-Sekunden Cutscene. Bei 105 BPM sind das ca. 25,72 bzw. 20 Sekunden Spielzeit. Ungueltige Werte oder eine fehlgeschlagene Streckenplanung werden vor Run-Beginn sichtbar gemeldet und geloggt.

Im Stage-1-Finale fuehrt der Weg ueber die Startplattform und das automatische Pad zum Luft-Ring (erneut tippen), dann durch das Tor. Der Ring liegt weiter ueber der Schlucht und tiefer als zuvor, damit auch ein frueher gueltiger Tap genug Strecke fuer Lava und Tor uebrig laesst. Die Finale-Tests spielen diesen Weg mit echten Kollisionen bei 20 bis 120 FPS, mehreren Sprung-/Tap-Zeitpunkten und sowohl im Einzeltest als auch im Soundtrack-Zeitplan.

Tests: `node --test js/app/arcade/arcade-timeline.test.js js/app/arcade/arcade-audio.test.js js/app/arcade/arcade-cutscenes.test.js js/app/arcade/stages/stage1-finale.test.js js/app/arcade/stages/stage2-flight.test.js js/app/arcade/stages/stage3-timeline.test.js`.

## Stage 2: Fiech Airways

Die Raketenflucht dauert 49 Beats (im Originaltempo etwa 28 bis 29 Sekunden einschliesslich Beat-Ausrichtung). Fuenf Abschnitte bilden eine Verfolgungsjagd statt einer endlosen Torfolge: Slalom und versetzte Doppelroehren, einseitige Kolben und eine wandernde Schleuse, ein offener Jagdabschnitt mit Doppelsalven und Truemmern, eine Gabelung mit anschliessenden Kombinationen und ein finaler Sprint. Die 14 Tore haben spiegelbare Fluglinien; die Gabelung besitzt einen gefaehrlichen Kern und zwei sichere Routen. Normale Oeffnungen sind 104 bis 140 Pixel hoch. Zusaetzliche Schleusen und staerkere Hoehenwechsel verlangen praezises Bremsen. Erst nach der letzten Doppelroehre auf Beat 47 faellt das Fiech zurueck und verschwindet aus dem Bild; es gibt kein Zerquetschen.

Die Laser-Jagd dauert 16 Beats. Das Fiech feuert drei Doppelsalven auf Beat 22, 26 und 30: ein gezielter Hauptschuss und jeweils 1,1 Beats spaeter ein breiterer, um 95 Pixel versetzter Nachschuss. Beide Ziele rasten gemeinsam 0,72 Beats vor dem Hauptschuss ein und verfolgen danach nicht weiter. Gestrichelte Warnlinien und getrennte Beat-Countdowns zeigen auch gleichzeitig beide Gefahren an; der Nachschuss fordert zum Richtungswechsel auf. Jeder Strahl ist 0,35 Beats aktiv, seine sichtbare Breite entspricht der Kollisionsbreite. Einfach in der ersten Ausweichlinie stehen zu bleiben wird vom Nachschuss bestraft. Zwischen den Salven kreuzen zwei rotierende Truemmer mit echter Kollision die Flugbahn, erst nach dem jeweiligen Nachschuss. Jede Attacke kostet hoechstens ein Leben und nutzt die bestehende Unverwundbarkeit.

Halten gibt Schub, Loslassen laesst die Rakete sinken. Die Strecke und Flugphysik verwenden die laufende Audio-Beat-Uhr; Tor-Mittelpunkte passieren den Spieler auf ganzen Beats, auch bei Tempo-Rampen. Druckschleusen und Kolben zeigen ihre Endposition vorab und rasten einen Beat vor der Passage ein. Die breitere wandernde Schleuse bewegt ihre Oeffnung dagegen auch waehrend des Durchflugs weiter; eine markierte Fuehrung zeigt die Richtung. Versetzte Doppelroehren verlangen rechtzeitiges Bremsen. Saubere Durchfluege geben Combo-Punkte, goldene Ringe zusaetzliche Perfect-Boni; Punkte werden erst nach vollstaendigem Verlassen eines Tores vergeben.

`js/app/arcade/stages/stage2-flappy.js` enthaelt Flugmuster, Beat-Zeitsteuerung, Physik und Kollisionen. `stage2-draw.js` zeichnet Flugschacht, Tore, Fiech-Aktionen und Feedback. Die gemeinsame Pilot-/Avatar-Darstellung bleibt unveraendert.

Die Stage-2-Regressionstests laufen mit `node --test js/app/arcade/stages/stage2-flight.test.js`. Sie pruefen die Dauer, Varianten und Spiegelungen, vollstaendige Routen bei 20 bis 120 FPS und verschiedenen Tempos, Zielverfolgung und Lock, Kolben- und Truemmerkollisionen, Beat-Ausrichtung, Audio-Notlauf, Treffer und Bonuspunkte. `node --test js/app/arcade/render-performance.test.js` prueft Hintergrund-Caches, Skalierungswechsel und schattenarme Darstellung.

**Stage 4 - Der Teufels-Bierdeckel (Finale, 360-Grad-Orbit-Arena, ca. 2-3 min):** Der Spielerwuerfel faehrt auf einer Orbit-Schiene um das Boss-Fiech, umgeben von 22 Korn-Pinnchen (= Boss-HP, nur ueber Gold-Konter-Kapseln zu knacken). Steuerung: Tap = Richtung umkehren, links/rechts halten (Pfeile/A/D) = lenken; ab dem 4. Pinnchen schaltet sich der Innenring frei (Cockpit-Mitte, Leertaste/W/Pfeil-Hoch oder Doppel-Tap wechselt den Ring). Immer nur eine Angriffsfolge gleichzeitig. Farbgesetz: Rot = Gefahr (vorher angekuendigt), Gold = Konter; keine markierten Safezones. **Reaktor-Prolog plus 5 Songphasen:** Bella Napoli (Ofen, Lava-Salven und schmale Vesuv-Schneise, ohne Pizza), Rage Cage / Gas (Turbo, vier wechselnde Gang-Ringe), Biertornado (Zyklon und gegenlaeufige Sturm-Laser), Wolle (Dirigentenstab, Mikrofon, Scheinwerferjagd mit Echo) und Sonne (Schulter-Pyro und vier rotierende Dreifach-Flammenzuendungen). Jeder Song startet nach seiner sichtbaren Cue; danach folgen SUDO SMASH und der Sieg. Audio in `arcade-audio.js`/`arcade-songs.js`, Logik in `stage4-orbit.js`, gemeinsame Titan-Animation in `stage4-show.js`, Texte in `content.js` (`declineGame.arcade.stage4`).
ode --test js/app/arcade/stages/stage4-orbit.test.js laesst einen Bot ueber mehrere Seeds, FPS und BPM laufen (0 Treffer, 90-280 s, alle Songs, max. 2 gleichzeitige Gefahren).

## GitHub Pages

Der Workflow unter `.github/workflows/deploy.yml` baut `dist/` und verÃ¶ffentlicht es auf GitHub Pages. In den Repository-Einstellungen muss unter **Settings â†’ Pages â†’ Build and deployment â†’ Source** einmalig **GitHub Actions** ausgewÃ¤hlt werden.
