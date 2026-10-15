import { escapeHtml } from '../ui.js';
import { getSavedPlayerName, getLocalBest, persistPlayerName } from './arcade-scoreboard.js';
import { saveGuestDecision, openRsvpModal } from '../party-actions.js';
import { resultScene, drawResultScene } from './arcade-result-scene.js';
import { createPlayerAppearance, readLocalPlayerRsvp } from './player-rig.js';

export function requirePlayerIdentity(host, reason, next) {
  if (getSavedPlayerName()) {
    next();
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'identity-scan';
  overlay.innerHTML = `<form class="verdict-terminal" aria-label="Identitäts-Scan">
    <div class="identity-fiech" aria-hidden="true">👾</div>
    <h2>Inkognito? Nicht mit mir.</h2>
    <p>${reason === 'deaths' ? 'Fünfmal zerlegt. Wie heißt mein Lieblingsgegner?' : reason === 'victory' ? 'Boss zerlegt! Unter welchem Namen feiern wir dich?' : 'Wer kommt auf die Bestenliste?'}</p>
    <label>Dein Name<input name="playerName" autocomplete="given-name" maxlength="40" required placeholder="Vorname / Spitzname" /></label>
    <p class="verdict-error" role="alert"></p>
    <button class="verdict-action" type="submit">Speichern &amp; weiter</button>
  </form>`;
  host.appendChild(overlay);
  const form = overlay.querySelector('form');
  form.elements.playerName.focus();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      await persistPlayerName(form.elements.playerName.value);
      overlay.remove();
      if (host.isConnected) next();
    } catch (error) {
      console.error('Identitäts-Scan konnte nicht gespeichert werden.', error);
      form.querySelector('[role="alert"]').textContent =
        `⚠️ ${error.message} Bitte erneut bestätigen.`;
    } finally {
      button.disabled = false;
    }
  });
}

