export interface NudgeNotification {
  readonly nudgeId: string;
  readonly sessionId: string;
  readonly actionKey: "TAKE_SHORT_BREAK";
  readonly policyVersion: string;
}

export interface NudgeDelivery {
  readonly nudgeId: string;
  readonly state: "DELIVERED" | "DUPLICATE";
}

/** Local adapter: it exposes delivery state to the UI and never sends network/system payloads. */
export class InProcessNudgeAdapter {
  readonly #delivered = new Set<string>();

  deliver(nudge: NudgeNotification): NudgeDelivery {
    if (this.#delivered.has(nudge.nudgeId)) return { nudgeId: nudge.nudgeId, state: "DUPLICATE" };
    this.#delivered.add(nudge.nudgeId);
    return { nudgeId: nudge.nudgeId, state: "DELIVERED" };
  }
}
