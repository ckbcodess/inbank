"use client";

import { create } from "zustand";

interface FxStoreState {
  isOpen: boolean;
  activeTab: "convert" | "rates";
  openModal: (tab?: "convert" | "rates") => void;
  closeModal: () => void;
  toggleModal: () => void;
}

export const useFxStore = create<FxStoreState>((set) => ({
  isOpen: false,
  activeTab: "convert",
  openModal: (tab = "convert") => set({ isOpen: true, activeTab: tab }),
  closeModal: () => set({ isOpen: false }),
  toggleModal: () => set((state) => ({ isOpen: !state.isOpen })),
}));
