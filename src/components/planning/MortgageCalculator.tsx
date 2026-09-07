'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Flex, Input, Stack, Text } from 'doom-design-system';
import { PlanningWorkspace } from './PlanningWorkspace';
import { resolvePlanContext, saveGoalFromPlan } from '@/app/actions/planning';
import { mortgageMath, assessMortgage, type MortgageInputs, type MortgageAssessment } from '@/lib/planning/mortgage';
import { createSnapshotContext } from '@/lib/planning/context';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${Math.round(n * 100)}%`;

// National DTI guideline, used as the fallback + comparison baseline when the
// snapshot's colThresholds signal isn't present or hasn't loosened the caps.
const NATIONAL_CAPS = { front: 0.28, back: 0.36 };

const FIELDS: { key: keyof MortgageInputs; label: string; testid: string }[] = [
  { key: 'homePrice', label: 'Home price', testid: 'mc-home-price' },
  { key: 'downPayment', label: 'Down payment', testid: 'mc-down-payment' },
  { key: 'annualRatePct', label: 'Rate %', testid: 'mc-rate' },
  { key: 'termYears', label: 'Term (years)', testid: 'mc-term' },
  { key: 'propertyTaxAnnual', label: 'Property tax /yr', testid: 'mc-tax' },
  { key: 'homeInsuranceAnnual', label: 'Insurance /yr', testid: 'mc-insurance' },
  { key: 'hoaMonthly', label: 'HOA /mo', testid: 'mc-hoa' },
  { key: 'pmiMonthly', label: 'PMI /mo', testid: 'mc-pmi' },
  { key: 'existingMonthlyDebt', label: 'Existing debt /mo', testid: 'mc-debt' },
];

const VERDICT_COPY: Record<MortgageAssessment['verdict'], string> = {
  comfortable: 'Comfortable', stretch: 'A stretch', over: 'Over budget',
};

export default function MortgageCalculator() {
  const [inputs, setInputs] = useState<MortgageInputs | null>(null);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | null>(null);
  const [assessment, setAssessment] = useState<MortgageAssessment | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    resolvePlanContext('mortgage').then((r) => {
      setInputs(r.defaults as MortgageInputs);
      setSnapshot(r.snapshot);
    }).catch(() => {});
  }, []);

  const math = useMemo(() => (inputs ? mortgageMath(inputs) : null), [inputs]);

  useEffect(() => {
    if (!inputs || !math || !snapshot) return;
    const ctx = createSnapshotContext(snapshot);
    assessMortgage(math, inputs, ctx).then(setAssessment).catch(() => {});
  }, [inputs, math, snapshot]);

  if (!inputs || !math) {
    return <PlanningWorkspace title="Mortgage"><Text color="muted">Loading your finances…</Text></PlanningWorkspace>;
  }

  // Read the caps from the same snapshot signal the verdict was computed against,
  // so the limits we display can never drift from the assessment's basis.
  const caps = (snapshot?.colThresholds as { front: number; back: number } | undefined) ?? NATIONAL_CAPS;
  const colAdjusted = caps.front !== NATIONAL_CAPS.front || caps.back !== NATIONAL_CAPS.back;

  const set = (key: keyof MortgageInputs, raw: string) => {
    setSaved(false);
    setInputs((prev) => (prev ? { ...prev, [key]: Number(raw) || 0 } : prev));
  };

  const onSave = async () => {
    await saveGoalFromPlan('mortgage', inputs, { targetDate: null });
    setSaved(true);
  };

  return (
    <PlanningWorkspace
      title="Mortgage"
      header={<Button size="sm" variant="primary" data-testid="mc-save-goal" onClick={onSave}>Save as goal</Button>}
    >
      <Stack gap={4}>
        <Flex gap={3} wrap>
          {FIELDS.map((f) => (
            <Input
              key={f.key}
              label={f.label}
              type="number"
              data-testid={f.testid}
              value={String(inputs[f.key])}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set(f.key, e.target.value)}
            />
          ))}
        </Flex>

        <Flex gap={6} wrap align="baseline">
          <Stack gap={0}>
            <Text variant="caption" color="muted">Monthly payment</Text>
            <Text variant="h3" weight="black" data-testid="mc-monthly-payment">{money(math.monthlyPayment)}</Text>
          </Stack>
          <Stack gap={0}>
            <Text variant="caption" color="muted">Total interest</Text>
            <Text weight="bold">{money(math.totalInterest)}</Text>
          </Stack>
        </Flex>

        {assessment && (
          <>
            <Flex gap={6} wrap align="baseline" data-testid="mc-assessment">
              <Stat label="Front-end DTI" value={`${pct(assessment.frontEndDTI)} · limit ${pct(caps.front)}`} />
              <Stat label="Back-end DTI" value={`${pct(assessment.backEndDTI)} · limit ${pct(caps.back)}`} />
              <Stat label="Surplus after" value={money(assessment.surplusAfterPayment)} />
              <Stat label="Months to down pmt" value={assessment.monthsToDownPayment == null ? '—' : String(assessment.monthsToDownPayment)} />
              <Stat label="Verdict" value={VERDICT_COPY[assessment.verdict]} />
            </Flex>
            <Text variant="caption" color="muted" data-testid="mc-col-note">
              {colAdjusted ? 'Cost-of-living adjusted limits' : 'National guideline limits'} — {pct(caps.front)} / {pct(caps.back)}
            </Text>
          </>
        )}

        {saved && <Text color="muted" data-testid="mc-saved">Saved as a goal.</Text>}
      </Stack>
    </PlanningWorkspace>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={0}>
      <Text variant="caption" color="muted">{label}</Text>
      <Text weight="bold" variant="small">{value}</Text>
    </Stack>
  );
}
