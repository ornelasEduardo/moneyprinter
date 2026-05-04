'use client';
import RuleList, { type RuleListItem } from '@/components/RuleList';
import BackLink from '@/components/BackLink';

interface RulesClientProps {
  rules: RuleListItem[];
}

export default function RulesClient({ rules }: RulesClientProps) {
  return (
    <>
      <BackLink href="/" />
      <RuleList rules={rules} />
    </>
  );
}
