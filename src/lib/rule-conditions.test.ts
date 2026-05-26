import { describe, it, expect } from 'vitest';
import { normalizeFilterValues, transactionFilterFields } from './rule-conditions';
import type { Filter } from 'doom-design-system/filter';

describe('transactionFilterFields', () => {
  it('exposes the expected fields with correct types and operators', () => {
    const byKey = Object.fromEntries(transactionFilterFields().map((f) => [f.key, f]));
    expect(byKey.name?.type).toBe('text');
    expect(byKey.amount?.type).toBe('number');
    expect(byKey.type?.type).toBe('select');
    expect(byKey.account_id?.type).toBe('select');
    expect(byKey.amount?.operators).toContain('gt');
    expect(byKey.amount?.operators).toContain('eq');
  });

  it('accepts an accounts list and converts to options', () => {
    const fields = transactionFilterFields([
      { id: 1, name: 'Checking' },
      { id: 2, name: 'Savings' },
    ]);
    const accountField = fields.find((f) => f.key === 'account_id');
    expect(accountField?.options).toEqual([
      { value: '1', label: 'Checking' },
      { value: '2', label: 'Savings' },
    ]);
  });
});

describe('normalizeFilterValues', () => {
  const fields = transactionFilterFields();

  it('coerces string amount to number when field type is number', () => {
    const filter: Filter = {
      type: 'condition',
      field: 'amount',
      operator: 'gt',
      value: '250',
    };
    const result = normalizeFilterValues(filter, fields);
    expect((result as any).value).toBe(250);
    expect(typeof (result as any).value).toBe('number');
  });

  it('leaves text and select values as strings', () => {
    const filter: Filter = {
      type: 'condition',
      field: 'name',
      operator: 'contains',
      value: 'Starbucks',
    };
    const result = normalizeFilterValues(filter, fields);
    expect((result as any).value).toBe('Starbucks');
  });

  it('recurses into nested groups', () => {
    const filter: Filter = {
      type: 'group',
      conditions: [
        { type: 'condition', field: 'name', operator: 'contains', value: 'Amazon' },
        { type: 'condition', field: 'amount', operator: 'lt', value: '50' },
      ],
    };
    const result = normalizeFilterValues(filter, fields) as any;
    expect(result.conditions[0].value).toBe('Amazon');
    expect(result.conditions[1].value).toBe(50);
  });

  it('leaves empty-string numeric value alone', () => {
    const filter: Filter = {
      type: 'condition',
      field: 'amount',
      operator: 'isEmpty',
      value: '',
    };
    const result = normalizeFilterValues(filter, fields);
    expect((result as any).value).toBe('');
  });

  it('leaves a non-numeric value alone if the field is unknown', () => {
    const filter: Filter = {
      type: 'condition',
      field: 'unknown_field',
      operator: 'eq',
      value: '42',
    };
    const result = normalizeFilterValues(filter, fields);
    expect((result as any).value).toBe('42');
  });
});
