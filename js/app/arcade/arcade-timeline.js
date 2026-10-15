export function soundtrackSeconds(beat, config) {
  return Math.max(
    0,
    config.beatOffsetSec + ((beat.beatIndex + beat.beatPhase) * 60) / config.baseBpm
  );
}

export function nextStageBar(beat, minimumSeconds = 0) {
  const position = beat.beatIndex + beat.beatPhase;
  return Math.ceil((position + (minimumSeconds * beat.bpm) / 60 + 1e-6) / 4) * 4;
}

export function stageEntryBeat(stage, config) {
  if (stage === 1) return 0;
  return ((config.stageEndSec[stage - 2] - config.beatOffsetSec) * config.baseBpm) / 60;
}

export const STAGE_INTRO_SECONDS = 1.8;
export const BOSS_INTRO_TRACK_SECONDS = 18;
export const TRACK_INTROS = [1.8, 1.8, 3, BOSS_INTRO_TRACK_SECONDS];
export const MIN_STAGE_BEATS = [45, 35, 35];

export function introTrackElapsed(positionSec, cueSec, duration) {
  return Math.max(0, Math.min(duration, positionSec - cueSec));
}

export function validateStageCues(config) {
  if (
    !Number.isFinite(config.baseBpm) ||
    config.baseBpm <= 0 ||
    !Number.isFinite(config.beatOffsetSec) ||
    !Array.isArray(config.stageEndSec) ||
    config.stageEndSec.length !== 3
  ) {
    throw new Error(
      'arcadeAudio: baseBpm, beatOffsetSec und genau drei stageEndSec-Zeiten erforderlich.'
    );
  }
  let start = STAGE_INTRO_SECONDS;
  config.stageEndSec.forEach((end, index) => {
    const beats = ((end - start) * config.baseBpm) / 60;
    if (!Number.isFinite(end) || beats < MIN_STAGE_BEATS[index]) {
      throw new Error(
        `Stage ${index + 1}: Uebergangszeit muss mindestens ${(start + (MIN_STAGE_BEATS[index] * 60) / config.baseBpm).toFixed(2)} Sekunden betragen (nach ${start} s).`
      );
    }
    start = end + (index === 1 ? TRACK_INTROS[2] : 0);
  });
}

export function stageWindow(stage, config) {
  if (stage === 4) return null;
  const startSec =
    stage === 1
      ? STAGE_INTRO_SECONDS
      : config.stageEndSec[stage - 2] + (stage === 3 ? TRACK_INTROS[2] : 0);
  const endSec = config.stageEndSec[stage - 1];
  return {
    startSec,
    endSec,
    startBeat: ((startSec - config.beatOffsetSec) * config.baseBpm) / 60,
    durationBeats: ((endSec - startSec) * config.baseBpm) / 60
  };
}
