'use client';

import { useState } from 'react';
import { Avatar, Card, Chip, Flex, Popover, Select, Stack, Text } from 'doom-design-system';
import { logout } from '@/app/actions/auth';
import { LogOut, FlaskConical, ChevronDown } from 'lucide-react';
import type { SafeUser } from '@/lib/types';
import styles from './AppHeader.module.scss';

interface AppHeaderProps {
  user: SafeUser | null;
  selectedYear: number;
  availableYears: number[];
  onYearChange: (year: string) => void;
}

export default function AppHeader({ user, selectedYear, availableYears, onYearChange }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user?.display_name
    ? user.display_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className={styles.bar}>
      {/* Left: Year selector */}
      <Flex align="center" gap={3}>
        <Text variant="caption" weight="bold" className={`${styles.label} uppercase`}>Year</Text>
        <div className={styles.yearSelect}>
          <Select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            options={[...availableYears]
              .sort((a, b) => a - b)
              .map((year) => ({ value: year, label: year.toString() }))}
          />
        </div>
      </Flex>

      {/* Right: User */}
      <Popover
        trigger={
          <button
            className={styles.userTrigger}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="User menu"
          >
            <Avatar fallback={initials} size="sm" shape="square" />
            <Flex direction="column" align="flex-start" gap={0} className={styles.userInfo}>
              <Text variant="caption" weight="bold">{user?.display_name ?? 'User'}</Text>
              {user?.is_sandbox && (
                <Chip variant="warning" size="xs">
                  <FlaskConical size={10} strokeWidth={2.5} />
                  Sandbox
                </Chip>
              )}
            </Flex>
            <ChevronDown size={14} strokeWidth={2.5} className={styles.chevron} />
          </button>
        }
        content={
          <Card className={styles.menu}>
            <Stack gap={0}>
              <Flex direction="column" gap={0} className={styles.menuHeader}>
                <Text weight="bold">{user?.display_name}</Text>
                <Text variant="caption" color="muted">{user?.username}</Text>
              </Flex>
              <button
                className={styles.menuAction}
                onClick={() => { logout(); setMenuOpen(false); }}
              >
                <LogOut size={16} strokeWidth={2.5} />
                <Text variant="small" weight="medium">Logout</Text>
              </button>
            </Stack>
          </Card>
        }
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        placement="bottom-end"
      />
    </header>
  );
}
