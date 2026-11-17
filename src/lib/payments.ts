export interface PaymentRecord {
  id: number;
  user_id: number | null;
  account_id: number | null;
  accountName: string;
  currency: string | null;
  type: string | null;
  amount: string | number;
  date: string;
  name: string;
  transfer_id: number | null;
  deleted_at: string | null;
  account_deleted_at: string | null;
}

export interface PaymentTransfer {
  id: number;
  user_id: number;
  from_account_id: number;
  to_account_id: number;
  amount: string | number;
  date: string;
  fromCurrency: string | null;
  toCurrency: string | null;
  deleted_at: string | null;
  occupiedAccountIds: number[];
  fromAccountName?: string;
  toAccountName?: string;
}

/** The database stores Decimal(12,2). Never compare statement amounts with a tolerance. */
export function minorUnits(amount: string | number): number {
  const text = String(amount);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Payment amount must be positive with at most two decimal places');
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error('Invalid payment amount');
  return result;
}

function activePayment(p: PaymentRecord): boolean {
  return (p.type === 'payment_in' || p.type === 'payment_out') && p.account_id != null &&
    p.user_id != null && !p.deleted_at && !p.account_deleted_at && p.transfer_id == null && !!p.currency;
}

function withinWindow(a: string, b: string): boolean {
  const first = Date.parse(a.slice(0, 10));
  const second = Date.parse(b.slice(0, 10));
  return Number.isFinite(first) && Number.isFinite(second) && Math.abs(first - second) <= 7 * 86400000;
}

export function paymentPairAccounts(a: PaymentRecord, b: PaymentRecord) {
  if (!activePayment(a) || !activePayment(b) || a.id === b.id || a.user_id !== b.user_id ||
      a.account_id === b.account_id || a.currency !== b.currency || a.type === b.type ||
      minorUnits(a.amount) !== minorUnits(b.amount)) {
    throw new Error('These payments cannot be matched. Check their accounts, currencies, amounts, directions, and current links.');
  }
  return a.type === 'payment_out'
    ? { fromAccountId: a.account_id!, toAccountId: b.account_id! }
    : { fromAccountId: b.account_id!, toAccountId: a.account_id! };
}

export function paymentCandidates(source: PaymentRecord, rows: PaymentRecord[]): PaymentRecord[] {
  return rows.filter((row) => {
    try {
      paymentPairAccounts(source, row);
      return withinWindow(source.date, row.date);
    } catch { return false; }
  });
}

export function canAttachTransfer(source: PaymentRecord, transfer: PaymentTransfer): boolean {
  try {
    return activePayment(source) && source.user_id === transfer.user_id && !transfer.deleted_at &&
      transfer.from_account_id !== transfer.to_account_id &&
      source.currency === transfer.fromCurrency && source.currency === transfer.toCurrency &&
      (source.type === 'payment_out' ? transfer.from_account_id : transfer.to_account_id) === source.account_id &&
      minorUnits(source.amount) === minorUnits(transfer.amount) &&
      !transfer.occupiedAccountIds.includes(source.account_id!);
  } catch { return false; }
}

export function matchingTransfers(source: PaymentRecord, rows: PaymentTransfer[]): PaymentTransfer[] {
  return rows.filter((row) => canAttachTransfer(source, row) && withinWindow(source.date, row.date));
}
