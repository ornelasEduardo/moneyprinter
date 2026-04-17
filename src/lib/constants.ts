/** Entities that can be exported/imported. Shared between server and client code. */
export const EXPORTABLE_ENTITIES = [
  'accounts',
  'transactions',
  'net_worth_history',
  'income_sources',
  'income_budgets',
  'budget_limits',
  'goals',
  'user_settings',
  'transfers',
] as const;

export type ExportableEntity = (typeof EXPORTABLE_ENTITIES)[number];

/** Format byte count for display */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Backup history entry — used by both server and client */
export interface BackupHistoryEntry {
  date: string;
  filename: string;
  size: number;
  entityCounts: Record<string, number>;
}

/** Import validation types — used by both server and client */
export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportValidationResult {
  entity: string;
  total: number;
  valid: Record<string, unknown>[];
  errors: ValidationError[];
}

export interface ConflictReport {
  entity: string;
  existingCount: number;
  existingIds: number[];
}
