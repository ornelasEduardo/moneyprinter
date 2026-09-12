"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  updatePrimaryGoal,
  updateEmergencyFundAmount,
} from "@/app/actions/goals";
import { moneyCompact } from "@/lib/planning/format";
import { tabForKind } from "@/lib/planning/tools";
import { tabHref } from "@/lib/planning/nav";
import styles from "./GoalTracker.module.scss";
import {
  Button,
  Card,
  Flex,
  Grid,
  Input,
  ProgressBar,
  Spinner,
  Text,
  Tooltip,
} from "doom-design-system";
import { X, Pencil } from "lucide-react";

interface GoalTrackerProps {
  netWorth: number;
  monthlySavings: number;
  goal: {
    id: number;
    name: string;
    target_amount: number;
    plan_kind?: string | null;
  } | null;
  emergencyFund: number;
}

export function GoalTracker({
  netWorth,
  monthlySavings,
  goal,
  emergencyFund,
}: GoalTrackerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [goalName, setGoalName] = useState(goal?.name || "Financial Freedom");
  const [targetAmount, setTargetAmount] = useState(
    goal?.target_amount?.toString() || "1000000"
  );
  const [emergencyFundAmount, setEmergencyFundAmount] = useState(
    emergencyFund?.toString() || "10000"
  );

  const availableForGoal = Math.max(
    0,
    netWorth - parseFloat(emergencyFundAmount)
  );
  const target = parseFloat(targetAmount) || 1;
  const progress = Math.min((availableForGoal / target) * 100, 100);

  const remainingAmount = Math.max(0, target - availableForGoal);
  const monthsToGoal =
    monthlySavings > 0 ? Math.ceil(remainingAmount / monthlySavings) : 999;
  const yearsToGoal = Math.floor(monthsToGoal / 12);
  const remainingMonths = monthsToGoal % 12;

  const handleViewPlan = () => {
    if (!goal) return;
    // Clone current params so year/etc. survive the jump, matching
    // DashboardClient's own `/?tab=...` navigation idiom.
    router.push(tabHref(searchParams, tabForKind(goal.plan_kind ?? "mortgage"), goal.id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updatePrimaryGoal(goalName, parseFloat(targetAmount)),
        updateEmergencyFundAmount(parseFloat(emergencyFundAmount)),
      ]);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save goal settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <Card>
        <Flex direction="column" gap={4}>
          <Flex justify="space-between" align="center">
            <Text variant="h3">Edit Goal Settings</Text>
            <Button
              variant="ghost"
              onClick={() => setIsEditing(false)}
              className="p-1"
            >
              <X size={16} strokeWidth={2.5} />
            </Button>
          </Flex>

          <Grid columns="1fr 1fr" gap={4}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Input
                label="Goal Name"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g. Buy a House"
              />
            </div>

            <div>
              <Input
                label="Target Amount"
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                startAdornment="$"
              />
            </div>

            <div>
              <Input
                label="Emergency Fund (Reserved)"
                type="number"
                value={emergencyFundAmount}
                onChange={(e) => setEmergencyFundAmount(e.target.value)}
                startAdornment="$"
              />
            </div>
          </Grid>

          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Spinner size="sm" /> Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </Flex>
      </Card>
    );
  }

  return (
    <Card className="relative">
      <Tooltip content="Edit Goal">
        <Button
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className={`absolute top-4 right-4 p-2 text-muted ${styles.editBtn}`}
          aria-label="Edit Goal"
        >
          <Pencil size={16} strokeWidth={2.5} />
        </Button>
      </Tooltip>

      <Flex direction="column" gap={4} className="pr-10 mr-2">
        <Flex justify="space-between" align="center" wrap>
          <Text
            variant="small"
            weight="bold"
            color="muted"
            className="uppercase"
            style={{ letterSpacing: "0.12em" }}
          >
            Goal Tracker: {goalName}
          </Text>
          {goal?.plan_kind != null && (
            <Button
              size="sm"
              variant="ghost"
              data-testid="gt-view-plan"
              onClick={handleViewPlan}
            >
              View plan
            </Button>
          )}
        </Flex>

        <div>
          {progress >= 100 ? (
            <Text variant="h1" as="span" style={{ color: "var(--primary-hover)" }}>
              GOAL REACHED
            </Text>
          ) : monthlySavings > 0 ? (
            <>
              <Flex align="baseline" gap={2} wrap>
                {yearsToGoal > 0 && (
                  <Text variant="h1" as="span" style={{ color: "var(--primary-hover)" }}>
                    {yearsToGoal} YEARS,{" "}
                  </Text>
                )}
                <Text variant="h1" as="span">
                  {remainingMonths} MONTHS
                </Text>
              </Flex>
              <Text variant="h3" as="div" className="mt-1">
                TO REACH GOAL
              </Text>
            </>
          ) : (
            <Text variant="h3" as="div">
              Add monthly savings to project a timeline
            </Text>
          )}
        </div>

        <div className="mt-4">
          <Flex justify="space-between" className="mb-2">
            <Text
              variant="caption"
              weight="bold"
              className="uppercase"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              Available: {moneyCompact(availableForGoal)}
              <Text
                as="span"
                variant="caption"
                color="muted"
                weight="normal"
                className="ml-2"
              >
                (Reserved: {moneyCompact(parseFloat(emergencyFundAmount))})
              </Text>
            </Text>
            <Text
              variant="caption"
              weight="bold"
              className="uppercase"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              Target: {moneyCompact(target)} ({Math.round(progress)}%)
            </Text>
          </Flex>
          <ProgressBar value={progress} aria-label={`Progress toward ${goalName}`} />
        </div>
      </Flex>
    </Card>
  );
}
