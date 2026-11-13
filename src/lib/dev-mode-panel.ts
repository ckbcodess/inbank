/**
 * Whether the Dev Mode side panel is open. The header's Dev Mode button and the
 * pre-authentication pill both toggle it; `DevModeFrame` docks the panel beside the page.
 */

import { create } from "zustand";

interface DevModePanelState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useDevModePanel = create<DevModePanelState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
