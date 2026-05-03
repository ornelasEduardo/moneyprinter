'use client';
import RuleList, { type RuleListItem } from '@/components/RuleList';

interface RulesClientProps {
  rules: RuleListItem[];
}

export default function RulesClient({ rules }: RulesClientProps) {
  return <RuleList rules={rules} />;
}
