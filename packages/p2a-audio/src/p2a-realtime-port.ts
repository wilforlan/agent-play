export type P2aRealtimeHandlers = {
  onAudioDelta: (base64Pcm: string) => void;
  onResponseDone: () => void;
};

export type P2aRealtimePort = {
  setHandlers: (handlers: P2aRealtimeHandlers) => void;
  appendIntercomAudio: (input: {
    encoding: string;
    dataBase64: string;
  }) => Promise<void>;
  close: () => Promise<void>;
};
