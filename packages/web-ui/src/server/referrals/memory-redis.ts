type MultiOp = () => void;

export type MemoryRedis = {
  store: Map<string, string>;
  lists: Map<string, string[]>;
  watched: Set<string>;
  dirty: Set<string>;
  get: (key: string) => Promise<string | null>;
  set: (
    key: string,
    value: string,
    mode?: string,
  ) => Promise<"OK" | null>;
  incr: (key: string) => Promise<number>;
  incrby: (key: string, amount: number) => Promise<number>;
  lpush: (key: string, value: string) => Promise<number>;
  ltrim: (key: string, start: number, stop: number) => Promise<"OK">;
  lrange: (key: string, start: number, stop: number) => Promise<string[]>;
  watch: (key: string) => Promise<"OK">;
  unwatch: () => Promise<"OK">;
  multi: () => {
    set: (key: string, value: string) => unknown;
    lpush: (key: string, value: string) => unknown;
    ltrim: (key: string, start: number, stop: number) => unknown;
    incrby: (key: string, amount: number) => unknown;
    exec: () => Promise<Array<[Error | null, unknown]> | null>;
  };
};

export const createMemoryRedis = (): MemoryRedis => {
  const store = new Map<string, string>();
  const lists = new Map<string, string[]>();
  const watched = new Set<string>();
  const dirty = new Set<string>();

  const touch = (key: string) => {
    if (watched.has(key)) {
      dirty.add(key);
    }
  };

  const redis: MemoryRedis = {
    store,
    lists,
    watched,
    dirty,
    get: async (key) => store.get(key) ?? null,
    set: async (key, value, mode) => {
      if (mode === "NX" && store.has(key)) {
        return null;
      }
      touch(key);
      store.set(key, value);
      return "OK";
    },
    incr: async (key) => {
      const next = (Number.parseInt(store.get(key) ?? "0", 10) || 0) + 1;
      touch(key);
      store.set(key, String(next));
      return next;
    },
    incrby: async (key, amount) => {
      const next = (Number.parseInt(store.get(key) ?? "0", 10) || 0) + amount;
      touch(key);
      store.set(key, String(next));
      return next;
    },
    lpush: async (key, value) => {
      const list = lists.get(key) ?? [];
      list.unshift(value);
      lists.set(key, list);
      touch(key);
      return list.length;
    },
    ltrim: async (key, start, stop) => {
      const list = lists.get(key) ?? [];
      lists.set(key, list.slice(start, stop + 1));
      touch(key);
      return "OK";
    },
    lrange: async (key, start, stop) => {
      const list = lists.get(key) ?? [];
      if (stop < 0) {
        return list.slice(start);
      }
      return list.slice(start, stop + 1);
    },
    watch: async (key) => {
      watched.add(key);
      dirty.delete(key);
      return "OK";
    },
    unwatch: async () => {
      watched.clear();
      dirty.clear();
      return "OK";
    },
    multi: () => {
      const ops: MultiOp[] = [];
      const pipe = {
        set: (key: string, value: string) => {
          ops.push(() => {
            store.set(key, value);
          });
          return pipe;
        },
        lpush: (key: string, value: string) => {
          ops.push(() => {
            const list = lists.get(key) ?? [];
            list.unshift(value);
            lists.set(key, list);
          });
          return pipe;
        },
        ltrim: (key: string, start: number, stop: number) => {
          ops.push(() => {
            const list = lists.get(key) ?? [];
            lists.set(key, list.slice(start, stop + 1));
          });
          return pipe;
        },
        incrby: (key: string, amount: number) => {
          ops.push(() => {
            const next =
              (Number.parseInt(store.get(key) ?? "0", 10) || 0) + amount;
            store.set(key, String(next));
          });
          return pipe;
        },
        exec: async () => {
          for (const key of watched) {
            if (dirty.has(key)) {
              watched.clear();
              dirty.clear();
              return null;
            }
          }
          for (const op of ops) {
            op();
          }
          watched.clear();
          dirty.clear();
          return ops.map(() => [null, "OK"] as [Error | null, unknown]);
        },
      };
      return pipe;
    },
  };

  return redis;
};
