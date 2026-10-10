"use client";

/**
 * Dev Mode store and lifecycle simulator for Cards.
 *
 * Controls whether the cards page displays a clean, realistic set of cards
 * (default), all test cards across fulfillment stages, or a simulated card
 * at any stage of its lifecycle (Active, Out for Delivery, Ready for Pickup,
 * In Transit, In Production, Delivered / Needs Activation, Blocked).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PaymentCard } from "@/lib/mock-data";

export type CardLifecycleStage =
  | "active"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "delivered"
  | "in_transit"
  | "in_production"
  | "blocked"
  | "expired";

export type CardSimulationPreset =
  | "clean" // Default: 3 active cards — debit, prepaid, virtual
  | "out_for_delivery" // Rider assigned & dispatched
  | "ready_for_pickup" // Ready at branch vault
  | "delivered" // Needs customer PIN activation
  | "in_transit" // Courier en route
  | "in_production" // Embossing & manufacturing
  | "blocked" // Frozen
  | "all"; // Show all mock cards

export const CARD_SIMULATION_LABELS: Record<CardSimulationPreset, string> = {
  clean: "Default (Clean · 3 Cards)",
  out_for_delivery: "Out for Delivery (Rider Kofi Assigned)",
  ready_for_pickup: "Ready for Pickup (Branch Vault)",
  delivered: "Delivered (Needs PIN Activation)",
  in_transit: "In Transit (En Route Courier)",
  in_production: "In Production (Card Center)",
  blocked: "Blocked / Frozen (Temporarily Locked)",
  all: "Show All Mock Cards (All 10 Cards)",
};

export const CLEAN_CARD_IDS = {
  CORPORATE: ["card-003", "card-001", "card-v01"], // Main Operating (Debit), Corporate Travel (Prepaid), AWS & SaaS (Virtual)
  RETAIL: ["card-ret-001", "card-ret-002", "card-ret-007"], // Everyday Checking (Debit), Online Subscriptions (Prepaid), Online Shopping (Virtual)
} as const;

export const SIMULATION_PRESET_CARDS = {
  CORPORATE: {
    out_for_delivery: "card-008", // Premier Gold Corporate
    ready_for_pickup: "card-006", // Branch Operations Card
    delivered: "card-007", // Field Logistics Prepaid
    in_transit: "card-005", // Executive Operating
    in_production: "card-005",
    blocked: "card-004", // Payroll Disbursements
  },
  RETAIL: {
    out_for_delivery: "card-ret-005", // Executive Premier Card
    ready_for_pickup: "card-ret-001", // Everyday Checking
    delivered: "card-ret-004", // Savings Travel Card
    in_transit: "card-ret-005",
    in_production: "card-ret-003", // Salary Direct Debit
    blocked: "card-ret-001",
  },
} as const;

export function applyLifecycleStage(card: PaymentCard, stage: CardLifecycleStage): PaymentCard {
  const baseTracking = card.trackingNumber || `GCB-CRD-${card.id.slice(-6).toUpperCase()}`;

  switch (stage) {
    case "active":
      return {
        ...card,
        status: "Active",
        deliveryStatus: undefined,
        deliveryMethod: undefined,
      };

    case "out_for_delivery":
      return {
        ...card,
        status: "Inactive",
        deliveryStatus: "out_for_delivery",
        deliveryMethod: "DELIVERY",
        deliveryAddress: card.deliveryAddress || "No. 14 Ridge Road, Cantonments, Accra",
        deliveryBranch: undefined,
        trackingNumber: card.trackingNumber || "GCB-EXP-992104",
        estimatedDeliveryDate: "Today • 2:00 PM - 3:30 PM",
        deliveryCode: card.deliveryCode || "7392",
        courierRider: card.courierRider || {
          name: "Kofi Mensah",
          phone: "+233 24 456 7890",
          company: "GCB Express Courier",
          vehicleType: "Dispatch Motorbike",
          vehiclePlate: "GT-5842-24",
          estimatedArrival: "Today between 2:00 PM – 3:30 PM",
        },
      };

    case "ready_for_pickup":
      return {
        ...card,
        status: "Inactive",
        deliveryStatus: "ready_for_pickup",
        deliveryMethod: "BRANCH_PICKUP",
        deliveryBranch: card.deliveryBranch || "GCB Head Office Branch (High Street, Accra)",
        deliveryAddress: undefined,
        trackingNumber: card.trackingNumber || "GCB-CRD-771920",
        estimatedDeliveryDate: "Ready for Pickup",
        pickupCode: card.pickupCode || "4920",
      };

    case "delivered":
      return {
        ...card,
        status: "Inactive",
        deliveryStatus: "delivered",
        deliveryMethod: "DELIVERY",
        deliveryAddress: card.deliveryAddress || "No. 14 Ridge Road, Cantonments, Accra",
        deliveryBranch: undefined,
        trackingNumber: card.trackingNumber || "GCB-CRD-491028",
        estimatedDeliveryDate: "Delivered on Sep 17, 2026",
      };

    case "in_transit":
      return {
        ...card,
        status: "Inactive",
        deliveryStatus: "in_transit",
        deliveryMethod: "DELIVERY",
        deliveryAddress: card.deliveryAddress || "No. 14 Ridge Road, Cantonments, Accra",
        deliveryBranch: undefined,
        trackingNumber: baseTracking,
        estimatedDeliveryDate: "3-5 business days",
      };

    case "in_production":
      return {
        ...card,
        status: "Inactive",
        deliveryStatus: "in_production",
        deliveryMethod: card.deliveryMethod || "BRANCH_PICKUP",
        deliveryBranch: card.deliveryBranch || "GCB Head Office Branch (High Street, Accra)",
        deliveryAddress: undefined,
        trackingNumber: baseTracking,
        estimatedDeliveryDate: "3-5 business days",
        pickupCode: card.pickupCode || "4920",
      };

    case "blocked":
      return {
        ...card,
        status: "Blocked",
        deliveryStatus: undefined,
      };

    case "expired":
      return {
        ...card,
        status: "Expired",
        deliveryStatus: undefined,
      };

    default:
      return card;
  }
}

interface CardsDevState {
  simulation: CardSimulationPreset;
  targetCardId: string | null; // null means "Auto-pick recommended demo card"
  setSimulation: (simulation: CardSimulationPreset) => void;
  setTargetCardId: (cardId: string | null) => void;
  resetToClean: () => void;
}

export const useCardsDevStore = create<CardsDevState>()(
  persist(
    (set) => ({
      simulation: "clean",
      targetCardId: null,

      setSimulation: (simulation) => set({ simulation }),
      setTargetCardId: (targetCardId) => set({ targetCardId }),
      resetToClean: () => set({ simulation: "clean", targetCardId: null }),
    }),
    {
      name: "inbank-cards-dev-mode",
    },
  ),
);

/**
 * Filter and apply lifecycle mutations to the cards list based on Dev Mode settings.
 */
