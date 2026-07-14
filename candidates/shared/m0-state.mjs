export const CAMERA_STATES = Object.freeze({ OFF: 'CAMERA_OFF', CONSENT: 'CONSENT_REQUIRED', UNAVAILABLE: 'CAMERA_UNAVAILABLE' });

export function transitionCameraState(state, action) {
  if (state === CAMERA_STATES.OFF && action === 'REQUEST_CAMERA') return CAMERA_STATES.CONSENT;
  if (state === CAMERA_STATES.CONSENT && action === 'SIMULATE_UNAVAILABLE') return CAMERA_STATES.UNAVAILABLE;
  if (state === CAMERA_STATES.UNAVAILABLE && action === 'STOP') return CAMERA_STATES.OFF;
  throw new Error('INVALID_CAMERA_STATE_TRANSITION');
}
