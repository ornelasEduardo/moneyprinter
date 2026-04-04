import { describe, it, expect } from 'vitest';
import { parseValue, formatValue, SYSTEM_TYPES, type SystemType } from './system-types';

describe('SYSTEM_TYPES', () => {
  it('should include all primitive types', () => {
    expect(SYSTEM_TYPES).toContain('string');
    expect(SYSTEM_TYPES).toContain('number');
    expect(SYSTEM_TYPES).toContain('currency');
    expect(SYSTEM_TYPES).toContain('date');
    expect(SYSTEM_TYPES).toContain('boolean');
  });
});

describe('parseValue — string', () => {
  it('should trim whitespace', () => {
    expect(parseValue('string', '  hello  ')).toBe('hello');
  });

  it('should pass through normal strings', () => {
    expect(parseValue('string', 'Grocery Store')).toBe('Grocery Store');
  });
});

describe('parseValue — number', () => {
  it('should parse integers', () => {
    expect(parseValue('number', '1500')).toBe(1500);
  });

  it('should parse decimals', () => {
    expect(parseValue('number', '42.50')).toBe(42.5);
  });

  it('should parse negative numbers', () => {
    expect(parseValue('number', '-100.25')).toBe(-100.25);
  });

  it('should strip commas', () => {
    expect(parseValue('number', '1,500.00')).toBe(1500);
  });

  it('should return NaN for non-numeric', () => {
    expect(parseValue('number', 'abc')).toBeNaN();
  });
});

describe('parseValue — currency', () => {
  it('should strip dollar sign', () => {
    expect(parseValue('currency', '$1,500.00')).toBe(1500);
  });

  it('should strip euro sign', () => {
    expect(parseValue('currency', '€200.50')).toBe(200.5);
  });

  it('should strip pound sign', () => {
    expect(parseValue('currency', '£99.99')).toBe(99.99);
  });

  it('should handle parenthesized negatives', () => {
    expect(parseValue('currency', '($50.00)')).toBe(-50);
  });

  it('should handle negative with symbol', () => {
    expect(parseValue('currency', '-$42.50')).toBe(-42.5);
  });

  it('should handle plain numbers', () => {
    expect(parseValue('currency', '100')).toBe(100);
  });
});

describe('parseValue — date', () => {
  it('should parse ISO format', () => {
    const result = parseValue('date', '2026-03-15') as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2026);
  });

  it('should parse MM/DD/YYYY', () => {
    const result = parseValue('date', '03/15/2026') as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getMonth()).toBe(2); // March = 2
  });

  it('should parse M/D/YYYY', () => {
    const result = parseValue('date', '3/5/2026') as Date;
    expect(result).toBeInstanceOf(Date);
  });

  it('should return null for invalid date', () => {
    expect(parseValue('date', 'not-a-date')).toBeNull();
  });

  it('should use date_format from context when provided', () => {
    const result = parseValue('date', '15/03/2026', { date_format: 'DD/MM/YYYY' }) as Date;
    expect(result).toBeInstanceOf(Date);
    expect(result.getMonth()).toBe(2); // March
    expect(result.getDate()).toBe(15);
  });
});

describe('parseValue — boolean', () => {
  it('should parse true variants', () => {
    expect(parseValue('boolean', 'true')).toBe(true);
    expect(parseValue('boolean', 'True')).toBe(true);
    expect(parseValue('boolean', 'yes')).toBe(true);
    expect(parseValue('boolean', 'Yes')).toBe(true);
    expect(parseValue('boolean', '1')).toBe(true);
    expect(parseValue('boolean', 'Y')).toBe(true);
  });

  it('should parse false variants', () => {
    expect(parseValue('boolean', 'false')).toBe(false);
    expect(parseValue('boolean', 'no')).toBe(false);
    expect(parseValue('boolean', '0')).toBe(false);
    expect(parseValue('boolean', 'N')).toBe(false);
  });
});

describe('formatValue', () => {
  it('should format string', () => {
    expect(formatValue('string', 'hello')).toBe('hello');
  });

  it('should format number', () => {
    expect(formatValue('number', 1500)).toBe('1,500');
  });

  it('should format currency', () => {
    expect(formatValue('currency', 1500.5)).toBe('$1,500.50');
  });

  it('should format date', () => {
    const result = formatValue('date', new Date('2026-03-15'));
    expect(result).toContain('2026');
  });

  it('should format boolean', () => {
    expect(formatValue('boolean', true)).toBe('Yes');
    expect(formatValue('boolean', false)).toBe('No');
  });
});
