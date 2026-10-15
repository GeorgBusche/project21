import { cleanPlayerName } from './player-identity.js';
import { EVENT_CORE, dateFormatted } from '../content.js';

export function decodeInvitationName(search) {
  const params = new URLSearchParams(search);
  if (!params.has('u') && !params.has('id')) return null;
  let name;
  try {
    name = params.has('u') ? params.get('u') : new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(atob(params.get('id').replace(/ /g, '+')), (char) => char.charCodeAt(0))
    );
  } catch (error) {
    throw new Error('Der persönliche Link ist ungültig. Trag deinen Namen bitte selbst ein.', { cause: error });
  }
  name = cleanPlayerName(name).slice(0, 40);
  if (!name) throw new Error('Im persönlichen Link fehlt der Name. Trag ihn bitte selbst ein.');
  return name;
}

export function createInvitation(name, baseUrl) {
  const clean = cleanPlayerName(name).slice(0, 40);
  if (!clean) throw new Error('Bitte gib einen Namen ein.');
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';
  const encoded = btoa(Array.from(new TextEncoder().encode(clean), (byte) => String.fromCharCode(byte)).join(''));
  url.searchParams.set('id', encoded);
  const link = url.href;
  const message = `Moin ${clean}! ${EVENT_CORE.hostName} wird ${EVENT_CORE.age} und wir feiern am ${dateFormatted} im ${EVENT_CORE.locationName} (${EVENT_CORE.locationCity}). Klick auf deinen persönlichen Link und trag ein, ob du am Start bist: ${link}`;
  return { name: clean, link, message };
}
