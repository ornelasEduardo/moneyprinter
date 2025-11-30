'use client';

import { useState } from 'react';
import { updatePrimaryGoal, updateEmergencyFundAmount } from '@/app/actions/goals';
import { Button, Card, Flex, Grid, Input, ProgressBar, Text } from '@design-system';
import { X, Pencil } from 'lucide-react';

interface GoalTrackerProps {
  netWorth: number;
  monthlySavings: number;
  goal: {
    name: string;
    target_amount: number;
  } | null;
  emergencyFund: number;
}

export function GoalTracker({ netWorth, monthlySavings, goal, emergencyFund }: GoalTrackerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [goalName, setGoalName] = useState(goal?.name || 'Financial Freedom');
  const [targetAmount, setTargetAmount] = useState(goal?.target_amount?.toString() || '1000000');
  const [emergencyFundAmount, setEmergencyFundAmount] = useState(emergencyFund?.toString() || '10000');

  const availableForGoal = Math.max(0, netWorth - parseFloat(emergencyFundAmount));
  const target = parseFloat(targetAmount) || 1;
  const progress = Math.min((availableForGoal / target) * 100, 100);
  
  const remainingAmount = Math.max(0, target - availableForGoal);
  const monthsToGoal = monthlySavings > 0 ? Math.ceil(remainingAmount / monthlySavings) : 999;
  const yearsToGoal = Math.floor(monthsToGoal / 12);
  const remainingMonths = monthsToGoal % 12;

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updatePrimaryGoal(goalName, parseFloat(targetAmount)),
        updateEmergencyFundAmount(parseFloat(emergencyFundAmount))
      ]);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save goal settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <Card>
        <Flex direction="column" gap="1rem">
          <Flex justify="space-between" align="center">
            <Text variant="h3">Edit Goal Settings</Text>
            <Button variant="ghost" onClick={() => setIsEditing(false)} className="p-1">
              <X size={16} strokeWidth={2.5} />
            </Button>
          </Flex>
          
          <Grid columns="1fr 1fr" gap="1rem">
            <div className="col-span-full">
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

          <Button variant="primary" onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Flex>
      </Card>
    );
  }

  return (
    <Card className="relative">
      <Button 
        variant="ghost" 
        onClick={() => setIsEditing(true)}
        className="absolute top-4 right-4 p-2 text-muted"
      >
        <Pencil size={16} strokeWidth={2.5} />
      </Button>

      <Flex direction="column" gap="1rem">
        <Text variant="small" weight="bold" color="muted" className="uppercase tracking-widest">
          Goal Tracker: {goalName}
        </Text>
        
        <div className="leading-none">
          <Flex align="baseline" gap="0.5rem" wrap>
            {yearsToGoal > 0 && (
              <>
                <Text variant="h1" color='primary'>{yearsToGoal} YEARS</Text>
                <Text variant="h1">,</Text>
              </>
            )}
            <Text variant="h1">{remainingMonths} MONTHS</Text>
          </Flex>
          <Text variant="h3" as="div" className="mt-1">TO REACH GOAL</Text>
        </div>

        <div className="mt-4">
          <Flex justify="space-between" className="mb-2">
            <Text variant="caption" weight="bold" className="uppercase">
              Available: ${(availableForGoal / 1000).toFixed(1)}k 
              <Text as="span" variant="caption" color="muted" weight="normal" className="ml-2">
                (Reserved: ${(parseFloat(emergencyFundAmount) / 1000).toFixed(1)}k)
              </Text>
            </Text>
            <Text variant="caption" weight="bold" className="uppercase">
              Target: ${(target / 1000).toFixed(1)}k ({Math.round(progress)}%)
            </Text>
          </Flex>
          <ProgressBar value={progress} />
        </div>
      </Flex>
    </Card>
  );
}
