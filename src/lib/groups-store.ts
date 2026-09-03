"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GroupMember {
  id: string;
  name: string;
  destination: string;
  type: "wallet" | "bank";
  networkOrBank?: string;
  defaultAmount?: number;
}

export interface PaymentGroup {
  id: string;
  name: string;
  description: string;
  members: GroupMember[];
  defaultPerMemberAmount: number;
  splitType: "equal" | "custom";
  createdAt: string;
}

const SEED_GROUPS: PaymentGroup[] = [
  {
    id: "grp-family",
    name: "Family Contribution Circle",
    description: "Monthly family support and household maintenance pool",
    defaultPerMemberAmount: 500,
    splitType: "equal",
    createdAt: "2026-07-01",
    members: [
      { id: "m-1", name: "Ama Serwaa Mensah", destination: "0244 123 456", type: "wallet", networkOrBank: "MTN Mobile Money", defaultAmount: 500 },
      { id: "m-2", name: "Kwame Boateng", destination: "0201 987 654", type: "wallet", networkOrBank: "Telecel Cash", defaultAmount: 500 },
      { id: "m-3", name: "Yaa Asantewaa", destination: "0559 220 118", type: "wallet", networkOrBank: "MTN Mobile Money", defaultAmount: 500 },
      { id: "m-4", name: "Kofi Osei", destination: "1023 4455 66", type: "bank", networkOrBank: "GCB Bank", defaultAmount: 500 },
      { id: "m-5", name: "Efua Mensah", destination: "0271 445 900", type: "wallet", networkOrBank: "AT Money", defaultAmount: 500 },
    ],
  },
  {
    id: "grp-susu",
    name: "Colleagues Susu Circle",
    description: "Rotating monthly savings and investment cooperative",
    defaultPerMemberAmount: 1000,
    splitType: "equal",
    createdAt: "2026-06-15",
    members: [
      { id: "s-1", name: "Kojo Appiah", destination: "0244 889 001", type: "wallet", networkOrBank: "MTN Mobile Money", defaultAmount: 1000 },
      { id: "s-2", name: "Abena Osei", destination: "0201 440 221", type: "wallet", networkOrBank: "Telecel Cash", defaultAmount: 1000 },
      { id: "s-3", name: "Yaw Mensah", destination: "0554 112 334", type: "wallet", networkOrBank: "MTN Mobile Money", defaultAmount: 1000 },
      { id: "s-4", name: "Akua Konadu", destination: "0271 998 440", type: "wallet", networkOrBank: "AT Money", defaultAmount: 1000 },
      { id: "s-5", name: "Kwesi Amoah", destination: "0119 2234 7781", type: "bank", networkOrBank: "GCB Bank", defaultAmount: 1000 },
      { id: "s-6", name: "Esi Badu", destination: "0244 556 778", type: "wallet", networkOrBank: "MTN Mobile Money", defaultAmount: 1000 },
      { id: "s-7", name: "Fiifi Turkson", destination: "0202 334 556", type: "wallet", networkOrBank: "Telecel Cash", defaultAmount: 1000 },
      { id: "s-8", name: "Nana Yeboah", destination: "0559 887 112", type: "wallet", networkOrBank: "MTN Mobile Money", defaultAmount: 1000 },
      { id: "s-9", name: "Adwoa Danso", destination: "0231 4455 8890", type: "bank", networkOrBank: "Standard Bank", defaultAmount: 1000 },
      { id: "s-10", name: "Kofi Boateng", destination: "0244 990 123", type: "wallet", networkOrBank: "MTN Mobile Money", defaultAmount: 1000 },
    ],
  },
  {
    id: "grp-welfare",
    name: "Welfare Fund",
    description: "Quarterly community and emergency welfare contributions",
    defaultPerMemberAmount: 250,
    splitType: "equal",
    createdAt: "2026-05-10",
    members: [
      { id: "w-1", name: "Pastor Mensah", destination: "0244 112 233", type: "wallet", networkOrBank: "MTN Mobile Money", defaultAmount: 250 },
      { id: "w-2", name: "Elder Boateng", destination: "0201 334 455", type: "wallet", networkOrBank: "Telecel Cash", defaultAmount: 250 },
      { id: "w-3", name: "Deaconess Serwaa", destination: "0559 556 677", type: "wallet", networkOrBank: "MTN Mobile Money", defaultAmount: 250 },
      { id: "w-4", name: "Bro. Kwame", destination: "0271 778 899", type: "wallet", networkOrBank: "AT Money", defaultAmount: 250 },
      { id: "w-5", name: "Sis. Yaa", destination: "0244 990 011", type: "wallet", networkOrBank: "MTN Mobile Money", defaultAmount: 250 },
      { id: "w-6", name: "Bro. Kofi", destination: "0788 3312 0091", type: "bank", networkOrBank: "GCB Bank", defaultAmount: 250 },
      { id: "w-7", name: "Sis. Efua", destination: "0202 223 344", type: "wallet", networkOrBank: "Telecel Cash", defaultAmount: 250 },
      { id: "w-8", name: "Bro. Kojo", destination: "0554 445 566", type: "wallet", networkOrBank: "MTN Mobile Money", defaultAmount: 250 },
      { id: "w-9", name: "Sis. Abena", destination: "0271 667 788", type: "wallet", networkOrBank: "AT Money", defaultAmount: 250 },
      { id: "w-10", name: "Bro. Yaw", destination: "0244 889 900", type: "wallet", networkOrBank: "MTN Mobile Money", defaultAmount: 250 },
      { id: "w-11", name: "Sis. Akua", destination: "0201 001 122", type: "wallet", networkOrBank: "Telecel Cash", defaultAmount: 250 },
      { id: "w-12", name: "Bro. Kwesi", destination: "0559 223 344", type: "wallet", networkOrBank: "MTN Mobile Money", defaultAmount: 250 },
    ],
  },
];

interface GroupsState {
  groups: PaymentGroup[];
  addGroup: (group: Omit<PaymentGroup, "id" | "createdAt">) => PaymentGroup;
  updateGroup: (id: string, updates: Partial<PaymentGroup>) => void;
  deleteGroup: (id: string) => void;
  getGroup: (id: string) => PaymentGroup | undefined;
}

export const useGroupsStore = create<GroupsState>()(
  persist(
    (set, get) => ({
      groups: SEED_GROUPS,

      addGroup: (groupData) => {
        const id = `grp-${Date.now()}`;
        const newGroup: PaymentGroup = {
          ...groupData,
          id,
          createdAt: new Date().toISOString().split("T")[0],
        };
        set((state) => ({ groups: [newGroup, ...state.groups] }));
        return newGroup;
      },

      updateGroup: (id, updates) => {
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }));
      },

      deleteGroup: (id) => {
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
        }));
      },

      getGroup: (id) => {
        return get().groups.find((g) => g.id === id);
      },
    }),
    {
      name: "nibs-payment-groups",
    }
  )
);
