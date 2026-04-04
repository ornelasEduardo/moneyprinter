export const SYSTEM_TYPES = ['string', 'number', 'currency', 'date', 'boolean'] as const;
export type SystemType = (typeof SYSTEM_TYPES)[number];

const DATE_PATTERNS: [RegExp, (m: RegExpMatchArray) => Date][] = [
  // YYYY-MM-DD
  [/^(\d{4})-(\d{1,2})-(\d{1,2})/, (m) => new Date(+m[1], +m[2] - 1, +m[3])],
  // MM/DD/YYYY or M/D/YYYY
  [/^(\d{1,2})\/(\d{1,2})\/(\d{4})/, (m) => new Date(+m[3], +m[1] - 1, +m[2])],
  // DD/MM/YYYY (only used when date_format specifies it)
  // Handled explicitly in parseDateWithFormat
];

function parseDateAuto(value: string): Date | null {
  const trimmed = value.trim();
  for (const [pattern, builder] of DATE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      const date = builder(match);
      if (!isNaN(date.getTime())) return date;
    }
  }
  // Fallback: try native Date parser
  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function parseDateWithFormat(value: string, format: string): Date | null {
  const trimmed = value.trim();
  if (format === 'DD/MM/YYYY') {
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) return new Date(+match[3], +match[2] - 1, +match[1]);
  }
  if (format === 'MM/DD/YYYY') {
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) return new Date(+match[3], +match[1] - 1, +match[2]);
  }
  if (format === 'YYYY-MM-DD') {
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) return new Date(+match[1], +match[2] - 1, +match[3]);
  }
  return parseDateAuto(trimmed);
}

function parseString(value: string): string {
  return value.trim();
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/[,\s]/g, '');
  return parseFloat(cleaned);
}

function parseCurrency(value: string): number {
  let cleaned = value.trim();
  // Handle parenthesized negatives: ($50.00) → -50
  const isParenNeg = /^\(.*\)$/.test(cleaned);
  if (isParenNeg) {
    cleaned = cleaned.slice(1, -1);
  }
  // Strip currency symbols
  cleaned = cleaned.replace(/[$€£¥₹]/g, '');
  // Strip commas and spaces
  cleaned = cleaned.replace(/[,\s]/g, '');
  const num = parseFloat(cleaned);
  return isParenNeg ? -Math.abs(num) : num;
}

function parseBoolean(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return ['true', 'yes', '1', 'y'].includes(lower);
}

export function parseValue(
  type: SystemType,
  value: string,
  context?: Record<string, unknown>,
): unknown {
  switch (type) {
    case 'string': return parseString(value);
    case 'number': return parseNumber(value);
    case 'currency': return parseCurrency(value);
    case 'date': {
      const format = context?.date_format as string | undefined;
      return format ? parseDateWithFormat(value, format) : parseDateAuto(value);
    }
    case 'boolean': return parseBoolean(value);
  }
}

export function formatValue(
  type: SystemType,
  value: unknown,
  context?: Record<string, unknown>,
): string {
  if (value === null || value === undefined) return '';
  switch (type) {
    case 'string': return String(value);
    case 'number': return (value as number).toLocaleString('en-US');
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value as number);
    case 'date': {
      const date = value instanceof Date ? value : new Date(value as string);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    case 'boolean': return (value as boolean) ? 'Yes' : 'No';
  }
}
