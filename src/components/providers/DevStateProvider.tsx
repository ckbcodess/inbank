"use client";

import React, { createContext, useContext, useMemo, useState, useCallback, ReactNode } from "react";

export interface DevStateOption {
  id: string;
  label: string;
}

export interface DevStateData {
  states: DevStateOption[];
  value: string;
  onChange: (val: string) => void;
  section?: string;
}

interface DevStateContextType {
  devState: DevStateData | null;
  registerState: (data: DevStateData) => void;
  unregisterState: () => void;
}

const DevStateContext = createContext<DevStateContextType>({
  devState: null,
  registerState: () => {},
  unregisterState: () => {},
});

export function DevStateProvider({ children }: { children: ReactNode }) {
  const [devState, setDevState] = useState<DevStateData | null>(null);

  const registerState = useCallback((data: DevStateData) => {
    setDevState(data);
  }, []);

  const unregisterState = useCallback(() => {
    setDevState(null);
  }, []);

  // Memoised for the same reason as the amount-visibility provider: an inline
  // object re-renders every consumer on each provider render.
  const value = useMemo(
    () => ({ devState, registerState, unregisterState }),
    [devState, registerState, unregisterState],
  );

  return <DevStateContext.Provider value={value}>{children}</DevStateContext.Provider>;
}

export function useDevState() {
  return useContext(DevStateContext);
}
