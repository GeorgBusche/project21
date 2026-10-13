import { CONFIG } from './config.js';
import { playBuzzerError, playSuccessChime, playTone, toggleAudio } from './app/audio.js';
import { initializeCommands, runCommand, toggleCommands } from './app/commands.js';
import { handleDeclineClick } from './app/decline-game.js';
import {
  addSongFromSearch,
  addSongVote,
  changeGuestSort,
  clearGuestSearch,
  clearMusicSearch,
  clearSelectedRsvpSong,
  closeGuestModal,
  closeGuestStatsModal,
  closeMusicModal,
  closeRadarModal,
  closeRsvpModal,
  closeStatDetail,
  copyAddressToClipboard,
  dispatchRsvpWhatsApp,
  handleAvatarPhotoUpload,
  handlePlusOneInput,
  initializePartyBackend,
  openGuestModal,
  openMusicModal,
  openRadarModal,
  openRsvpModal,
  rollRandomPegel,
  selectAvatarPreset,
  selectRsvpSong,
  setGuestFilter,
  showGuestBoard,
  stopAudioPreview,
  submitSongProposal,
  toggleAudioPreview,
  toggleGuestStatsAndFilters,
  toggleGuestStatsModal,
  togglePlusOneInput,
  toggleSongVote,
  toggleStatDetail,
  updateBottomRsvpButton,
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
  changeGuestSort,
  clearGuestSearch,
  clearMusicSearch,
  clearSelectedRsvpSong,
  closeGuestModal,
  closeGuestStatsModal,
  closeMusicModal,
  closeRadarModal,
  closeRsvpModal,
  closeStatDetail,
  copyAddressToClipboard,
  dispatchRsvpWhatsApp,
  emergencySkipParty,
  escapeHtml,
  handleAvatarPhotoUpload,
  handleDeclineClick,
  handlePlusOneInput,
  openGuestModal,
  openMusicModal,
  openRadarModal,
  openRsvpModal,
  playBuzzerError,
  playSuccessChime,
  playTone,
  rollRandomPegel,
  runCommand,
  selectAvatarPreset,
  selectRsvpSong,
  setGuestFilter,
  showGuestBoard,
  showToast,
  stopAudioPreview,
  submitSongProposal,
  toggleAudio,
  toggleAudioPreview,
  toggleCommands,
  toggleCRT,
  toggleFullscreen,
  toggleGuestStatsAndFilters,
  toggleGuestStatsModal,
  togglePlusOneInput,
  toggleSongVote,
  toggleStatDetail,
  triggerRandomSudoParty,
  updateBottomRsvpButton,
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
