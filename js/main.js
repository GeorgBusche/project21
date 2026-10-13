import { CONFIG } from './config.js';
import {
  adminAppendPin,
  adminClearAllConfirm,
  adminClearPin,
  adminClearRsvpsConfirm,
  adminClearSongsConfirm,
  adminCopyDrinkPlan,
  adminCopyGuestsText,
  adminDownloadFullBackup,
  adminExportGuestsCsv,
  adminExportPlaylist,
  adminHandleRestoreUpload,
  adminSaveAnnouncement,
  adminShowDrinkCalculator,
  closeAdminModal,
  initializeAdmin,
  openAdminModal,
  verifyAdminPin
} from './app/admin.js';
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
  adminAppendPin,
  adminClearAllConfirm,
  adminClearPin,
  adminClearRsvpsConfirm,
  adminClearSongsConfirm,
  adminCopyDrinkPlan,
  adminCopyGuestsText,
  adminDownloadFullBackup,
  adminExportGuestsCsv,
  adminExportPlaylist,
  adminHandleRestoreUpload,
  adminSaveAnnouncement,
  adminShowDrinkCalculator,
  closeAdminModal,
  openAdminModal,
  verifyAdminPin,
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

function checkBrowserCompatibility() {
  const isSamsung = /SamsungBrowser/i.test(navigator.userAgent);
  if (isSamsung && !sessionStorage.getItem('samsung_browser_hint_shown')) {
    sessionStorage.setItem('samsung_browser_hint_shown', '1');
    setTimeout(() => {
      appendLine(
        "<span class='text-amber-400'>[HINWEIS] Samsung Internet erkannt: Falls Farben unnatürlich wirken, deaktiviere 'Dunkelmodus für Webseiten' in den Browser-Einstellungen.</span>"
      );
    }, 2800);
  }
}

function initializeApp() {
  initializePartyBackend();
  initializeAdmin();
  initializeSudo();
  initializeCommands();
  startBootSequence();
  checkBrowserCompatibility();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
} else {
  initializeApp();
}
