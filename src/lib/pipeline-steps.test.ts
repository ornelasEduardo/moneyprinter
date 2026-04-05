import { describe, it, expect } from 'vitest';
import {
  parseDates,
  normalizeAmounts,
  skipRows,
  setDefaults,
  validateSchema,
  detectDuplicates,
} from './pipeline-steps';
import type { ProcessedRow, PipelineContext } from './pipeline';

const makeRow = (data: Record<string, unknown>): ProcessedRow => ({
  data,
  status: 'valid',
  tags: [],
  errors: [],
});

const emptyContext: PipelineContext = { existingTransactions: [] };

describe('parseDates', () => {
  it('should parse date field using auto-detect', () => {
    const row = makeRow({ date: '2026-03-15', name: 'Test' });
    const result = parseDates(row, {}, emptyContext);
    expect(result.data.date).toBeInstanceOf(Date);
  });

  it('should parse with explicit format from behaviors', () => {
    const row = makeRow({ date: '15/03/2026', name: 'Test' });
    const result = parseDates(row, { date_format: 'DD/MM/YYYY' }, emptyContext);
    const date = result.data.date as Date;
    expect(date.getDate()).toBe(15);
    expect(date.getMonth()).toBe(2);
  });

  it('should add error for unparseable date', () => {
    const row = makeRow({ date: 'not-a-date', name: 'Test' });
    const result = parseDates(row, {}, emptyContext);
    expect(result.status).toBe('error');
    expect(result.errors[0].field).toBe('Date');
  });

  it('should skip rows without date field', () => {
    const row = makeRow({ name: 'Test', amount: 50 });
    const result = parseDates(row, {}, emptyContext);
    expect(result.status).toBe('valid');
  });
});

describe('normalizeAmounts', () => {
  it('should parse currency string', () => {
    const row = makeRow({ amount: '$1,500.00', name: 'Test' });
    const result = normalizeAmounts(row, {}, emptyContext);
    expect(result.data.amount).toBe(1500);
    expect(result.tags).toContain('amount:normalized');
  });

  it('should respect negative_is_debit convention', () => {
    const row = makeRow({ amount: '-50.00', name: 'Test' });
    const result = normalizeAmounts(row, { amount_convention: 'negative_is_debit' }, emptyContext);
    expect(result.data.amount).toBe(50);
    expect(result.data.type).toBe('expense');
  });

  it('should treat positive as income with negative_is_debit', () => {
    const row = makeRow({ amount: '1000.00', name: 'Paycheck' });
    const result = normalizeAmounts(row, { amount_convention: 'negative_is_debit' }, emptyContext);
    expect(result.data.amount).toBe(1000);
    expect(result.data.type).toBe('income');
  });

  it('should add error for non-numeric amount', () => {
    const row = makeRow({ amount: 'abc', name: 'Test' });
    const result = normalizeAmounts(row, {}, emptyContext);
    expect(result.status).toBe('error');
    expect(result.errors[0].field).toBe('Amount');
  });
});

describe('skipRows', () => {
  it('should skip rows matching patterns', () => {
    const row = makeRow({ name: 'PENDING AUTHORIZATION', amount: 50 });
    const result = skipRows(row, { skip_patterns: ['PENDING'] }, emptyContext);
    expect(result.status).toBe('skipped');
  });

  it('should not skip non-matching rows', () => {
    const row = makeRow({ name: 'Grocery Store', amount: 50 });
    const result = skipRows(row, { skip_patterns: ['PENDING'] }, emptyContext);
    expect(result.status).toBe('valid');
  });

  it('should be case-insensitive', () => {
    const row = makeRow({ name: 'pending transaction', amount: 50 });
    const result = skipRows(row, { skip_patterns: ['PENDING'] }, emptyContext);
    expect(result.status).toBe('skipped');
  });
});

describe('setDefaults', () => {
  it('should set default account_id', () => {
    const row = makeRow({ name: 'Test', amount: 50 });
    const result = setDefaults(row, { default_account_id: 5 }, emptyContext);
    expect(result.data.account_id).toBe(5);
  });

  it('should set default type', () => {
    const row = makeRow({ name: 'Test', amount: 50 });
    const result = setDefaults(row, { default_type: 'expense' }, emptyContext);
    expect(result.data.type).toBe('expense');
  });

  it('should not overwrite existing values', () => {
    const row = makeRow({ name: 'Test', amount: 50, account_id: 3, type: 'income' });
    const result = setDefaults(row, { default_account_id: 5, default_type: 'expense' }, emptyContext);
    expect(result.data.account_id).toBe(3);
    expect(result.data.type).toBe('income');
  });
});

describe('validateSchema', () => {
  it('should pass valid transaction data', () => {
    const row = makeRow({ name: 'Test', amount: 50, date: new Date('2026-03-15') });
    const result = validateSchema(row, {}, emptyContext);
    expect(result.status).toBe('valid');
  });

  it('should error on missing required fields', () => {
    const row = makeRow({ amount: 50 });
    const result = validateSchema(row, {}, emptyContext);
    expect(result.status).toBe('error');
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('detectDuplicates', () => {
  it('should detect exact date+amount match', () => {
    const row = makeRow({
      name: 'Grocery Store',
      amount: 45.99,
      date: new Date('2026-03-15'),
    });
    const context: PipelineContext = {
      existingTransactions: [
        { id: 1, name: 'Grocery Store', amount: 45.99, date: new Date('2026-03-15') },
      ],
    };
    const result = detectDuplicates(row, {}, context);
    expect(result.status).toBe('duplicate');
    expect(result.tags).toContain('duplicate:high');
    expect(result.duplicateMatch).toBeDefined();
  });

  it('should detect date+amount with different name', () => {
    const row = makeRow({
      name: 'GROCERY',
      amount: 45.99,
      date: new Date('2026-03-15'),
    });
    const context: PipelineContext = {
      existingTransactions: [
        { id: 1, name: 'Grocery Store #123', amount: 45.99, date: new Date('2026-03-15') },
      ],
    };
    const result = detectDuplicates(row, {}, context);
    expect(result.status).toBe('duplicate');
    expect(result.tags).toContain('duplicate:low');
  });

  it('should respect duplicate_window_days', () => {
    const row = makeRow({
      name: 'Test',
      amount: 100,
      date: new Date('2026-03-15'),
    });
    const context: PipelineContext = {
      existingTransactions: [
        { id: 1, name: 'Test', amount: 100, date: new Date('2026-03-16') },
      ],
    };
    const result = detectDuplicates(row, { duplicate_window_days: 1 }, context);
    expect(result.status).toBe('duplicate');
  });

  it('should not flag non-duplicates', () => {
    const row = makeRow({
      name: 'Unique Purchase',
      amount: 99.99,
      date: new Date('2026-03-15'),
    });
    const result = detectDuplicates(row, {}, emptyContext);
    expect(result.status).toBe('valid');
  });
});
