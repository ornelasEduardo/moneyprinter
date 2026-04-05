// Human-readable import error library
// Maps technical validation/pipeline errors to friendly messages with fix hints.

export type ErrorSeverity = 'error' | 'warning';

export type ErrorCategory = 'missing' | 'format' | 'validation' | 'duplicate';

export interface ImportError {
  field: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  hint?: string;
}

const FRIENDLY_FIELDS: Record<string, string> = {
  name: 'Description',
  amount: 'Amount',
  date: 'Date',
  tags: 'Category',
  type: 'Type',
  account_id: 'Account',
  pending: 'Pending',
};

export function friendlyFieldName(field: string): string {
  return FRIENDLY_FIELDS[field] || field;
}

// Missing field errors
export function missingField(field: string): ImportError {
  const name = friendlyFieldName(field);
  return {
    field: name,
    message: 'is missing',
    severity: 'error',
    category: 'missing',
    hint: `Map a column to "${name}" or check that your CSV has this data`,
  };
}

// Format errors (unparseable values)
export function badDate(rawValue: unknown): ImportError {
  return {
    field: 'Date',
    message: "doesn't look like a date",
    severity: 'error',
    category: 'format',
    hint: 'Expected formats: YYYY-MM-DD, MM/DD/YYYY, or DD/MM/YYYY',
  };
}

export function badAmount(rawValue: unknown): ImportError {
  return {
    field: 'Amount',
    message: "doesn't look like a number",
    severity: 'error',
    category: 'format',
    hint: 'Remove currency symbols or text from the amount column',
  };
}

// Schema validation errors (from Zod)
export function fromZodIssue(field: string, zodMessage: string): ImportError {
  const name = friendlyFieldName(field);

  // Missing / undefined
  if (
    zodMessage.toLowerCase().includes('required') ||
    (zodMessage.toLowerCase().includes('expected') && zodMessage.toLowerCase().includes('undefined'))
  ) {
    return missingField(field);
  }

  // Bad date
  if (zodMessage.toLowerCase().includes('invalid date') || zodMessage.toLowerCase().includes('invalid_date')) {
    return {
      field: name,
      message: "doesn't look like a valid date",
      severity: 'error',
      category: 'format',
      hint: 'Check the date format in your CSV',
    };
  }

  // Bad number
  if (zodMessage.toLowerCase().includes('expected number') || zodMessage.toLowerCase().includes('nan')) {
    return {
      field: name,
      message: "doesn't look like a number",
      severity: 'error',
      category: 'format',
      hint: 'Make sure this column only contains numbers',
    };
  }

  // Too short / min length
  if (zodMessage.toLowerCase().includes('too_small') || zodMessage.toLowerCase().includes('at least')) {
    return {
      field: name,
      message: 'is too short',
      severity: 'error',
      category: 'validation',
    };
  }

  // Fallback
  return {
    field: name,
    message: zodMessage.toLowerCase(),
    severity: 'error',
    category: 'validation',
  };
}

// Duplicate detection
export function duplicateFound(confidence: string): ImportError {
  const messages: Record<string, string> = {
    high: 'looks like an exact duplicate',
    medium: 'might be a duplicate',
    low: 'has a similar date and amount',
  };
  return {
    field: 'Row',
    message: messages[confidence] || 'looks like a duplicate',
    severity: 'warning',
    category: 'duplicate',
    hint: 'Uncheck this row if you don\'t want to import it',
  };
}
