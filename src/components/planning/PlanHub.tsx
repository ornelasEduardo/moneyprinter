'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Sheet, Text } from 'doom-design-system';
import { Home, Plus, ArrowRight } from 'lucide-react';
import { GoalTracker } from '@/components/GoalTracker';
import { EmergencyFundCard } from './EmergencyFundCard';
import PlanGoalsList from './PlanGoalsList';
import { getPlanGoals } from '@/app/actions/planning';
import { toolsByGroup } from '@/lib/planning/tools';
import { money } from '@/lib/planning/format';
import styles from './PlanHub.module.scss';

const TOOL_ICON = { home: Home };
type PlanGoal = Awaited<ReturnType<typeof getPlanGoals>>[number];

interface PlanHubProps {
  goal: { id: number; name: string; target_amount: number; plan_kind?: string | null } | null;
  emergencyFund: number;
  netWorth: number;
  monthlySavings: number;
  monthlyExpenses: number;
}

export default function PlanHub({
  goal,
  emergencyFund,
  netWorth,
  monthlySavings,
  monthlyExpenses,
}: PlanHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<PlanGoal[] | null>(null);
  const [allOpen, setAllOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPlanGoals()
      .then((g) => { if (!cancelled) setPlans(g); })
      .catch(() => { if (!cancelled) setPlans([]); });
    return () => { cancelled = true; };
  }, []);

  // Clone current params so year/etc. survive the jump — DashboardClient's idiom.
  const go = (tab: string, goalId?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    if (goalId != null) params.set('goal', String(goalId));
    else params.delete('goal');
    router.push(`/?${params.toString()}`);
  };

  const visiblePlans = plans ? plans.slice(0, 6) : [];
  const hasMore = (plans?.length ?? 0) > 6;

  return (
    <div className={styles.hub} data-testid="plan-hub">
      <header className={styles.header}>
        <div>
          <Text variant="small" weight="bold" color="muted" className="uppercase tracking-widest">
            Your financial plan
          </Text>
          <Text variant="h1" weight="black" className="uppercase">Plan</Text>
        </div>
        <Button variant="primary" onClick={() => go('mortgage')}>
          <Plus size={18} strokeWidth={2.5} /> New plan
        </Button>
      </header>

      {/* Zone 1 — where you stand */}
      <section className={styles.verdict} aria-label="Where you stand">
        <GoalTracker
          goal={goal}
          netWorth={netWorth}
          monthlySavings={monthlySavings}
          emergencyFund={emergencyFund}
        />
        <EmergencyFundCard target={emergencyFund} monthlyExpenses={monthlyExpenses} />
      </section>

      {/* Zone 2 — your plans */}
      <section aria-label="Your plans">
        <div className={styles.sectionHead}>
          <Text as="h2" variant="small" weight="bold" className="uppercase tracking-widest">
            Your plans
          </Text>
          {hasMore && (
            <Button size="sm" variant="ghost" onClick={() => setAllOpen(true)}>
              View all ({plans?.length})
            </Button>
          )}
        </div>
        {plans === null ? (
          <div className={styles.tiles} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${styles.tile} ${styles.skeleton}`} />
            ))}
          </div>
        ) : (
          <div className={styles.tiles}>
            {visiblePlans.map((p) => (
              <button
                key={p.id}
                className={styles.tile}
                onClick={() => go('mortgage', p.id)}
                aria-label={`Open plan ${p.name}`}
              >
                <span className={styles.kind}>{p.kind}</span>
                <span className={styles.tileName}>{p.name}</span>
                <span className={styles.amount}>
                  {money(p.targetAmount)}
                  <small>Down payment</small>
                </span>
                <span className={styles.go}>
                  Continue <ArrowRight size={14} strokeWidth={2.5} />
                </span>
              </button>
            ))}
            <button
              className={`${styles.tile} ${styles.add}`}
              onClick={() => go('mortgage')}
              aria-label="Save a new plan"
            >
              <Plus size={26} strokeWidth={2.5} />
              <span>Save a new plan</span>
            </button>
          </div>
        )}
      </section>

      {/* Zone 3 — tools, grouped by life-area (registry-driven) */}
      {toolsByGroup().map(({ group, tools }) => (
        <section key={group} aria-label={`Tools: ${group}`}>
          <div className={styles.sectionHead}>
            <Text as="h2" variant="small" weight="bold" className="uppercase tracking-widest">
              Tools · <span className={styles.cat}>{group}</span>
            </Text>
          </div>
          <div className={styles.toolRow}>
            {tools.map((t) => {
              const Icon = TOOL_ICON[t.icon];
              return (
                <button
                  key={t.kind}
                  className={styles.tool}
                  onClick={() => go(t.tab)}
                  aria-label={`Open ${t.label}`}
                >
                  <span className={styles.toolIco}><Icon size={22} strokeWidth={2.5} /></span>
                  <span className={styles.toolBody}>
                    <span className={styles.toolName}>{t.label}</span>
                    <span className={styles.toolDesc}>{t.description}</span>
                    <span className={styles.go}>Open <ArrowRight size={14} strokeWidth={2.5} /></span>
                  </span>
                </button>
              );
            })}
            <div className={`${styles.tool} ${styles.soon}`}>
              <span className={styles.toolIco}><Plus size={22} strokeWidth={2.5} /></span>
              <span className={styles.toolBody}>
                <span className={styles.toolName}>More soon</span>
                <span className={styles.toolDesc}>
                  Refinance and affordability tools slot in here as they ship.
                </span>
              </span>
            </div>
          </div>
        </section>
      ))}

      <Sheet isOpen={allOpen} onClose={() => setAllOpen(false)} title="Saved plans">
        <PlanGoalsList />
      </Sheet>
    </div>
  );
}
