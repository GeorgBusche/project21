import { escapeHtml, showToast } from './ui.js';
import { getSavedPlayerName, invitationName, savePlayerName, readSavedRsvp, rsvpStatus, PLAYER_NAME_PENDING_KEY } from './player-identity.js';
import { syncLeaderboardName } from './arcade/arcade-scoreboard.js';
import { decodeInvitationName } from './personal-links.js';
import { playIdentityConfirm } from './audio.js';
import { AVATAR_PRESETS, normalizeAvatar, readAvatarPhoto, PROFILE_AVATAR_PENDING_KEY } from './profile-avatar.js';

export function readInvitation() {
  const params = new URLSearchParams(window.location.search);
  const adminLinks = params.get('admin') === 'links';
  let error = '';
  if (params.has('u') || params.has('id')) {
    try {
      const original = decodeInvitationName(window.location.search);
      localStorage.setItem('party_original_name', original);
    } catch (cause) {
      console.error('Persönlicher Einladungslink konnte nicht gelesen werden.', cause);
      error = cause.message;
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  return { adminLinks, error };
}

export function initializeWelcomeName({ adminLinks, error }) {
  const button = document.getElementById('editPlayerName');
  const updateButton = () => {
    const name = getSavedPlayerName();
    button.innerHTML = '✎ <span>Name ändern</span>';
    button.setAttribute('aria-label', 'Name ändern');
    button.title = name ? `Name ändern: ${name}` : 'Namen eingeben';
    button.hidden = Boolean(name);
    const identity = document.getElementById('activeIdentity');
    identity.hidden = !name;
    document.body.classList.toggle('has-player-profile', Boolean(name));
    identity.querySelector('[data-active-name]').textContent = name;
    const record = readSavedRsvp();
    const status = rsvpStatus(record);
    identity.querySelector('[data-active-status]').textContent =
      status === 'attending' ? '✓ Fest dabei' : status === 'declined' ? '× Abgesagt' : '○ Antwort offen';
    const statusText = identity.querySelector('[data-active-status]').textContent;
    identity.title = `${name} · ${statusText} · Profil bearbeiten`;
    identity.setAttribute('aria-label', `${name}, ${statusText}. Profil bearbeiten`);
    const avatar = identity.querySelector('[data-profile-avatar]');
    avatar.replaceChildren();
    const picture = record?.avatar;
    if (picture?.type === 'image' && /^(data:image\/|https?:\/\/)/i.test(picture.value || '')) {
      const image = document.createElement('img');
      image.src = picture.value;
      image.alt = '';
      avatar.append(image);
    } else {
      avatar.textContent = typeof picture === 'string' ? picture : picture?.type === 'emoji' ? picture.value : '👾';
    }
    identity.dataset.status = status || 'unanswered';
    const rsvpInput = document.getElementById('rsvpName');
    if (rsvpInput) rsvpInput.value = name;
    document.getElementById('rsvpNameField').hidden = Boolean(name);
    document.getElementById('rsvpIdentity').hidden = !name;
    document.querySelector('[data-rsvp-name]').textContent = name;
  };
  button.onclick = () => openNameDialog();
  document.querySelector('[data-identity-edit]').onclick = () => openNameDialog();
  document.querySelector('[data-rsvp-name-edit]').onclick = () => openNameDialog();
  window.addEventListener('party-name-change', updateButton);
  window.addEventListener('party-rsvp-change', updateButton);
  updateButton();
  if (!adminLinks && (!localStorage.getItem('party_confirmed_name') || error)) {
    openNameDialog(error);
  }
}

function openNameDialog(linkError = '') {
  if (document.getElementById('welcomeNameDialog')) return;
  const original = localStorage.getItem('party_original_name') || '';
  const previous = document.activeElement;
  const current = getSavedPlayerName();
  const firstConfirmation = !localStorage.getItem('party_confirmed_name');
  const editing = !firstConfirmation;
  let selectedAvatar = normalizeAvatar(readSavedRsvp()?.avatar);
  let avatarChanged = false;
  let photoRequest = 0;
  let stopRevealSound = null;
  const dialog = document.createElement('dialog');
  dialog.id = 'welcomeNameDialog';
  dialog.className = `welcome-name${editing ? ' profile-editor' : ''}`;
  dialog.setAttribute('aria-labelledby', 'welcomeNameTitle');
  dialog.innerHTML = `<form>
    <span class="verdict-kicker">PROJECT 21 // ${editing ? 'DEIN PROFIL' : 'WILLKOMMEN'}</span>
    <h2 id="welcomeNameTitle" tabindex="-1">${editing ? 'Dein Auftritt.' : original ? `Moin ${escapeHtml(original)}!` : 'Moin! Schön, dass du da bist.'}</h2>
    ${current ? `<p class="profile-dialog-status">${rsvpStatus(readSavedRsvp()) === 'attending' ? '✓ Du bist fest dabei.' : rsvpStatus(readSavedRsvp()) === 'declined' ? 'Du hast abgesagt.' : 'Deine Zu- oder Absage ist noch offen.'}</p>` : ''}
    ${editing ? `<section class="profile-picture-editor" aria-label="Profilbild auswählen">
      <div class="profile-picture-heading"><div class="profile-picture-preview" data-avatar-preview></div><div><strong>Dein Profilbild</strong><small>Für Gästeliste & VIP-Ticket</small></div></div>
      <div class="profile-photo-actions"><label>↑ Foto wählen<input type="file" accept="image/*" data-photo /></label><label>📷 Foto machen<input type="file" accept="image/*" capture="user" data-photo /></label></div>
      <div class="profile-avatar-presets" role="group" aria-label="Avatar statt Foto">${AVATAR_PRESETS.map((emoji) => `<button type="button" data-avatar="${emoji}" aria-label="Avatar ${emoji}" aria-pressed="false">${emoji}</button>`).join('')}</div>
      <small>Fotos werden mittig quadratisch zugeschnitten. Öffentlich sichtbar, sobald du antwortest.</small>
    </section>` : `<p>${original ? 'Schön, dass du da bist. Bestätige deinen Namen oder wähle einen Spitznamen.' : 'Trag kurz deinen Namen ein, damit Georg weiß, wer du bist.'}</p>`}
    <label for="welcomeNameInput">Vorname oder Spitzname</label>
    <input id="welcomeNameInput" name="playerName" autocomplete="given-name" maxlength="83" required value="${escapeHtml(current || original)}" placeholder="Dein Name" aria-describedby="welcomeNamePreview" />
    <p id="welcomeNamePreview" class="name-preview" aria-live="polite"></p>
    <p class="verdict-error" role="alert">${escapeHtml(linkError)}</p>
    <div class="profile-dialog-actions"><button class="verdict-action" type="submit">${editing ? '✓ Profil speichern' : 'Namen bestätigen & weiter →'}</button>
    ${current ? '<button type="button" class="verdict-exit" data-cancel>Abbrechen</button>' : ''}</div>
    <small>${editing ? 'Deine Zu- oder Absage bleibt unverändert.' : 'Das ist noch keine Zu- oder Absage. Dein Bild kannst du danach im Profil einstellen.'}</small>
  </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const input = form.elements.playerName;
  const preview = dialog.querySelector('.name-preview');
  const renderAvatar = () => {
    const target = dialog.querySelector('[data-avatar-preview]');
    if (!target) return;
    target.replaceChildren();
    if (selectedAvatar.type === 'image') {
      const image = document.createElement('img');
      image.src = selectedAvatar.value;
      image.alt = 'Deine Profilbild-Vorschau';
      target.append(image);
    } else target.textContent = selectedAvatar.value;
    dialog.querySelectorAll('[data-avatar]').forEach((button) => {
      button.setAttribute('aria-pressed', String(selectedAvatar.type === 'emoji' && selectedAvatar.value === button.dataset.avatar));
    });
  };
  renderAvatar();
  dialog.querySelectorAll('[data-avatar]').forEach((button) => button.addEventListener('click', () => {
    photoRequest++;
    form.querySelector('[type="submit"]').disabled = false;
    selectedAvatar = { type: 'emoji', value: button.dataset.avatar };
    avatarChanged = true;
    renderAvatar();
  }));
  dialog.querySelectorAll('[data-photo]').forEach((picker) => picker.addEventListener('change', async () => {
    const file = picker.files[0];
    picker.value = '';
    if (!file) return;
    const request = ++photoRequest;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const photo = await readAvatarPhoto(file);
      if (request !== photoRequest || !dialog.isConnected) return;
      selectedAvatar = photo;
      avatarChanged = true;
      renderAvatar();
      form.querySelector('[role="alert"]').textContent = '';
    } catch (error) {
      console.error('Profilfoto konnte nicht geladen werden.', error);
      if (request === photoRequest) form.querySelector('[role="alert"]').textContent = error.message;
    } finally {
      if (request === photoRequest) submit.disabled = false;
    }
  }));
  const update = () => {
    const name = input.value.trim() ? invitationName(input.value) : '';
    preview.textContent = name && (!editing || name !== input.value.trim()) ? `So erscheinst du: ${name}` : '';
  };
  const dismiss = () => {
    stopRevealSound?.();
    dialog.close();
    dialog.remove();
    if (previous?.isConnected) previous.focus();
  };
  update();
  input.addEventListener('input', update);
  dialog.querySelector('[data-cancel]')?.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (current && !dialog.classList.contains('identity-verified')) dismiss();
  });
  form.onsubmit = (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      if (avatarChanged) {
        localStorage.setItem(PROFILE_AVATAR_PENDING_KEY, JSON.stringify(selectedAvatar));
        localStorage.setItem('party_rsvp_data', JSON.stringify({
          ...(readSavedRsvp() || { status: 'unanswered' }), avatar: selectedAvatar
        }));
      }
      const name = savePlayerName(input.value);
      localStorage.setItem(PLAYER_NAME_PENDING_KEY, name);
      const rsvpInput = document.getElementById('rsvpName');
      if (rsvpInput) rsvpInput.value = getSavedPlayerName();
      if (firstConfirmation) {
        stopRevealSound = playIdentityConfirm();
        playIdentityReveal(dialog, name, dismiss);
      } else dismiss();
      syncLeaderboardName(name).catch((error) => {
        console.error('Profil konnte nicht online gespeichert werden.', error);
        showToast('⚠️ Profil lokal gespeichert. Online-Abgleich beim nächsten Besuch oder über „Profil bearbeiten“ erneut versuchen.');
      });
    } catch (error) {
      console.error('Profil konnte nicht lokal gespeichert werden.', error);
      form.querySelector('[role="alert"]').textContent = error.message;
    } finally {
      button.disabled = false;
    }
  };
  dialog.showModal();
  if (editing) dialog.querySelector('h2').focus();
  else {
    input.focus();
    input.select();
  }
}

export const IDENTITY_REVEAL_MS = 1450;

function playIdentityReveal(dialog, name, dismiss) {
  dialog.classList.add('identity-verified');
  dialog.setAttribute('aria-labelledby', 'identityVerifiedTitle');
  dialog.innerHTML = `<div class="identity-reveal" role="status">
    <span class="verdict-kicker">PROJECT 21 // IDENTITY LOCKED</span>
    <div class="identity-seal" aria-hidden="true">
      <div class="identity-orbit"></div><div class="identity-orbit identity-orbit--inner"></div>
      ${Array.from({ length: 12 }, (_, i) => `<i style="--ray:${i}"></i>`).join('')}
      <span>✓</span>
    </div>
    <h2 id="identityVerifiedTitle">Du bist drin.</h2>
    <strong class="identity-reveal-name">${escapeHtml(name)}</strong>
    <p>Identität bestätigt. Jetzt fehlt nur deine Antwort.</p>
    <div class="identity-load" aria-hidden="true"></div>
    <button type="button" class="verdict-exit">Weiter zur Einladung →</button>
  </div>`;
  const button = dialog.querySelector('button');
  const timer = setTimeout(dismiss, matchMedia('(prefers-reduced-motion: reduce)').matches ? 450 : IDENTITY_REVEAL_MS);
  button.onclick = () => {
    clearTimeout(timer);
    dismiss();
  };
  button.focus({ preventScroll: true });
}
