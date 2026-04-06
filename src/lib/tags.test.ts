import { describe, it, expect } from 'vitest';
import { normalizeTag, splitTags } from './tags';

describe('normalizeTag', () => {
  it('should lowercase and trim', () => {
    expect(normalizeTag('  Groceries  ')).toBe('groceries');
  });

  it('should collapse whitespace', () => {
    expect(normalizeTag('food   &   drink')).toBe('food & drink');
  });

  it('should strip trailing punctuation', () => {
    expect(normalizeTag('shopping.')).toBe('shopping');
    expect(normalizeTag('food,')).toBe('food');
  });

  it('should handle empty string', () => {
    expect(normalizeTag('')).toBe('');
  });

  it('should preserve compound tags', () => {
    expect(normalizeTag('Food & Drink')).toBe('food & drink');
  });
});

describe('splitTags', () => {
  it('should split on comma and normalize each', () => {
    expect(splitTags('Food, Shopping, Transport')).toEqual([
      'food', 'shopping', 'transport',
    ]);
  });

  it('should deduplicate', () => {
    expect(splitTags('food, Food, FOOD')).toEqual(['food']);
  });

  it('should handle null/undefined', () => {
    expect(splitTags(null)).toEqual([]);
    expect(splitTags(undefined)).toEqual([]);
    expect(splitTags('')).toEqual([]);
  });

  it('should filter out empty segments', () => {
    expect(splitTags('food,,shopping,')).toEqual(['food', 'shopping']);
  });
});
