import { transactionSchema } from '@/lib/schemas';
import { parseValue } from '@/lib/system-types';
import { badDate, badAmount, fromZodIssue } from '@/lib/import-errors';
import type { ProcessedRow, PipelineStep, PipelineContext } from './pipeline';

export const parseDates: PipelineStep = (row, behaviors) => {
  if (row.data.date === undefined || row.data.date === null || row.data.date === '') return row;
  if (row.data.date instanceof Date) return row;

  const parsed = parseValue('date', String(row.data.date), behaviors);
  if (parsed === null) {
    const err = badDate(row.data.date);
    return {
      ...row,
      status: 'error',
      errors: [...row.errors, { field: err.field, message: err.message }],
    };
  }
  return { ...row, data: { ...row.data, date: parsed } };
};

export const normalizeAmounts: PipelineStep = (row, behaviors) => {
  if (row.data.amount === undefined || row.data.amount === null) return row;
  if (typeof row.data.amount === 'number') {
    return applyAmountConvention(row, row.data.amount, behaviors);
  }

  const parsed = parseValue('currency', String(row.data.amount));
  if (typeof parsed !== 'number' || isNaN(parsed)) {
    const err = badAmount(row.data.amount);
    return {
      ...row,
      status: 'error',
      errors: [...row.errors, { field: err.field, message: err.message }],
    };
  }
  return applyAmountConvention(
    { ...row, data: { ...row.data, amount: parsed }, tags: [...row.tags, 'amount:normalized'] },
    parsed,
    behaviors,
  );
};

function applyAmountConvention(
  row: ProcessedRow,
  amount: number,
  behaviors: Record<string, unknown>,
): ProcessedRow {
  if (behaviors.amount_convention !== 'negative_is_debit') return row;
  if (amount < 0) {
    return { ...row, data: { ...row.data, amount: Math.abs(amount), type: row.data.type || 'expense' } };
  }
  return { ...row, data: { ...row.data, type: row.data.type || 'income' } };
}

export const skipRows: PipelineStep = (row, behaviors) => {
  const patterns = behaviors.skip_patterns as string[] | undefined;
  if (!patterns || patterns.length === 0) return row;

  const name = String(row.data.name || '').toLowerCase();
  const shouldSkip = patterns.some((p) => name.includes(p.toLowerCase()));
  if (shouldSkip) {
    return { ...row, status: 'skipped', tags: [...row.tags, 'skipped:pattern'] };
  }
  return row;
};

export const setDefaults: PipelineStep = (row, behaviors) => {
  const updates: Record<string, unknown> = {};

  if (behaviors.default_account_id && !row.data.account_id) {
    updates.account_id = behaviors.default_account_id;
  }
  if (behaviors.default_type && !row.data.type) {
    updates.type = behaviors.default_type;
  }

  if (Object.keys(updates).length === 0) return row;
  return { ...row, data: { ...row.data, ...updates } };
};

export const validateSchema: PipelineStep = (row) => {
  const result = transactionSchema.safeParse(row.data);
  if (result.success) return row;

  const errors = result.error.issues.map((issue) => {
    const err = fromZodIssue(issue.path.join('.'), issue.message);
    return { field: err.field, message: err.message };
  });

  return { ...row, status: 'error', errors: [...row.errors, ...errors] };
};

export const detectDuplicates: PipelineStep = (row, behaviors, context) => {
  const windowDays = (behaviors.duplicate_window_days as number) ?? 1;
  const rowDate = row.data.date instanceof Date ? row.data.date : new Date(String(row.data.date));
  const rowAmount = Number(row.data.amount);
  const rowName = String(row.data.name || '').toLowerCase().trim();

  if (isNaN(rowDate.getTime()) || isNaN(rowAmount)) return row;

  for (const existing of context.existingTransactions) {
    const existingDate = existing.date instanceof Date ? existing.date : new Date(String(existing.date));
    const existingAmount = Number(existing.amount);
    const existingName = String(existing.name || '').toLowerCase().trim();

    const daysDiff = Math.abs(rowDate.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > windowDays) continue;

    if (Math.abs(rowAmount - existingAmount) > 0.01) continue;

    const shorter = rowName.length <= existingName.length ? rowName : existingName;
    const longer = rowName.length <= existingName.length ? existingName : rowName;
    const isSubstring = longer.includes(shorter);
    const isMeaningfulMatch = isSubstring && shorter.length / longer.length >= 0.5;
    const nameMatch = rowName === existingName ? 'high'
      : isMeaningfulMatch ? 'medium'
      : 'low';

    return {
      ...row,
      status: 'duplicate' as const,
      tags: [...row.tags, `duplicate:${nameMatch}`],
      duplicateMatch: existing,
    };
  }

  return row;
};
