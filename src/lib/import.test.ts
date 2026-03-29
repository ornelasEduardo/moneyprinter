import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCsvEntity, validateRows } from './import';

describe('parseCsvEntity', () => {
  it('should parse CSV string into rows', () => {
    const csv = 'name,type,balance\nChecking,checking,1500.50\nSavings,savings,5000';
    const rows = parseCsvEntity(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Checking');
    expect(rows[0].balance).toBe('1500.50');
  });

  it('should handle empty CSV', () => {
    const rows = parseCsvEntity('');
    expect(rows).toHaveLength(0);
  });
});

describe('validateRows', () => {
  it('should validate valid account rows', () => {
    const rows = [
      { name: 'Checking', type: 'checking', balance: '1500' },
      { name: 'Savings', type: 'savings', balance: '5000' },
    ];
    const result = validateRows('accounts', rows);
    expect(result.valid).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should report validation errors with row numbers', () => {
    const rows = [
      { name: 'Checking', type: 'checking', balance: '1500' },
      { name: '', type: 'savings', balance: '5000' },
      { name: 'Credit', type: 'credit', balance: 'not-a-number' },
    ];
    const result = validateRows('accounts', rows);
    expect(result.valid).toHaveLength(1);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].row).toBeGreaterThan(1);
  });

  it('should reject unknown entity type', () => {
    expect(() => validateRows('unknown', [])).toThrow('Unknown entity: unknown');
  });
});
