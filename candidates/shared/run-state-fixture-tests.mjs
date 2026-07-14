import { CAMERA_STATES, transitionCameraState } from './m0-state.mjs';

let state = CAMERA_STATES.OFF;
state = transitionCameraState(state, 'REQUEST_CAMERA');
const consent = state === CAMERA_STATES.CONSENT;
state = transitionCameraState(state, 'SIMULATE_UNAVAILABLE');
const unavailable = state === CAMERA_STATES.UNAVAILABLE;
state = transitionCameraState(state, 'STOP');
const stopped = state === CAMERA_STATES.OFF;
let invalid = false;
try { transitionCameraState(CAMERA_STATES.OFF, 'SIMULATE_UNAVAILABLE'); } catch (error) { invalid = error.message === 'INVALID_CAMERA_STATE_TRANSITION'; }
for (const [name, pass] of [['explicit-consent-action', consent], ['unavailable-state', unavailable], ['clean-stop-camera-off', stopped], ['invalid-transition-rejected', invalid]]) console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`);
if (!(consent && unavailable && stopped && invalid)) process.exitCode = 1; else console.log('CANDIDATE_STATE_FIXTURES_PASSED: 4');
