// Whole-dollar currency formatting for Plan surfaces (hub tiles, cards). The
// calculator formats to cents; the hub reads at a glance, so it rounds.
export const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
