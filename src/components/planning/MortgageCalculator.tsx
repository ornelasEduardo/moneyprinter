'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Flex, Grid, Input, ProgressBar, Stack, Text } from 'doom-design-system';
import { PlanningWorkspace } from './PlanningWorkspace';
import { resolvePlanContext, saveGoalFromPlan } from '@/app/actions/planning';
import { mortgageMath, assessMortgage, type MortgageInputs, type MortgageAssessment } from '@/lib/planning/mortgage';
import { createSnapshotContext } from '@/lib/planning/context';
import styles from './MortgageCalculator.module.scss';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${Math.round(n * 100)}%`;

// National DTI guideline, used as the fallback + comparison baseline when the
// snapshot's colThresholds signal isn't present or hasn't loosened the caps.
const NATIONAL_CAPS = { front: 0.28, back: 0.36 };

type Field = { key: keyof MortgageInputs; label: string; testid: string; start?: string; end?: string };
const GROUPS: { title: string; cols: string; fields: Field[] }[] = [
  { title: 'The home', cols: '1fr 1fr', fields: [
    { key: 'homePrice', label: 'Home price', testid: 'mc-home-price', start: '$' },
    { key: 'downPayment', label: 'Down payment', testid: 'mc-down-payment', start: '$' },
  ] },
  { title: 'The loan', cols: '1fr 1fr', fields: [
    { key: 'annualRatePct', label: 'Interest rate', testid: 'mc-rate', end: '%' },
    { key: 'termYears', label: 'Loan term', testid: 'mc-term', end: 'yrs' },
  ] },
  { title: 'Monthly costs', cols: '1fr 1fr', fields: [
    { key: 'propertyTaxAnnual', label: 'Property tax', testid: 'mc-tax', start: '$', end: '/yr' },
    { key: 'homeInsuranceAnnual', label: 'Home insurance', testid: 'mc-insurance', start: '$', end: '/yr' },
    { key: 'hoaMonthly', label: 'HOA', testid: 'mc-hoa', start: '$', end: '/mo' },
    { key: 'pmiMonthly', label: 'PMI', testid: 'mc-pmi', start: '$', end: '/mo' },
  ] },
  { title: 'Your finances', cols: '1fr', fields: [
    { key: 'existingMonthlyDebt', label: 'Other monthly debt', testid: 'mc-debt', start: '$', end: '/mo' },
  ] },
];

const VERDICT: Record<MortgageAssessment['verdict'], { variant: 'success' | 'warning' | 'error'; label: string; line: string }> = {
  comfortable: { variant: 'success', label: 'Comfortable', line: 'Comfortably within your limits.' },
  stretch: { variant: 'warning', label: 'A stretch', line: 'Past the front-end guideline, but your total debt still fits.' },
  over: { variant: 'error', label: 'Over budget', line: 'Beyond what your income and debts support.' },
};

export default function MortgageCalculator({ initialInputs }: { initialInputs?: MortgageInputs } = {}) {
  // Seed from a reopened goal's saved plan_inputs when provided, so the form
  // renders with those numbers immediately instead of waiting on resolved defaults.
  const [inputs, setInputs] = useState<MortgageInputs | null>(initialInputs ?? null);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [assessment, setAssessment] = useState<MortgageAssessment | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Always resolve a fresh snapshot — the COL verdict must reflect the
    // user's CURRENT region/settings, even when inputs came from a saved plan.
    resolvePlanContext('mortgage').then((r) => {
      setSnapshot(r.snapshot);
      setInputs((prev) => prev ?? (r.defaults as MortgageInputs));
    }).catch(() => {});
  }, []);

  const math = useMemo(() => (inputs ? mortgageMath(inputs) : null), [inputs]);

  useEffect(() => {
    if (!inputs || !math || !snapshot) return;
    const ctx = createSnapshotContext(snapshot);
    assessMortgage(math, inputs, ctx).then(setAssessment).catch(() => {});
  }, [inputs, math, snapshot]);

  const onSave = async () => {
    if (!inputs) return;
    await saveGoalFromPlan('mortgage', inputs, { targetDate: null });
    setSaved(true);
  };

  const saveButton = (
    <Button size="sm" variant="primary" data-testid="mc-save-goal" onClick={onSave} disabled={!inputs}>
      Save as goal
    </Button>
  );

  if (!inputs || !math) {
    return (
      <PlanningWorkspace title="Mortgage" header={saveButton}>
        <Card><Text color="muted">Reading your finances…</Text></Card>
      </PlanningWorkspace>
    );
  }

  const set = (key: keyof MortgageInputs, raw: string) => {
    setSaved(false);
    setInputs((prev) => (prev ? { ...prev, [key]: Number(raw) || 0 } : prev));
  };

  // Read the caps from the same snapshot signal the verdict was computed against,
  // so the limits we display can never drift from the assessment's basis.
  const caps = (snapshot?.colThresholds as { front: number; back: number } | undefined) ?? NATIONAL_CAPS;
  const colAdjusted = caps.front !== NATIONAL_CAPS.front || caps.back !== NATIONAL_CAPS.back;
  const verdict = assessment ? VERDICT[assessment.verdict] : null;

  const piti = [
    { label: 'Principal & interest', value: math.principalAndInterest },
    { label: 'Property tax', value: inputs.propertyTaxAnnual / 12 },
    { label: 'Insurance', value: inputs.homeInsuranceAnnual / 12 },
    { label: 'HOA', value: inputs.hoaMonthly },
    { label: 'PMI', value: inputs.pmiMonthly },
  ].filter((p) => p.value > 0);

  return (
    <PlanningWorkspace title="Mortgage" header={saveButton}>
      {/* Hero — the affordability answer, the way the Goal Tracker answers "how long". */}
      <Card>
        <Stack gap={3}>
          <Flex align="center" gap={3} wrap>
            {verdict && <Badge variant={verdict.variant} size="lg">{verdict.label}</Badge>}
            {verdict && <Text color="muted">{verdict.line}</Text>}
          </Flex>
          <Flex align="baseline" gap={2} wrap>
            <Text variant="h1" weight="black" data-testid="mc-monthly-payment">{money(math.monthlyPayment)}</Text>
            <Text variant="h5" color="muted">/mo</Text>
          </Flex>
          <div className={styles.piti}>
            {piti.map((p) => (
              <Stack key={p.label} gap={0}>
                <Text variant="caption" color="muted">{p.label}</Text>
                <Text weight="bold" variant="small">{money(p.value)}</Text>
              </Stack>
            ))}
          </div>
          {assessment && (
            <Text variant="caption" color="muted" data-testid="mc-col-note">
              {colAdjusted ? 'Cost-of-living adjusted limits' : 'National guideline limits'} — {pct(caps.front)} / {pct(caps.back)}
            </Text>
          )}
          {saved && <Text color="success" weight="bold" data-testid="mc-saved">Saved as a goal.</Text>}
        </Stack>
      </Card>

      <div className={styles.main}>
        {/* Inputs, grouped */}
        <Stack gap={4}>
          {GROUPS.map((g) => (
            <Card key={g.title}>
              <Stack gap={3}>
                <Text variant="h6" weight="bold">{g.title}</Text>
                <Grid columns={g.cols} gap={3}>
                  {g.fields.map((f) => (
                    <Input
                      key={f.key}
                      label={f.label}
                      type="number"
                      startAdornment={f.start}
                      endAdornment={f.end}
                      data-testid={f.testid}
                      value={String(inputs[f.key])}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set(f.key, e.target.value)}
                    />
                  ))}
                </Grid>
              </Stack>
            </Card>
          ))}
        </Stack>

        {/* Affordability */}
        <Card data-testid="mc-assessment">
          <Stack gap={4}>
            <Text variant="h6" weight="bold">Affordability</Text>
            {assessment ? (
              <>
                <DtiBar label="Front-end DTI (housing)" value={assessment.frontEndDTI} cap={caps.front} />
                <DtiBar label="Back-end DTI (all debt)" value={assessment.backEndDTI} cap={caps.back} />
                <StatLine
                  label="Surplus after payment"
                  value={money(assessment.surplusAfterPayment)}
                  color={assessment.surplusAfterPayment >= 0 ? 'success' : 'error'}
                />
                <StatLine
                  label="Months to down payment"
                  value={assessment.monthsToDownPayment == null ? 'Not on this budget' : String(assessment.monthsToDownPayment)}
                />
                <StatLine label="Total interest" value={money(math.totalInterest)} />
              </>
            ) : (
              <Text color="muted">Checking this against your finances…</Text>
            )}
          </Stack>
        </Card>
      </div>
    </PlanningWorkspace>
  );
}

function DtiBar({ label, value, cap }: { label: string; value: number; cap: number }) {
  const over = value > cap;
  return (
    <Stack gap={1}>
      <Flex justify="space-between" align="baseline" gap={2}>
        <Text variant="caption" color="muted">{label}</Text>
        <Text variant="small" weight="bold" color={over ? 'error' : 'success'}>
          {pct(value)} <Text as="span" variant="small" color="muted">/ limit {pct(cap)}</Text>
        </Text>
      </Flex>
      <ProgressBar value={value} max={cap} showStripes height={14} color={over ? 'var(--error)' : 'var(--success)'} />
    </Stack>
  );
}

function StatLine({ label, value, color }: { label: string; value: string; color?: 'success' | 'error' }) {
  return (
    <Flex justify="space-between" align="baseline" gap={2}>
      <Text variant="caption" color="muted">{label}</Text>
      <Text weight="bold" color={color}>{value}</Text>
    </Flex>
  );
}
