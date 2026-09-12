// Whole-dollar currency formatting for Plan surfaces (hub tiles, cards). The
// calculator formats to cents; the hub reads at a glance, so it rounds.
export const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

// Compact form ($1.2M, $40K) for tight glanceable spots like the goal caption.
export const moneyCompact = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
