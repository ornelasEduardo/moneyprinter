'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Flex, Stack, Text } from 'doom-design-system';
import { getPlanGoals } from '@/app/actions/planning';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

type PlanGoal = Awaited<ReturnType<typeof getPlanGoals>>[number];

// Drawer contents: every plan-carrying goal so a saved plan is reachable again.
// "View plan" reuses GoalTracker's /?tab=mortgage&goal=<id> reopen idiom,
// cloning current params so other query state survives the jump.
export default function PlanGoalsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [goals, setGoals] = useState<PlanGoal[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlanGoals().then((g) => {
      if (!cancelled) setGoals(g);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const viewPlan = (id: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', 'mortgage');
    p.set('goal', String(id));
    router.push('/?' + p.toString());
  };

  return (
    <Stack gap={4} data-testid="plan-goals-list">
      {goals == null ? (
        <Text color="muted">Loading…</Text>
      ) : goals.length === 0 ? (
        <Text color="muted">No saved plans yet — save a strategy to track it here.</Text>
      ) : (
        <Stack gap={3}>
          {goals.map((goal) => (
            <Flex key={goal.id} justify="space-between" align="center" wrap gap={2}>
              <Stack gap={0}>
                <Text weight="bold">{goal.name}</Text>
                <Text variant="caption" color="muted">{money(goal.targetAmount)} down payment</Text>
              </Stack>
              <Button
                size="sm"
                variant="primary"
                data-testid="pg-view-plan"
                onClick={() => viewPlan(goal.id)}
              >
                View plan
              </Button>
            </Flex>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
