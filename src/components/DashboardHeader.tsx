'use client';

import { logout } from '@/app/actions/auth';
import { useDashboardStore } from '@/lib/store';
import { Button, Flex, Select, Text } from '@design-system';
import { User, LogOut, FlaskConical } from 'lucide-react';

interface DashboardHeaderProps {
  selectedYear: number;
  onYearChange: (year: string) => void;
}

export default function DashboardHeader({ selectedYear, onYearChange }: DashboardHeaderProps) {
  const user = useDashboardStore(state => state.user);
  const availableYears = useDashboardStore(state => state.availableYears);
  
  return (
    <Flex 
      justify="space-between" 
      align="center" 
      className="relative z-40 mb-8"
    >
      <Flex gap="1rem" align="center">
        <Text variant="h1" className="uppercase">
          MoneyPrinter
        </Text>

        <div className="w-32 mt-2 align-self-start">
          <Select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            options={availableYears.map(year => ({ value: year, label: year.toString() }))}
          />
        </div>
      </Flex>
      
      <Flex gap="1rem" align="center">
        {user && (
          <Flex
            align="center"
            gap="0.5rem"
            style={{
              padding: '0.5rem 1rem',
              border: 'var(--border-width) solid var(--card-border)',
              borderRadius: 'var(--radius)',
              backgroundColor: user.is_sandbox ? 'var(--warning)' : 'var(--primary)',
              color: user.is_sandbox ? '#000000' : 'var(--primary-foreground)',
            }}
          >
            {user.is_sandbox ? <FlaskConical size={18} strokeWidth={2.5} /> : <User size={18} strokeWidth={2.5} />}
            <Text weight="bold" style={{ color: 'inherit' }}>{user.display_name}</Text>
          </Flex>
        )}

        <Button
          variant="secondary"
          onClick={() => logout()}
        >
          <LogOut size={18} strokeWidth={2.5} />
          <span>Logout</span>
        </Button>
      </Flex>
    </Flex>
  );
}
