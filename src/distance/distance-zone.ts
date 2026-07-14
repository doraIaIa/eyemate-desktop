export type DistanceZone = "NEAR" | "COMFORT" | "FAR" | "UNKNOWN";
export interface DistanceObservation { readonly zone: Exclude<DistanceZone, "UNKNOWN">; readonly qualityAccepted: boolean; readonly deviceProfileMatches: boolean; }
export interface DistanceZoneState { readonly zone: DistanceZone; readonly consecutiveValidSamples: number; readonly calibrationRequired: boolean; }

export function initialDistanceZoneState(): DistanceZoneState { return { zone: "UNKNOWN", consecutiveValidSamples: 0, calibrationRequired: true }; }

export function applyDistanceObservation(state: DistanceZoneState, observation: DistanceObservation): DistanceZoneState {
  if (!observation.deviceProfileMatches) return { zone: "UNKNOWN", consecutiveValidSamples: 0, calibrationRequired: true };
  if (!observation.qualityAccepted) return { ...state, zone: "UNKNOWN", consecutiveValidSamples: 0 };
  const samples = state.zone === observation.zone ? state.consecutiveValidSamples + 1 : 1;
  if (state.calibrationRequired || samples < 2) return { ...state, consecutiveValidSamples: samples };
  return { zone: observation.zone, consecutiveValidSamples: samples, calibrationRequired: false };
}

export function acceptCalibration(state: DistanceZoneState): DistanceZoneState { return { ...state, zone: "UNKNOWN", consecutiveValidSamples: 0, calibrationRequired: false }; }
