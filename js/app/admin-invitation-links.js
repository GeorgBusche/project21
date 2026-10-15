import { EVENT_CORE } from '../content.js';
import { createInvitation } from './personal-links.js';
import { escapeHtml, showToast } from './ui.js';

export function initializeInvitationLinks(open = false) {
  const panel = document.getElementById('adminInvitationLinks');
  if (open) {
    panel.open = true;
    panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  if (panel.dataset.ready) return;
  panel.dataset.ready = 'true';
  const input = panel.querySelector('textarea');
  const list = panel.querySelector('[data-links-list]');
  input.addEventListener('input', () => {
    const names = [...new Set(input.value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean))];
    list.replaceChildren();
    panel.querySelector('[data-links-count]').textContent = `${names.length} persönliche Links`;
    for (const name of names) {
      const invitation = createInvitation(name, `${EVENT_CORE.siteUrl.replace(/\/$/, '')}/`);
      const row = document.createElement('article');
      row.className = 'invitation-link-row';
      row.innerHTML = `<strong>${escapeHtml(invitation.name)}</strong>
        <input readonly aria-label="Einladungslink für ${escapeHtml(invitation.name)}" value="${escapeHtml(invitation.link)}" />
        <div><button type="button" data-whatsapp>WhatsApp öffnen ↗</button><button type="button" data-copy>📋 Link kopieren</button></div>`;
      row.querySelector('[data-whatsapp]').onclick = () => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(invitation.message)}`, '_blank', 'noopener,noreferrer');
      };
      row.querySelector('[data-copy]').onclick = async (event) => {
        const button = event.currentTarget;
        try {
          await navigator.clipboard.writeText(invitation.link);
          button.textContent = '✓ Kopiert';
        } catch (error) {
          console.error('Einladungslink konnte nicht kopiert werden.', error);
          showToast('⚠️ Kopieren fehlgeschlagen. Markiere den Link und kopiere ihn manuell.');
          row.querySelector('input').select();
        }
      };
      list.append(row);
    }
  });
}
