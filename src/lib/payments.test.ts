import { describe, expect, it } from 'vitest';
import { paymentCandidates, matchingTransfers, minorUnits, paymentPairAccounts, type PaymentRecord } from './payments';

const payment = (overrides: Partial<PaymentRecord> = {}): PaymentRecord => ({
  id: 1, user_id: 7, account_id: 10, accountName: 'Checking', currency: 'USD',
  type: 'payment_out', amount: '125.10', date: '2026-11-01', transfer_id: null,
  deleted_at: null, account_deleted_at: null, name: 'Card payment', ...overrides,
});

describe('payment reconciliation', () => {
  it('matches opposite payment directions from either statement import order', () => {
    const from = payment();
    const to = payment({ id: 2, account_id: 20, type: 'payment_in', date: '2026-11-03' });
    expect(paymentCandidates(from, [to])).toEqual([to]);
    expect(paymentCandidates(to, [from])).toEqual([from]);
    expect(paymentPairAccounts(from, to)).toEqual({ fromAccountId: 10, toAccountId: 20 });
    expect(paymentPairAccounts(to, from)).toEqual({ fromAccountId: 10, toAccountId: 20 });
  });

  it('keeps ambiguous matches visible instead of choosing one silently', () => {
    const a = payment({ id: 2, account_id: 20, type: 'payment_in' });
    const b = payment({ id: 3, account_id: 30, type: 'payment_in' });
    expect(paymentCandidates(payment(), [a, b])).toEqual([a, b]);
  });

  it('excludes other users, same account, currencies, amounts, directions, deleted and linked entries', () => {
    const to = payment({ id: 2, account_id: 20, type: 'payment_in' });
    const invalid = [
      { user_id: 9 }, { account_id: 10 }, { currency: 'EUR' }, { amount: '125.11' },
      { type: 'payment_out' }, { type: 'refund' }, { transfer_id: 4 },
      { deleted_at: '2026-11-01' }, { account_deleted_at: '2026-11-01' },
      { date: '2026-11-09' }, { amount: '-125.10' },
    ];
    for (const overrides of invalid) expect(paymentCandidates(payment(), [{ ...to, ...overrides }])).toEqual([]);
  });

  it('accepts a posting difference of seven days and exact integer minor units', () => {
    expect(paymentCandidates(payment(), [payment({ id: 2, account_id: 20, type: 'payment_in', date: '2026-11-08' })])).toHaveLength(1);
    expect(minorUnits('125.10')).toBe(12510);
    expect(minorUnits(0.29)).toBe(29);
    expect(() => minorUnits('1.001')).toThrow(/amount/i);
    expect(() => minorUnits(Infinity)).toThrow(/amount/i);
  });

  it('suggests an existing transfer for a later-imported statement only when its side is unoccupied', () => {
    const source = payment({ id: 2, account_id: 20, type: 'payment_in' });
    const transfer = { id: 100, user_id: 7, from_account_id: 10, to_account_id: 20, amount: '125.10', date: '2026-11-01', fromCurrency: 'USD', toCurrency: 'USD', deleted_at: null, occupiedAccountIds: [10] };
    expect(matchingTransfers(source, [transfer])).toEqual([transfer]);
    expect(matchingTransfers(source, [{ ...transfer, occupiedAccountIds: [10, 20] }])).toEqual([]);
    expect(matchingTransfers(source, [{ ...transfer, user_id: 8 }])).toEqual([]);
    expect(matchingTransfers(source, [{ ...transfer, amount: '125.11' }])).toEqual([]);
  });
});
