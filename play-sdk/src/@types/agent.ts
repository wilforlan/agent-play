export interface PlayAgentInformation {
    id: string;
    name: string;
    sid: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PlatformAgentInformation {
    name: string;
    type: string;
    version?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

