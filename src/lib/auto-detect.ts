import { parseValue } from './system-types';
import type { SystemType } from './system-types';

export interface ColumnMappingEntry {
  field: string | null;
  type: SystemType;
}

export interface ColumnMapping {
  [columnName: string]: ColumnMappingEntry;
  __detectedBehaviors?: Record<string, unknown>;
}

// Column name hints — if the CSV header contains these strings, map to the field
const FIELD_HINTS: Record<string, string[]> = {
  date: ['date', 'post date', 'transaction date', 'posted', 'trans date'],
  amount: ['amount', 'debit', 'credit', 'sum', 'total', 'value'],
  name: ['description', 'merchant', 'name', 'memo', 'payee', 'details', 'narrative'],
  tags: ['category', 'tag', 'label', 'type'],
};

function matchesHint(columnName: string, hints: string[]): boolean {
  const lower = columnName.toLowerCase().trim();
  return hints.some((h) => lower.includes(h));
}

function isDateValue(value: string): boolean {
  if (!value || value.trim().length < 6) return false;
  const parsed = parseValue('date', value);
  return parsed instanceof Date && !isNaN(parsed.getTime());
}

function isCurrencyValue(value: string): boolean {
  if (!value || value.trim().length === 0) return false;
  const parsed = parseValue('currency', value);
  return typeof parsed === 'number' && !isNaN(parsed);
}

function detectColumnType(
  columnName: string,
  values: string[],
): { type: SystemType; field: string | null } {
  const nonEmpty = values.filter((v) => v && v.trim().length > 0);
  if (nonEmpty.length === 0) return { type: 'string', field: null };

  // Check header name hints first
  for (const [field, hints] of Object.entries(FIELD_HINTS)) {
    if (matchesHint(columnName, hints)) {
      if (field === 'date') return { type: 'date', field: 'date' };
      if (field === 'amount') return { type: 'currency', field: 'amount' };
      if (field === 'name') return { type: 'string', field: 'name' };
      if (field === 'tags') return { type: 'string', field: 'tags' };
    }
  }

  // Content-based detection
  const dateCount = nonEmpty.filter(isDateValue).length;
  if (dateCount / nonEmpty.length > 0.7) {
    return { type: 'date', field: 'date' };
  }

  const currencyCount = nonEmpty.filter(isCurrencyValue).length;
  if (currencyCount / nonEmpty.length > 0.7) {
    return { type: 'currency', field: 'amount' };
  }

  return { type: 'string', field: null };
}

export function autoDetectColumns(rows: Record<string, string>[]): ColumnMapping {
  if (rows.length === 0) return {};

  const columns = Object.keys(rows[0]);
  const sampleRows = rows.slice(0, 10);
  const mapping: ColumnMapping = {};

  const assignedFields = new Set<string>();

  // First pass: detect types and candidate fields
  const candidates: { column: string; type: SystemType; field: string | null }[] = [];
  for (const col of columns) {
    const values = sampleRows.map((r) => r[col] || '');
    const detected = detectColumnType(col, values);
    candidates.push({ column: col, ...detected });
  }

  // Second pass: resolve conflicts (only one column per field)
  for (const c of candidates) {
    if (c.field && !assignedFields.has(c.field)) {
      mapping[c.column] = { field: c.field, type: c.type };
      assignedFields.add(c.field);
    } else {
      mapping[c.column] = { field: c.field && assignedFields.has(c.field) ? null : c.field, type: c.type };
    }
  }

  // If no name column was detected, pick the longest-average text column
  if (!assignedFields.has('name')) {
    let bestCol = '';
    let bestAvgLen = 0;
    for (const col of columns) {
      if (mapping[col].field) continue;
      if (mapping[col].type !== 'string') continue;
      const avgLen = sampleRows.reduce((sum, r) => sum + (r[col]?.length || 0), 0) / sampleRows.length;
      if (avgLen > bestAvgLen) {
        bestAvgLen = avgLen;
        bestCol = col;
      }
    }
    if (bestCol) {
      mapping[bestCol] = { field: 'name', type: 'string' };
    }
  }

  // Detect amount sign convention
  const amountCol = columns.find((c) => mapping[c]?.field === 'amount');
  if (amountCol) {
    const values = sampleRows.map((r) => parseValue('currency', r[amountCol] || '0') as number);
    const hasNegative = values.some((v) => v < 0);
    const hasPositive = values.some((v) => v > 0);
    if (hasNegative && hasPositive) {
      (mapping as any).__detectedBehaviors = { amount_convention: 'negative_is_debit' };
    }
  }

  return mapping;
}
