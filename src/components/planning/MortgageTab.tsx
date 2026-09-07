'use client';

import { useEffect, useState } from 'react';
import MortgageCalculator from './MortgageCalculator';
import { getGoalPlan } from '@/app/actions/planning';
import type { MortgageInputs } from '@/lib/planning/mortgage';

interface MortgageTabProps {
  goalId: number | null;
}

// Reopens the calculator pre-loaded with a saved goal's mortgage plan_inputs.
// The COL verdict still comes from MortgageCalculator's own resolvePlanContext
// call — region/caps are a user setting, not part of a saved plan, so the
// verdict always reflects the user's current settings, not the goal's.
export default function MortgageTab({ goalId }: MortgageTabProps) {
  const [initialInputs, setInitialInputs] = useState<MortgageInputs | undefined>(undefined);
  const [ready, setReady] = useState(goalId == null);

  useEffect(() => {
    if (goalId == null) return;
    let cancelled = false;
    getGoalPlan(goalId)
      .then((plan) => {
        if (cancelled) return;
        if (plan?.kind === 'mortgage') setInitialInputs(plan.inputs as unknown as MortgageInputs);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [goalId]);

  if (!ready) return null;
  return <MortgageCalculator initialInputs={initialInputs} />;
}
