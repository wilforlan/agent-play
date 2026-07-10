const inflight = new Map<string, Promise<unknown>>();

export const withInflightDedup = <T>(key: string, execute: () => Promise<T>): Promise<T> => {
  const pending = inflight.get(key);
  if (pending !== undefined) {
    return pending as Promise<T>;
  }
  const promise = execute().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
};
