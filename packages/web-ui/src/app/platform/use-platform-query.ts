"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlatformAuth } from "./platform-api";
import { usePlatformAuth } from "./platform-auth-context";

type UsePlatformQueryOptions<T> = {
  queryKey: string;
  fetcher: (auth: PlatformAuth) => Promise<T>;
  enabled?: boolean;
};

type UsePlatformQueryResult<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (value: T | null) => void;
};

export function usePlatformQuery<T>({
  queryKey,
  fetcher,
  enabled = true,
}: UsePlatformQueryOptions<T>): UsePlatformQueryResult<T> {
  const { auth } = usePlatformAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    if (auth === null) {
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher(auth);
      if (requestIdRef.current === requestId) {
        setData(result);
      }
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [auth, fetcher]);

  useEffect(() => {
    if (!enabled || auth === null) {
      setLoading(false);
      return;
    }
    void reload();
  }, [auth, enabled, queryKey, reload]);

  return { data, error, loading, reload, setData };
}
