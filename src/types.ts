export interface Tab {
  path: string | null;
  command: string | null;
}

export type Sessions = Record<string, Tab[]>;
