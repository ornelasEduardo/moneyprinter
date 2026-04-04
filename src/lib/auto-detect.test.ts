import { describe, it, expect } from 'vitest';
import { autoDetectColumns, type ColumnMapping } from './auto-detect';

describe('autoDetectColumns', () => {
  it('should detect date column', () => {
    const rows = [
      { 'Transaction Date': '2026-03-15', 'Description': 'Coffee', 'Amount': '4.50' },
      { 'Transaction Date': '2026-03-16', 'Description': 'Lunch', 'Amount': '12.00' },
      { 'Transaction Date': '2026-03-17', 'Description': 'Gas', 'Amount': '45.00' },
    ];
    const mapping = autoDetectColumns(rows);
    expect(mapping['Transaction Date'].type).toBe('date');
    expect(mapping['Transaction Date'].field).toBe('date');
  });

  it('should detect amount column', () => {
    const rows = [
      { 'Date': '2026-03-15', 'Desc': 'Coffee', 'Amount': '$4.50' },
      { 'Date': '2026-03-16', 'Desc': 'Lunch', 'Amount': '$12.00' },
      { 'Date': '2026-03-17', 'Desc': 'Gas', 'Amount': '$45.00' },
    ];
    const mapping = autoDetectColumns(rows);
    expect(mapping['Amount'].type).toBe('currency');
    expect(mapping['Amount'].field).toBe('amount');
  });

  it('should detect name/description column', () => {
    const rows = [
      { 'Date': '2026-03-15', 'Description': 'Coffee Shop on Main St', 'Amt': '4.50' },
      { 'Date': '2026-03-16', 'Description': 'Lunch at Restaurant', 'Amt': '12.00' },
    ];
    const mapping = autoDetectColumns(rows);
    expect(mapping['Description'].field).toBe('name');
    expect(mapping['Description'].type).toBe('string');
  });

  it('should set unrecognized columns to field: null', () => {
    const rows = [
      { 'Date': '2026-03-15', 'Desc': 'Coffee', 'Amount': '4.50', 'Ref#': 'ABC123' },
    ];
    const mapping = autoDetectColumns(rows);
    expect(mapping['Ref#'].field).toBeNull();
  });

  it('should handle column names that hint at fields', () => {
    const rows = [
      { 'Post Date': '2026-03-15', 'Merchant Name': 'Coffee', 'Debit': '4.50' },
    ];
    const mapping = autoDetectColumns(rows);
    expect(mapping['Post Date'].field).toBe('date');
    expect(mapping['Merchant Name'].field).toBe('name');
    expect(mapping['Debit'].field).toBe('amount');
  });

  it('should detect amount sign convention', () => {
    const rows = [
      { 'Date': '2026-03-15', 'Desc': 'Coffee', 'Amount': '-4.50' },
      { 'Date': '2026-03-16', 'Desc': 'Deposit', 'Amount': '1000.00' },
    ];
    const result = autoDetectColumns(rows);
    // Mixed positive/negative suggests negative_is_debit
    expect(result.__detectedBehaviors?.amount_convention).toBe('negative_is_debit');
  });
});
