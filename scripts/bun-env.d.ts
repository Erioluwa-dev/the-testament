declare const Bun: {
  write(path: string | URL, data: string): Promise<number>;
  file(path: string | URL): { json(): Promise<unknown> };
};
