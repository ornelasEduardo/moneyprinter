import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCsvEntity, validateRows, commitImport } from './import';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({ default: {
  transactions: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  accounts: { findFirst: vi.fn() },
  transfers: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
} }));

describe('import ownership and reconciliation safety', () => {
  const payment = { name: 'Payment', date: new Date('2026-01-01'), amount: 50, type: 'payment_in', account_id: 4 };
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.accounts.findFirst).mockResolvedValue({ id: 4, currency: 'USD' } as never);
    vi.mocked(prisma.transactions.create).mockResolvedValue({ id: 100 } as never);
  });

  it('rejects another user account reference before writing', async () => {
    vi.mocked(prisma.accounts.findFirst).mockResolvedValue(null);
    await expect(commitImport(7, 'transactions', [payment], 'skip')).rejects.toThrow(/account/i);
    expect(prisma.transactions.create).not.toHaveBeenCalled();
  });

  it('rejects invalid transaction types on the server even when preview is bypassed', async () => {
    await expect(commitImport(7, 'transactions', [{ ...payment, type: 'mystery' }], 'skip')).rejects.toThrow();
    expect(prisma.transactions.create).not.toHaveBeenCalled();
  });

  it('does not let generic imports overwrite reconciled payment entries', async () => {
    vi.mocked(prisma.transactions.findFirst).mockResolvedValue({ ...payment, id: 100, transfer_id: 3 } as never);
    await expect(commitImport(7, 'transactions', [{ ...payment, id: 100 }], 'overwrite')).rejects.toThrow(/unlink|linked|reconcil/i);
    expect(prisma.transactions.update).not.toHaveBeenCalled();
  });

  it('requires matching rather than accepting an arbitrary transfer link from a CSV', async () => {
    await expect(commitImport(7, 'transactions', [{ ...payment, transfer_id: 33 }], 'skip')).rejects.toThrow(/match|restore/i);
    expect(prisma.transactions.create).not.toHaveBeenCalled();
  });

  it('does not pass a caller supplied user id through to the created record', async () => {
    await commitImport(7, 'transactions', [{ ...payment, user_id: 999 }], 'skip');
    expect(prisma.transactions.create).toHaveBeenCalledWith({ data: expect.objectContaining({ user_id: 7 }) });
  });

  it('guards transaction overwrite atomically against a concurrent reconciliation', async () => {
    vi.mocked(prisma.transactions.findFirst).mockResolvedValue({ ...payment, id: 100, transfer_id: null } as never);
    await commitImport(7, 'transactions', [{ ...payment, id: 100 }], 'overwrite');
    expect(prisma.transactions.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 100, user_id: 7, transfer_id: null },
    }));
  });

  it('guards transfer overwrite atomically against statement links', async () => {
    vi.mocked(prisma.transfers.findFirst).mockResolvedValue({ id: 3 } as never);
    await commitImport(7, 'transfers', [{ id: 3, from_account_id: 4, to_account_id: 5, amount: 50, transfer_date: '2026-01-01' }], 'overwrite');
    expect(prisma.transfers.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 3, user_id: 7, transactions: { none: { deleted_at: null } } },
    }));
  });

  it('guards purchase type changes against existing refund references', async () => {
    vi.mocked(prisma.transactions.findFirst).mockResolvedValue({ ...payment, id: 100, type: 'expense', transfer_id: null } as never);
    await commitImport(7, 'transactions', [{ ...payment, id: 100 }], 'overwrite');
    expect(prisma.transactions.update).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ other_transactions: { none: { deleted_at: null } } }),
    }));
  });
});

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

  it('validates a transfers CSV against transferSchema', () => {
    const csv = [
      'from_account_id,to_account_id,amount,transfer_date,note,tags',
      '1,2,250.00,2026-04-16,Sweep,savings',
      '1,1,100.00,2026-04-16,Invalid,',
    ].join('\n');

    const rows = parseCsvEntity(csv);
    const result = validateRows('transfers', rows);

    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]).toMatchObject({
      from_account_id: 1,
      to_account_id: 2,
      amount: 250,
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/differ/i);
  });
});
