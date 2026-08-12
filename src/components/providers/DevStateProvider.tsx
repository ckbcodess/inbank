"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

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

  return (
    <DevStateContext.Provider value={{ devState, registerState, unregisterState }}>
      {children}
    </DevStateContext.Provider>
  );
}

export function useDevState() {
  return useContext(DevStateContext);
}
