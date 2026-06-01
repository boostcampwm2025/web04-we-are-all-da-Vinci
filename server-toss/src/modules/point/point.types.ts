export type GrantEligibilityDecision =
  | { decision: "PROCEED" }
  | { decision: "FAIL"; reason: string }
  | { decision: "RETRY" };