export function renderVerdict(
  screen,
  {
    won,
    stage = 1,
    protectedRsvp,
    retry,
    close,
    board,
    percent = getLocalBest().maxPercent,
    score = null,
    isRecord = false,
    decisionOpen = false
  }
) {
  const best = getLocalBest();
  const name = getSavedPlayerName();
  const scene = resultScene(stage, won);
  screen.innerHTML = `<section class="verdict-terminal verdict-themed" data-result-scene="${scene.id}" style="--result-accent:${scene.color}" aria-label="Das Urteil des Fiechs">
    <header class="verdict-header"><span class="verdict-kicker">FIECH ARCADE <span aria-hidden="true">//</span> RUN BEENDET</span><button type="button" class="verdict-exit" data-close aria-label="Spiel schließen und zur Einladung">✕</button></header>
    <div data-run-result>
    <div class="verdict-scene">
    <span class="verdict-stage">${scene.stage}</span>
    <canvas class="verdict-scene-canvas" width="320" height="145" role="img" aria-label="${escapeHtml(scene.title)}"></canvas>
    <div class="verdict-scene-copy"><h2>${scene.title}</h2><p>${scene.line}</p></div></div>
    <div class="verdict-stats"><div class="verdict-percent">${won ? '100' : percent}<span>%</span><small>Dieser Run</small></div><div><strong>${best.maxPercent}%${isRecord ? ' ✦' : ''}</strong><small>${isRecord ? 'Neuer Rekord' : 'Dein Rekord'}</small></div>${score === null ? '' : `<div><strong>${score}</strong><small>Punkte</small></div>`}</div>
    ${protectedRsvp ? '<p class="verdict-confirmed">Du bist dabei ✓</p>' : ''}
    <button type="button" class="verdict-action" data-retry>↻ Nochmal spielen</button>
    <button type="button" class="verdict-secondary" data-answer>${protectedRsvp ? 'Zur Einladung zurück' : 'Spiel beenden & antworten →'}</button>
    ${protectedRsvp ? '<button type="button" class="verdict-exit" data-change-status>Zu- / Absage ändern</button>' : ''}
    </div>
    <div class="verdict-decision" data-decision hidden>
      <button type="button" class="verdict-exit" data-back>← Zurück zum Ergebnis</button>
      <h2>Und die Party?</h2>
      <p class="verdict-question">${protectedRsvp ? 'Deine Zusage steht. Wirklich ändern?' : 'Das Fiech gibt nicht auf. Kommst du doch?'}</p>
    <form data-decision-form>
      ${name ? '' : `<label data-name-label>Dein Name
        <input name="playerName" maxlength="83" autocomplete="given-name" placeholder="Dein Name..." />
      </label>`}
      <div class="verdict-choices">
      <button type="button" class="verdict-card verdict-card--attending" data-choice="attending">
        <strong>✓ ${protectedRsvp ? 'Zusage behalten' : 'Na gut, trotzdem zusagen'}</strong>
      </button>
        <button type="button" class="verdict-card verdict-card--declined" data-choice="declined">
          <strong>✕ Wirklich absagen</strong>
          <span>Mit einer Nachricht an Georg</span>
        </button>
      </div>
      <div data-confession hidden>
        <label data-note-label for="verdictNote"></label>
        <textarea id="verdictNote" name="note" maxlength="1000" rows="2"></textarea>
        <button class="verdict-action" type="submit" data-confirm></button>
      </div>
      <p class="verdict-error" role="alert"></p>
    </form>
    <div data-decision-result role="status"></div>
    </div>
    <div class="verdict-footer">
      ${board ? '<button type="button" class="verdict-exit" data-board>Bestenliste</button>' : ''}
      <button type="button" class="verdict-exit" data-close>Schließen</button>
    </div>
  </section>`;
  const terminal = screen.querySelector('section');
  const active = () => terminal.isConnected && screen.contains(terminal);
  screen.querySelector('[data-retry]')?.addEventListener('click', retry);
  screen.querySelectorAll('[data-close]').forEach((button) => button.onclick = close);
  function showDecision(show) {
    screen.querySelector('[data-run-result]').hidden = show;
    screen.querySelector('[data-decision]').hidden = !show;
    screen.querySelector(show ? '[data-back]' : '[data-answer]').focus();
  }
  screen.querySelector('[data-answer]').onclick = protectedRsvp ? close : () => showDecision(true);
  screen.querySelector('[data-change-status]')?.addEventListener('click', () => showDecision(true));
  screen.querySelector('[data-back]').onclick = () => showDecision(false);
  screen.querySelector('[data-board]')?.addEventListener('click', board);
  const form = screen.querySelector('form');
  const playerName = () => getSavedPlayerName() || form.elements.playerName?.value.trim() || '';
  let choice = null;
  let busy = false;
  const canvas = screen.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const appearance = createPlayerAppearance(readLocalPlayerRsvp(), () => {
    if (reducedMotion) animateFiech(performance.now());
  });
  const started = performance.now();
  function animateFiech(now) {
    if (!canvas.isConnected) return;
    if (!screen.querySelector('[data-run-result]').hidden)
      drawResultScene(ctx, scene, (now - started) / 1000, appearance, reducedMotion);
    if (!reducedMotion) requestAnimationFrame(animateFiech);
  }
  requestAnimationFrame(animateFiech);
  function select(status) {
    if (busy) return;
    choice = status;
    screen.querySelector('[data-confession]').hidden = false;
    const note = form.elements.note;
    note.required = status === 'declined';
    note.hidden = status === 'attending';
    screen.querySelector('[data-note-label]').textContent =
      status === 'declined'
        ? 'Deine Ausrede / ein Gruß an Georg *'
        : 'Alles klar — wir zählen auf dich!';
    note.placeholder = 'Warum klappt es nicht?';
    screen.querySelector('[data-confirm]').textContent =
      status === 'declined'
        ? 'Absage speichern'
        : 'Zusage bestätigen';
    screen
      .querySelectorAll('[data-choice]')
      .forEach((button) =>
        button.setAttribute('aria-pressed', String(button.dataset.choice === status))
      );
    if (status === 'declined') {
      screen.querySelector('section').classList.remove('verdict-red-flash');
      void screen.offsetWidth;
      screen.querySelector('section').classList.add('verdict-red-flash');
    }
    if (!playerName()) {
      screen.querySelector('[data-name-label]').hidden = false;
      form.elements.playerName.focus();
    } else if (status !== 'attending') note.focus();
    else screen.querySelector('[data-confirm]').focus();
  }
  screen
    .querySelectorAll('[data-choice]')
    .forEach((button) => (button.onclick = () => select(button.dataset.choice)));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!choice || busy) return;
    const name = playerName();
    if (!name) {
      screen.querySelector('[data-name-label]').hidden = false;
      form.elements.playerName.required = true;
      form.elements.playerName.focus();
      form.elements.playerName.reportValidity();
      return;
    }
    busy = true;
    form.querySelectorAll('button').forEach((button) => (button.disabled = true));
    screen.querySelector('[role="alert"]').textContent = '';
    try {
      await saveGuestDecision({
        status: choice,
        name,
        note: choice === 'attending' ? undefined : form.elements.note.value
      });
      if (!active()) return;
      form.hidden = true;
      const result = screen.querySelector('[data-decision-result]');
      result.innerHTML = `<p class="verdict-confirmed">✓ ${choice === 'attending' ? 'Du bist dabei. Bis zur Party!' : 'Deine Absage ist angekommen.'}</p>${choice === 'attending' ? '<button type="button" class="verdict-exit" data-details>Begleitung, Musikwunsch & mehr ergänzen</button>' : ''}`;
      result.querySelector('[data-details]')?.addEventListener('click', () => {
        close();
        openRsvpModal();
      });
    } catch (error) {
      console.error('Entscheidung konnte nicht gespeichert werden.', error);
      if (!active()) return;
      screen.querySelector('[role="alert"]').textContent = `⚠️ ${error.message}`;
    } finally {
      busy = false;
      form.querySelectorAll('button').forEach((button) => (button.disabled = false));
    }
  });
  if (decisionOpen) showDecision(true);
}
