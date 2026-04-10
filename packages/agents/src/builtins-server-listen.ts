export type BuiltinsListenOptions = {
  host: string;
  port: number;
};

export function getBuiltinsListenOptions(): BuiltinsListenOptions {
  const port = Number(process.env.AGENT_PLAY_BUILTINS_PORT ?? "3100");
  const host = process.env.AGENT_PLAY_BUILTINS_HOST ?? "127.0.0.1";
  return { host, port };
}
