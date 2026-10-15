import { CONFIG } from './config.js';
import { readInvitation, initializeWelcomeName } from './app/welcome-name.js';
import { CONTENT } from './content.js';
import {
  adminAppendPin,
  adminClearPin,
  adminCopyDrinkPlan,
  adminCopyGuestsText,
  adminDownloadFullBackup,
  adminExportGuestsCsv,
  adminExportPlaylist,
  adminHandleRestoreUpload,
  adminNextVoteSkip,
  adminNextVoteStart,
  adminResetTestData,
  adminSaveAnnouncement,
  adminShowDrinkCalculator,
  adminSpotifyConnect,
  adminSpotifyDisconnect,
  adminSpotifySyncPlaylist,
  adminTogglePartyModeGlobal,
  adminTogglePartyModePreview,
  closeAdminModal,
  initializeAdmin,
  openAdminModal,
  verifyAdminPin
} from './app/admin.js';
import { playBuzzerError, playSuccessChime, playTone, toggleAudio } from './app/audio.js';
import {
  initializeCommands,
  runCommand,
  toggleCommands,
  toggleSecretCli
} from './app/commands.js';
import { closeArcadeGame, openArcadeGame } from './app/arcade/arcade-engine.js';
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
  downloadPartyCalendar,
  handlePlusOneInput,
  initializePartyBackend,
  openGuestModal,
  openMusicModal,
  openRadarModal,
  openRsvpModal,
  rollRandomPegel,
  saveRsvp,
  selectRsvpSong,
  sendRsvpViaWhatsApp,
  setGuestFilter,
  setGuestStatus,
  showGuestBoard,
  stopAudioPreview,
  toggleAudioPreview,
  toggleGuestStatsModal,
  togglePlusOneInput,
  toggleSongVote,
  toggleStatDetail,
  updateBottomRsvpButton,
  updatePegelDisplay
} from './app/party-actions.js';
import {
  closeTrophies,
  initializeAchievements,
  openTrophies
} from './app/achievements.js';
import {
  closeDrinkingGameModal,
  openDrinkingGameModal,
  passKernelBomb,
  setDrinkingGameMode,
  startKernelBomb,
  startLohhofDuel
} from './app/party-mode/drinking-game.js';
import {
  closeTicketModal,
  downloadTicketImage,
  openTicketModal,
  shareTicketImage
} from './app/ticket-generator.js';
import {
  initializeModeController
} from './app/party-mode/mode-controller.js';
import {
  closeGalleryLightbox,
  closeGalleryModal,
  deleteGalleryPhoto,
  downloadGalleryPhoto,
  openGalleryLightbox,
  openGalleryModal,
  openSnapFromGallery,
  toggleSnapLike
} from './app/party-mode/gallery.js';
import {
  closeSnapModal,
  handleSnapFileUpload,
  openSnapModal,
  postSnap,
  retakeSnap,
  saveSnapToDevice,
  setSnapFilter,
  switchSnapCamera,
  takeSnap,
  updateSnapCaption
} from './app/party-mode/snap-camera.js';
import {
  castNextVote,
  closeNextSongModal,
  initializeSpotifyNextVote,
  openNextSongModal
} from './app/party-mode/spotify-next-vote.js';
import {
  closeWheelModal,
  openWheelModal,
  setWheelMode,
  spinWheel
} from './app/party-mode/wheel-roulette.js';
import {
  closeSudoJukebox,
  emergencySkipParty,
  initializeSudo,
  openSudoJukebox,
  triggerRandomSudoParty,
  triggerSpecificSudoParty
} from './app/sudo.js';
import {
  appendLine,
  applyStaticContent,
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
  adminResetTestData,
  addSongFromSearch,
  addSongVote,
  appendLine,
  changeGuestSort,
  clearGuestSearch,
  clearMusicSearch,
  clearSelectedRsvpSong,
  closeArcadeGame,
  closeGuestModal,
  closeGuestStatsModal,
  closeMusicModal,
  closeRadarModal,
  closeRsvpModal,
  closeStatDetail,
  copyAddressToClipboard,
  downloadPartyCalendar,
  emergencySkipParty,
  escapeHtml,
  handleDeclineClick,
  handlePlusOneInput,
  openGuestModal,
  openArcadeGame,
  openMusicModal,
  openRadarModal,
  openRsvpModal,
  playBuzzerError,
  playSuccessChime,
  playTone,
  rollRandomPegel,
  runCommand,
  saveRsvp,
  selectRsvpSong,
  sendRsvpViaWhatsApp,
  setGuestFilter,
  setGuestStatus,
  showGuestBoard,
  adminAppendPin,
  adminClearPin,
  adminCopyDrinkPlan,
  adminCopyGuestsText,
  adminDownloadFullBackup,
  adminExportGuestsCsv,
  adminExportPlaylist,
  adminHandleRestoreUpload,
  adminSaveAnnouncement,
  adminShowDrinkCalculator,
  adminTogglePartyModeGlobal,
  adminTogglePartyModePreview,
  adminNextVoteSkip,
  adminNextVoteStart,
  adminSpotifyConnect,
  adminSpotifyDisconnect,
  adminSpotifySyncPlaylist,
  castNextVote,
  closeTicketModal,
  downloadTicketImage,
  openTicketModal,
  shareTicketImage,
  closeNextSongModal,
  closeGalleryLightbox,
  closeGalleryModal,
  closeSnapModal,
  deleteGalleryPhoto,
  downloadGalleryPhoto,
  handleSnapFileUpload,
  openGalleryLightbox,
  openSnapFromGallery,
  postSnap,
  retakeSnap,
  saveSnapToDevice,
  setSnapFilter,
  switchSnapCamera,
  takeSnap,
  toggleSnapLike,
  updateSnapCaption,
  closeAdminModal,
  openAdminModal,
  verifyAdminPin,
  closeDrinkingGameModal,
  closeWheelModal,
  openDrinkingGameModal,
  openGalleryModal,
  openNextSongModal,
  openSnapModal,
  openWheelModal,
  passKernelBomb,
  setDrinkingGameMode,
  setWheelMode,
  spinWheel,
  startKernelBomb,
  startLohhofDuel,
  showToast,
  stopAudioPreview,
  toggleAudio,
  toggleAudioPreview,
  toggleCommands,
  toggleCRT,
  toggleFullscreen,
  toggleGuestStatsModal,
  togglePlusOneInput,
  toggleSecretCli,
  toggleSongVote,
  toggleStatDetail,
  triggerRandomSudoParty,
  triggerSpecificSudoParty,
  closeSudoJukebox,
  closeTrophies,
  openTrophies,
  openSudoJukebox,
  updateBottomRsvpButton,
  updatePegelDisplay
});

function initializeApp() {
  const invitation = readInvitation();
  applyStaticContent();
  initializePartyBackend();
  initializeAdmin({ links: invitation.adminLinks });
  initializeSudo();
  initializeCommands();
  initializeAchievements();
  initializeModeController();
  initializeSpotifyNextVote();
  startBootSequence();
  initializeWelcomeName(invitation);
}

// Für Kenner: Wer die Konsole öffnet, findet den Weg zum geheimen Terminal.
console.log(
  '%c ' + CONTENT.secretCli.prompt + ' ',
  'background:#022c22;color:#34d399;font:bold 14px monospace;padding:4px'
);
console.log(CONTENT.secretCli.consoleHint.join('\n'));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
} else {
  initializeApp();
}
