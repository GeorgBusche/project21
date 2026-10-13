import { CONFIG } from './config.js';
import { playBuzzerError, playSuccessChime, playTone, toggleAudio } from './app/audio.js';
import { initializeCommands, runCommand, toggleCommands } from './app/commands.js';
import { handleDeclineClick } from './app/decline-game.js';
import {
  addSongFromSearch,
  addSongVote,
  clearMusicSearch,
  clearSelectedRsvpSong,
  closeMusicModal,
  closeRadarModal,
  closeRsvpModal,
  copyAddressToClipboard,
  dispatchRsvpWhatsApp,
  initializePartyBackend,
  openMusicModal,
  openRadarModal,
  openRsvpModal,
  selectRsvpSong,
  showGuestBoard,
  stopAudioPreview,
  submitSongProposal,
  toggleAudioPreview,
  togglePlusOneInput,
  toggleSongVote,
  updatePegelDisplay
} from './app/party-actions.js';
import { emergencySkipParty, initializeSudo, triggerRandomSudoParty } from './app/sudo.js';
import {
  appendLine,
  escapeHtml,
  showToast,
  startBootSequence,
  toggleCRT,
  toggleFullscreen
} from './app/ui.js';

window.CONFIG = CONFIG;
window.isSudoRunning = false;
window.canSkip = false;

Object.assign(window, {
  addSongFromSearch,
  addSongVote,
  appendLine,
  clearMusicSearch,
  clearSelectedRsvpSong,
  closeMusicModal,
  closeRadarModal,
  closeRsvpModal,
  copyAddressToClipboard,
  dispatchRsvpWhatsApp,
  emergencySkipParty,
  escapeHtml,
  handleDeclineClick,
  openMusicModal,
  openRadarModal,
  openRsvpModal,
  playBuzzerError,
  playSuccessChime,
  playTone,
  runCommand,
  selectRsvpSong,
  showGuestBoard,
  showToast,
  stopAudioPreview,
  submitSongProposal,
  toggleAudio,
  toggleAudioPreview,
  toggleCommands,
  toggleCRT,
  toggleFullscreen,
  togglePlusOneInput,
  toggleSongVote,
  triggerRandomSudoParty,
  updatePegelDisplay
});

function initializeApp() {
  initializePartyBackend();
  initializeSudo();
  initializeCommands();
  startBootSequence();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
} else {
  initializeApp();
}
