"use client";

/**
 * Dev Mode User Simulation System
 *
 * Provides 3 distinct, realistic customer simulation profiles:
 * 1. "clean": A truly clean user with ZERO setup (0 cards, 0 beneficiaries, 0 transactions, 0 standing orders, 1 fresh unfunded account)
 * 2. "single": A user with exactly 1 account (Current Account GHS 4,250.00, 1 Debit Card, 2 focused beneficiaries, 5 transactions, 1 standing order)
 * 3. "everyday": An active everyday user with multiple accounts (Current, Savings, USD), 3 cards, 25 beneficiaries, full ledger
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { useSession } from "./session-store";
import { useCardsDevStore } from "./cards-dev-store";
import { useAccountPrefs, useLinkedSources, DEFAULT_LINKED_SOURCES, type LinkedSource } from "./accounts-store";
import type { Profile } from "./roles";
import {
  ACTORS,
  CLEAN_PROFILE,
  SINGLE_PROFILE,
} from "./mock-data";
import { useBeneficiariesStore, type BeneficiaryRecord } from "./beneficiaries-store";

export type DemoUserType = "clean" | "single" | "everyday";

export interface DemoUserConfig {
  id: DemoUserType;
  label: string;
  badgeLabel: string;
  actorId: string;
  actorName: string;
  phone: string;
  profile: Profile;
  accountIds: string[];
  defaultAccountId: string;
  cardIds: string[];
  summary: string;
}

export const DEMO_USER_CONFIGS: Record<DemoUserType, DemoUserConfig> = {
  clean: {
    id: "clean",
    label: "Clean User (Zero Setup)",
    badgeLabel: "Clean",
    actorId: "u-clean",
    actorName: "Kwesi Arthur",
    phone: "0244000001",
    profile: CLEAN_PROFILE,
    accountIds: ["acc-clean-001"],
    defaultAccountId: "acc-clean-001",
    cardIds: [],
    summary: "Kwesi Arthur · Fresh / Unfunded Account · 0 Cards · 0 Beneficiaries",
  },
  single: {
    id: "single",
    label: "Single Account User",
    badgeLabel: "Single",
    actorId: "u-single",
    actorName: "Abena Osei",
    phone: "0551200313",
    profile: SINGLE_PROFILE,
    accountIds: ["acc-single-001"],
    defaultAccountId: "acc-single-001",
    cardIds: ["card-single-001"],
    summary: "Abena Osei · 1 Current Account · 1 Visa Debit · 2 Beneficiaries",
  },
  everyday: {
    id: "everyday",
    label: "Everyday User (Multiple Accounts)",
    badgeLabel: "Everyday",
    actorId: "u-retail",
    actorName: "Ransford Gyasi",
    phone: "0244123821",
    profile: {
      id: "prof-retail",
      kind: "RETAIL",
      name: "Personal Banking",
      reference: "•••• 4561",
    },
    accountIds: ["acc-ret-001", "acc-ret-002", "acc-003"],
    defaultAccountId: "acc-ret-001",
    cardIds: ["card-ret-001", "card-ret-002", "card-ret-007"],
    summary: "Ransford Gyasi · 3 Accounts · 3 Cards (Debit, Prepaid, Virtual) · Full History",
  },
};

export const SINGLE_USER_BENEFICIARIES: BeneficiaryRecord[] = [
  {
    id: "ben-s1",
    name: "Mum (Yaa Osei)",
    transactionType: "wallet",
    category: "person",
    network: "MTN Mobile Money",
    phoneNumber: "0244 889 900",
    currency: "GHS",
    detail: "MTN Mobile Money · 0244 889 900",
    verified: true,
    createdAt: "2026-08-15",
  },
  {
    id: "ben-s2",
    name: "ECG Prepaid Electricity",
    transactionType: "bill",
    category: "biller",
    billerCategory: "Utilities",
    billerName: "Electricity Company of Ghana (ECG)",
    billerReference: "P-992014",
    currency: "GHS",
    detail: "ECG Prepaid · Meter P-992014",
    verified: true,
    createdAt: "2026-08-20",
  },
];

export interface RecentPayeeAvatarItem {
  id: string;
  name: string;
  bank: string;
  acct: string;
  initials: string;
  rail: string;
  colorBg?: string;
  colorDarkBg?: string;
  colorDarkText?: string;
  billerId?: string;
  category?: string;
  country?: string;
  subtitle?: string;
}

export const SINGLE_USER_AVATARS: RecentPayeeAvatarItem[] = [
  {
    id: "rec-s1",
    name: "Mum (Yaa Osei)",
    bank: "MTN Mobile Money",
    acct: "0244 889 900",
    initials: "YO",
    rail: "wallet",
    colorBg: "var(--avatar-teal)",
  },
  {
    id: "rec-s2",
    name: "ECG Electricity",
    bank: "ECG",
    acct: "P-992014",
    initials: "EC",
    rail: "bill",
    category: "Utilities",
    colorBg: "var(--avatar-sand)",
  },
];

export const SINGLE_USER_LINKED_SOURCES: LinkedSource[] = [
  {
    id: "src-single-momo",
    type: "momo",
    title: "MTN Mobile Money",
    subtitle: "055 120 0313",
    operator: "MTN",
    maskedNumber: "055 120 0313",
  },
];

interface DevUserStoreState {
  userType: DemoUserType;
  setUserType: (type: DemoUserType) => void;
  switchUserType: (type: DemoUserType) => void;
}

export const useDevUserStore = create<DevUserStoreState>()(
  persist(
    (set) => ({
      userType: "everyday",

      setUserType: (userType) => set({ userType }),

      switchUserType: (newType) => {
        set({ userType: newType });
        const cfg = DEMO_USER_CONFIGS[newType];

        // 1. Synchronize actor in session
        const actor = ACTORS.find((a) => a.id === cfg.actorId);
        if (actor) {
          useSession.getState().signIn(actor);
          useSession.getState().selectProfile(actor.profiles[0]);
          useSession.getState().verifyMfa();
        }

        // 2. Synchronize beneficiaries store
        if (newType === "clean") {
          useBeneficiariesStore.setState({ beneficiaries: [] });
        } else if (newType === "single") {
          useBeneficiariesStore.setState({ beneficiaries: SINGLE_USER_BENEFICIARIES });
        } else {
          useBeneficiariesStore.getState().resetToDefault();
        }

        // 3. Synchronize linked sources
        if (newType === "clean") {
          useLinkedSources.getState().setSources([]);
        } else if (newType === "single") {
          useLinkedSources.getState().setSources(SINGLE_USER_LINKED_SOURCES);
        } else {
          useLinkedSources.getState().setSources(DEFAULT_LINKED_SOURCES);
        }

        // 4. Synchronize default account
        useAccountPrefs.getState().setDefaultAccount(cfg.defaultAccountId);

        // 5. Reset cards dev simulator to clean baseline
        useCardsDevStore.getState().resetToClean();

        // 6. User feedback
        toast.success(`Switched to ${cfg.label}`, {
          description: cfg.summary,
        });
      },
    }),
    {
      name: "nibs-dev-user-simulation",
    },
  ),
);

/**
 * Returns the currently active demo user type (defaults to "everyday").
 */
export function getActiveDemoUserType(): DemoUserType {
  try {
    return useDevUserStore.getState().userType || "everyday";
  } catch {
    return "everyday";
  }
}
