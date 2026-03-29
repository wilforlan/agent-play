export const SetupTypes = {
    local: "local",
    dev: "dev",
    prod: "prod",
} as const;

export type SetupTypes = (typeof SetupTypes)[keyof typeof SetupTypes];

export const setupUrls: Record<SetupTypes, string> = {
    [SetupTypes.local]: "http://localhost:4439",
    [SetupTypes.dev]: "https://dev.agent-play.com",
    [SetupTypes.prod]: "https://api.agent-play.com",
};
