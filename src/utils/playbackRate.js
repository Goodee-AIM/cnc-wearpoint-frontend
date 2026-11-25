// Manual playback is local; shared playback follows the server-advertised rate.
export const PLAYBACK_RATE = 4;

export function monitoringPlaybackRate(state, item) {
  if (state?.gated_playback && item?.playback_phase !== "playing") return 0;
  const rate = item?.playback_rate ?? state?.playback_rate ?? 1;
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
}
