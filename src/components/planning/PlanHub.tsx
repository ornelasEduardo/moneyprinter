'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Sheet, Skeleton, Text, useToast } from 'doom-design-system';
import { Home, Plus, ArrowRight } from 'lucide-react';
import { GoalTracker } from '@/components/GoalTracker';
import { EmergencyFundCard } from './EmergencyFundCard';
import PlanGoalsList from './PlanGoalsList';
import { getPlanGoals, type PlanGoal } from '@/app/actions/planning';
import {
  PLAN_TOOLS,
  toolsByGroup,
  tabForKind,
  labelForKind,
  amountLabelForKind,
} from '@/lib/planning/tools';
import { money } from '@/lib/planning/format';
import { tabHref } from '@/lib/planning/nav';
import { useDialogFocusTrap } from '@/lib/useDialogFocusTrap';
import styles from './PlanHub.module.scss';

const TOOL_ICON = { home: Home };

// One tool today, so "New plan" opens it directly. With >1 tool this needs a
// picker — deriving from the registry keeps the CTA from silently routing to
// mortgage the day a second tool ships.
const soleTool = PLAN_TOOLS.length === 1 ? PLAN_TOOLS[0] : null;

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
  const { toastError } = useToast();
  const [plans, setPlans] = useState<PlanGoal[] | null>(null);
  const [error, setError] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const { setDialogNode, openFrom } = useDialogFocusTrap(allOpen);

  const load = useCallback(() => {
    setError(false);
    setPlans(null);
    let cancelled = false;
    getPlanGoals()
      .then((g) => { if (!cancelled) setPlans(g); })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setPlans([]);
        toastError("Couldn't load your saved plans.");
      });
    return () => { cancelled = true; };
  }, [toastError]);

  useEffect(() => load(), [load]);

  const go = (tab: string, goalId?: number) => router.push(tabHref(searchParams, tab, goalId));

  const startNew = () => { if (soleTool) go(soleTool.tab); };
  const eyebrow = `uppercase ${styles.eyebrow}`;

  // The primary goal already headlines Zone 1 — don't repeat it as a tile.
  const hubPlans = (plans ?? []).filter((p) => p.id !== goal?.id);
  const visiblePlans = hubPlans.slice(0, 6);
  const hasMore = hubPlans.length > 6;

  return (
    <div className={styles.hub} data-testid="plan-hub">
      <header className={styles.header}>
        <div>
          <Text variant="small" weight="bold" color="muted" className={eyebrow}>
            Your financial plan
          </Text>
          <Text variant="h1" weight="black" className="uppercase">Plan</Text>
        </div>
        {soleTool && (
          <Button variant="primary" onClick={startNew}>
            <Plus size={18} strokeWidth={2.5} /> New plan
          </Button>
        )}
      </header>

      {/* Zone 1 — where you stand */}
      <section aria-labelledby="hub-standing">
        <div className={styles.sectionHead}>
          <Text as="h2" id="hub-standing" variant="small" weight="bold" className={eyebrow}>
            Where you stand
          </Text>
        </div>
        <div className={styles.verdict}>
          {goal ? (
            <GoalTracker
              goal={goal}
              netWorth={netWorth}
              monthlySavings={monthlySavings}
              emergencyFund={emergencyFund}
            />
          ) : (
            <Card>
              <Text variant="small" weight="bold" color="muted" className={eyebrow}>Primary goal</Text>
              <Text variant="h3" weight="black" style={{ marginTop: 'var(--space-2)' }}>No goal set yet</Text>
              <Text color="muted" style={{ marginTop: 'var(--space-1)' }}>
                Set a primary goal to track your timeline and progress.
              </Text>
              {soleTool && (
                <Button variant="primary" onClick={startNew} style={{ marginTop: 'var(--space-4)' }}>
                  New plan
                </Button>
              )}
            </Card>
          )}
          <EmergencyFundCard target={emergencyFund} monthlyExpenses={monthlyExpenses} />
        </div>
      </section>

      {/* Zone 2 — your plans */}
      <section aria-labelledby="hub-plans">
        <div className={styles.sectionHead}>
          <Text as="h2" id="hub-plans" variant="small" weight="bold" className={eyebrow}>
            Your plans
          </Text>
          {hasMore && !error && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { openFrom(e); setAllOpen(true); }}
            >
              View all ({hubPlans.length})
            </Button>
          )}
        </div>
        <span className={styles.srOnly} role="status" aria-live="polite">
          {plans === null ? 'Loading your plans…' : error ? "Couldn't load your saved plans." : ''}
        </span>
        {error ? (
          <Card>
            <Text weight="bold">Couldn&apos;t load your saved plans.</Text>
            <Text color="muted" style={{ marginTop: 'var(--space-1)' }}>
              Something went wrong reaching your data.
            </Text>
            <Button variant="secondary" onClick={load} style={{ marginTop: 'var(--space-4)' }}>Retry</Button>
          </Card>
        ) : plans === null ? (
          <div className={styles.tiles} aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height="138px" variant="rectangular" />
            ))}
          </div>
        ) : (
          <div className={styles.tiles}>
            {visiblePlans.map((p) => (
              <button
                key={p.id}
                className={styles.tile}
                onClick={() => go(tabForKind(p.kind), p.id)}
                aria-label={`View plan ${p.name}, ${money(p.targetAmount)} ${amountLabelForKind(p.kind).toLowerCase()}`}
              >
                <span className={styles.kind}>{labelForKind(p.kind)}</span>
                <span className={styles.tileName}>{p.name}</span>
                <span className={styles.amount}>
                  {money(p.targetAmount)}
                  <small>{amountLabelForKind(p.kind)}</small>
                </span>
                <span className={styles.go}>
                  View plan <ArrowRight size={14} strokeWidth={2.5} />
                </span>
              </button>
            ))}
            {visiblePlans.length === 0 && soleTool && (
              <button
                className={`${styles.tile} ${styles.add}`}
                onClick={startNew}
                aria-label="New plan"
              >
                <Plus size={26} strokeWidth={2.5} />
                <span>New plan</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* Zone 3 — tools, grouped by life-area (registry-driven) */}
      {toolsByGroup().map(({ group, tools }) => (
        <section key={group} aria-label={`Tools: ${group}`}>
          <div className={styles.sectionHead}>
            <Text as="h2" variant="small" weight="bold" className={eyebrow}>
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
                  aria-label={`Open ${t.label}: ${t.description}`}
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

      {allOpen && (
        <Sheet isOpen={allOpen} onClose={() => setAllOpen(false)} title="Saved plans">
          <div ref={setDialogNode} tabIndex={-1}>
            <PlanGoalsList />
          </div>
        </Sheet>
      )}
    </div>
  );
}
