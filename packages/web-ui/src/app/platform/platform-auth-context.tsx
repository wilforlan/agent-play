"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PlatformAuth } from "./platform-api";
import {
  clearPlatformRememberPreview,
  savePlatformRememberPreview,
} from "./platform-session";

type PlatformAuthContextValue = {
  auth: PlatformAuth | null;
  setAuth: (auth: PlatformAuth | null) => void;
  logout: () => void;
  rememberAuth: (auth: PlatformAuth) => void;
};

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<PlatformAuth | null>(null);

  const logout = useCallback(() => {
    setAuth(null);
    clearPlatformRememberPreview();
  }, []);

  const rememberAuth = useCallback((next: PlatformAuth) => {
    savePlatformRememberPreview({
      serverUrl: next.serverUrl,
      nodeId: next.nodeId,
      spaceCatalogId: next.spaceCatalogId,
      spaceName: next.spaceName,
      lastAuthenticatedAt: new Date().toISOString(),
    });
  }, []);

  const value = useMemo(
    () => ({ auth, setAuth, logout, rememberAuth }),
    [auth, logout, rememberAuth]
  );

  return (
    <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth(): PlatformAuthContextValue {
  const ctx = useContext(PlatformAuthContext);
  if (ctx === null) {
    throw new Error("usePlatformAuth must be used within PlatformAuthProvider");
  }
  return ctx;
}
