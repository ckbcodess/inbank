/**
 * Business banking's Dev Mode card simulation: which seeded business cards stand in for each delivery state.
 * `lib/cards-dev-store.ts` combines these with the personal ones.
 */

export const CORPORATE_CLEAN_CARD_IDS = ["card-003", "card-001", "card-v01"] as const; // Main Operating (Debit), Corporate Travel (Prepaid), AWS & SaaS (Virtual)

export const CORPORATE_SIMULATION_PRESET_CARDS = {
  out_for_delivery: "card-008", // Premier Gold Corporate
  ready_for_pickup: "card-006", // Branch Operations Card
  delivered: "card-007", // Field Logistics Prepaid
  in_transit: "card-005", // Executive Operating
  in_production: "card-005",
  blocked: "card-004", // Payroll Disbursements
} as const;
