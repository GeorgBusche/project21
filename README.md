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

## GitHub Pages

Der Workflow unter `.github/workflows/deploy.yml` baut `dist/` und veröffentlicht es auf GitHub Pages. In den Repository-Einstellungen muss unter **Settings → Pages → Build and deployment → Source** einmalig **GitHub Actions** ausgewählt werden.
