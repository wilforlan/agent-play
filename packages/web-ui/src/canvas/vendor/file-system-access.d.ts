export type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
};

export type FileSystemWritableFileStream = {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
};

export type FileSystemFileHandle = {
  createWritable(): Promise<FileSystemWritableFileStream>;
};

declare global {
  interface Window {
    showSaveFilePicker?(
      options?: SaveFilePickerOptions
    ): Promise<FileSystemFileHandle>;
  }
}

export {};