export function getEffectiveCardsForProfile(
  profileKind: "RETAIL" | "CORPORATE",
  allCards: PaymentCard[],
  devState: Pick<CardsDevState, "simulation" | "targetCardId">,
): { cards: PaymentCard[]; activeSimulatedCard: PaymentCard | null } {
  const { simulation, targetCardId } = devState;

  // 1. ALL MOCK CARDS
  if (simulation === "all") {
    return { cards: allCards, activeSimulatedCard: null };
  }

  // 2. CLEAN BASELINE (Default)
  const cleanIds: readonly string[] = CLEAN_CARD_IDS[profileKind];
  const cleanCards = allCards
    .filter((c) => cleanIds.includes(c.id) || c.id === "card-single-001" || c.id.startsWith("card-new-"));

  if (simulation === "clean" || cleanCards.length === 0 && allCards.length === 0) {
    return { cards: cleanCards, activeSimulatedCard: null };
  }

  // 3. SPECIFIC SIMULATION (e.g. out_for_delivery, ready_for_pickup, etc.)
  const presetMap = SIMULATION_PRESET_CARDS[profileKind];
  const presetCardId =
    targetCardId ||
    (presetMap as Record<string, string>)[simulation] ||
    cleanIds[0];

  const targetCard = allCards.find((c) => c.id === presetCardId) || allCards[0];
  if (!targetCard) {
    return { cards: cleanCards, activeSimulatedCard: null };
  }

  const simulatedCard = applyLifecycleStage(targetCard, simulation as CardLifecycleStage);

  // If the simulated card is already one of the clean cards, replace it in place
  const existingIdx = cleanCards.findIndex((c) => c.id === simulatedCard.id);
  if (existingIdx !== -1) {
    const updated = [...cleanCards];
    updated[existingIdx] = simulatedCard;
    return { cards: updated, activeSimulatedCard: simulatedCard };
  }

  // Otherwise, place the simulated card at the top so the user immediately sees it
  return { cards: [simulatedCard, ...cleanCards], activeSimulatedCard: simulatedCard };
}

/**
 * Returns a specific card with dev lifecycle simulation applied if active.
 */
export function getEffectiveCard(
  cardId: string,
  rawCard: PaymentCard | undefined,
  devState: Pick<CardsDevState, "simulation" | "targetCardId">,
  profileKind: "RETAIL" | "CORPORATE" = "CORPORATE",
): PaymentCard | undefined {
  if (!rawCard) return undefined;
  if (devState.simulation === "clean" || devState.simulation === "all") {
    return rawCard;
  }

  const presetMap = SIMULATION_PRESET_CARDS[profileKind];
  const activeTargetId =
    devState.targetCardId ||
    (presetMap as Record<string, string>)[devState.simulation] ||
    cardId;

  if (activeTargetId === cardId) {
    return applyLifecycleStage(rawCard, devState.simulation as CardLifecycleStage);
  }

  return rawCard;
}
