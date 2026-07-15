export const DISTANCE_RATIO_FILTER_CONFIG = Object.freeze({
  version: "distance-ratio-filter/1.0.0",
  medianWindowSize: 5,
  minimumReferenceSamples: 3,
  maximumRelativeOutlier: 0.25,
  requiredConsecutiveReadings: 3,
  nearEnterRatio: 0.85,
  nearExitRatio: 0.92,
  farExitRatio: 1.08,
  farEnterRatio: 1.15
} as const);

export type ObservedDistanceZone = "NEAR" | "COMFORT" | "FAR";

export interface RatioZoneFilterResult {
  readonly status: "OBSERVED" | "WARMING_UP" | "OUTLIER_REJECTED";
  readonly zone: ObservedDistanceZone | null;
  readonly filteredInterEyeDistancePx: number | null;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function candidateZone(relativeDistance: number, stableZone: ObservedDistanceZone | null): ObservedDistanceZone {
  if (stableZone === "NEAR" && relativeDistance < DISTANCE_RATIO_FILTER_CONFIG.nearExitRatio) return "NEAR";
  if (stableZone === "FAR" && relativeDistance > DISTANCE_RATIO_FILTER_CONFIG.farExitRatio) return "FAR";
  if (relativeDistance < DISTANCE_RATIO_FILTER_CONFIG.nearEnterRatio) return "NEAR";
  if (relativeDistance > DISTANCE_RATIO_FILTER_CONFIG.farEnterRatio) return "FAR";
  return "COMFORT";
}

export class RatioZoneFilter {
  readonly #referenceInterEyePx: number;
  readonly #window: number[] = [];
  #stableZone: ObservedDistanceZone | null = null;
  #candidateZone: ObservedDistanceZone | null = null;
  #candidateCount = 0;
  #needsReconfirmation = false;

  constructor(referenceInterEyePx: number) {
    if (!Number.isFinite(referenceInterEyePx) || referenceInterEyePx <= 0) throw new Error("INVALID_DISTANCE_RATIO_REFERENCE");
    this.#referenceInterEyePx = referenceInterEyePx;
  }

  push(interEyeDistancePx: number): RatioZoneFilterResult {
    if (!Number.isFinite(interEyeDistancePx) || interEyeDistancePx <= 0) {
      return this.reject();
    }

    if (this.#window.length >= DISTANCE_RATIO_FILTER_CONFIG.minimumReferenceSamples) {
      const referenceMedian = median(this.#window);
      const relativeDeviation = Math.abs(interEyeDistancePx - referenceMedian) / referenceMedian;
      if (relativeDeviation > DISTANCE_RATIO_FILTER_CONFIG.maximumRelativeOutlier) {
        return this.reject();
      }
    }

    this.#window.push(interEyeDistancePx);
    if (this.#window.length > DISTANCE_RATIO_FILTER_CONFIG.medianWindowSize) this.#window.shift();
    const filteredInterEyeDistancePx = median(this.#window);
    const nextCandidate = candidateZone(this.#referenceInterEyePx / filteredInterEyeDistancePx, this.#stableZone);

    if (nextCandidate === this.#stableZone && !this.#needsReconfirmation) {
      this.#candidateZone = null;
      this.#candidateCount = 0;
      return { status: "OBSERVED", zone: this.#stableZone, filteredInterEyeDistancePx };
    }

    if (nextCandidate === this.#candidateZone) this.#candidateCount += 1;
    else {
      this.#candidateZone = nextCandidate;
      this.#candidateCount = 1;
    }

    if (this.#candidateCount >= DISTANCE_RATIO_FILTER_CONFIG.requiredConsecutiveReadings) {
      this.#stableZone = nextCandidate;
      this.#candidateZone = null;
      this.#candidateCount = 0;
      this.#needsReconfirmation = false;
      return { status: "OBSERVED", zone: this.#stableZone, filteredInterEyeDistancePx };
    }

    return { status: "WARMING_UP", zone: this.#needsReconfirmation ? null : this.#stableZone, filteredInterEyeDistancePx };
  }

  reject(): RatioZoneFilterResult {
    this.#candidateZone = null;
    this.#candidateCount = 0;
    this.#needsReconfirmation = true;
    return { status: "OUTLIER_REJECTED", zone: null, filteredInterEyeDistancePx: null };
  }
}
