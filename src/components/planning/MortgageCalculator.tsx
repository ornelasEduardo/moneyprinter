'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Flex, Input, ProgressBar, Sheet, Stack, Text } from 'doom-design-system';
import { PlanningWorkspace } from './PlanningWorkspace';
import PlanGoalsList from './PlanGoalsList';
import { resolvePlanContext, saveGoalFromPlan } from '@/app/actions/planning';
import { mortgageMath, assessMortgage, type MortgageInputs, type MortgageAssessment } from '@/lib/planning/mortgage';
import { createSnapshotContext } from '@/lib/planning/context';
import styles from './MortgageCalculator.module.scss';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${Math.round(n * 100)}%`;

const NATIONAL_CAPS = { front: 0.28, back: 0.36 };

type Field = { key: keyof MortgageInputs; label: string; testid: string; start?: string; end?: string };
const GROUPS: { title: string; fields: Field[] }[] = [
  { title: 'The home', fields: [
    { key: 'homePrice', label: 'Home price', testid: 'mc-home-price', start: '$' },
    { key: 'downPayment', label: 'Down payment', testid: 'mc-down-payment', start: '$' },
  ] },
  { title: 'The loan', fields: [
    { key: 'annualRatePct', label: 'Interest rate', testid: 'mc-rate', end: '%' },
    { key: 'termYears', label: 'Loan term', testid: 'mc-term', end: 'yrs' },
  ] },
  { title: 'Monthly costs', fields: [
    { key: 'propertyTaxAnnual', label: 'Property tax', testid: 'mc-tax', start: '$', end: '/yr' },
    { key: 'homeInsuranceAnnual', label: 'Home insurance', testid: 'mc-insurance', start: '$', end: '/yr' },
    { key: 'hoaMonthly', label: 'HOA', testid: 'mc-hoa', start: '$', end: '/mo' },
    { key: 'pmiMonthly', label: 'PMI', testid: 'mc-pmi', start: '$', end: '/mo' },
  ] },
  { title: 'Your finances', fields: [
    { key: 'existingMonthlyDebt', label: 'Other monthly debt', testid: 'mc-debt', start: '$', end: '/mo' },
  ] },
];

const VERDICT: Record<MortgageAssessment['verdict'], { variant: 'success' | 'warning' | 'error'; label: string; line: string }> = {
  comfortable: { variant: 'success', label: 'Comfortable', line: 'Comfortably within your limits.' },
  stretch: { variant: 'warning', label: 'A stretch', line: 'Past the front-end guideline, but your total debt still fits.' },
  over: { variant: 'error', label: 'Over budget', line: 'Beyond what your income and debts support.' },
};

export default function MortgageCalculator({ initialInputs }: { initialInputs?: MortgageInputs } = {}) {
  const [inputs, setInputs] = useState<MortgageInputs | null>(initialInputs ?? null);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [assessment, setAssessment] = useState<MortgageAssessment | null>(null);
  const [saved, setSaved] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);

  useEffect(() => {
    // Resolve a fresh snapshot even for a reopened plan, so the verdict reflects
    // the user's current COL region, not whatever it was when the plan was saved.
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

  const clear = () => {
    setSaved(false);
    setInputs((prev) =>
      prev && { homePrice: 0, downPayment: 0, annualRatePct: 0, termYears: 0, propertyTaxAnnual: 0, homeInsuranceAnnual: 0, hoaMonthly: 0, pmiMonthly: 0, existingMonthlyDebt: 0 },
    );
  };

  const header = (
    <Flex gap={2} wrap>
      <Button size="sm" variant="ghost" data-testid="mc-clear" onClick={clear} disabled={!inputs}>
        Clear
      </Button>
      <Button size="sm" variant="secondary" data-testid="mc-open-plans" onClick={() => setPlansOpen(true)}>
        Saved plans
      </Button>
      <Button size="sm" variant="primary" data-testid="mc-save-goal" onClick={onSave} disabled={!inputs}>
        Save as goal
      </Button>
    </Flex>
  );

  const plansDrawer = (
    <Sheet isOpen={plansOpen} onClose={() => setPlansOpen(false)} title="Saved plans">
      <PlanGoalsList />
    </Sheet>
  );

  if (!inputs || !math) {
    return (
      <PlanningWorkspace title="Mortgage" header={header} backHref="/?tab=plan">
        <Card><Text color="muted">Reading your finances…</Text></Card>
        {plansDrawer}
      </PlanningWorkspace>
    );
  }

  const set = (key: keyof MortgageInputs, raw: string) => {
    setSaved(false);
    setInputs((prev) => (prev ? { ...prev, [key]: Number(raw) || 0 } : prev));
  };

  const caps: { front: number; back: number; source?: string; detail?: string } =
    (snapshot?.colThresholds as { front: number; back: number; source?: string; detail?: string } | undefined) ?? NATIONAL_CAPS;
  const colAdjusted = caps.front !== NATIONAL_CAPS.front || caps.back !== NATIONAL_CAPS.back;
  const capsSource = caps.source ?? (colAdjusted ? 'Cost-of-living adjusted limits' : 'National guideline limits');
  const verdict = assessment ? VERDICT[assessment.verdict] : null;

  const piti = [
    { label: 'Principal & interest', value: math.principalAndInterest },
    { label: 'Property tax', value: inputs.propertyTaxAnnual / 12 },
    { label: 'Insurance', value: inputs.homeInsuranceAnnual / 12 },
    { label: 'HOA', value: inputs.hoaMonthly },
    { label: 'PMI', value: inputs.pmiMonthly },
  ].filter((p) => p.value > 0);

  return (
    <PlanningWorkspace title="Mortgage" header={header} backHref="/?tab=plan">
      <div className={styles.main}>
        <Stack gap={4}>
          {GROUPS.map((g) => (
            <Card key={g.title}>
              <Stack gap={3}>
                <Text variant="h6" weight="bold">{g.title}</Text>
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
              </Stack>
            </Card>
          ))}
        </Stack>

        <div className={styles.results}>
          <Card data-testid="mc-assessment">
            <Stack gap={3}>
              <Flex align="center" gap={2} wrap>
                {verdict && <Badge variant={verdict.variant} size="lg">{verdict.label}</Badge>}
                {verdict && <Text variant="small" color="muted">{verdict.line}</Text>}
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

              <div className={styles.railDivider} />

              {assessment ? (
                <Stack gap={3}>
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
                  <Stack gap={0} data-testid="mc-col-note">
                    <Text variant="caption" color="muted">{capsSource} — {pct(caps.front)} / {pct(caps.back)} DTI limits</Text>
                    {caps.detail && <Text variant="caption" color="muted">{caps.detail}</Text>}
                  </Stack>
                </Stack>
              ) : (
                <Text color="muted">Checking this against your finances…</Text>
              )}

              {saved && <Text color="success" weight="bold" data-testid="mc-saved">Saved as a goal.</Text>}
            </Stack>
          </Card>
        </div>
      </div>
      {plansDrawer}
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
