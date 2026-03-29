'use client';

import { useState } from 'react';
import { Avatar, Button, Card, Flex, Popover, Select, Stack, Text } from 'doom-design-system';
import { logout } from '@/app/actions/auth';
import { LogOut, User, FlaskConical, Calendar } from 'lucide-react';
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
    <Flex align="center" justify="space-between" className={styles.header}>
      <Flex align="center" gap={3}>
        <Calendar size={16} strokeWidth={2.5} className={styles.calendarIcon} />
        <Select
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value)}
          options={[...availableYears]
            .sort((a, b) => a - b)
            .map((year) => ({ value: year, label: year.toString() }))}
        />
      </Flex>

      <Popover
        trigger={
          <button
            className={styles.avatarTrigger}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="User menu"
          >
            <Avatar
              fallback={initials}
              size="sm"
              shape="circle"
            />
            {user?.is_sandbox && (
              <FlaskConical size={12} strokeWidth={2.5} className={styles.sandboxIndicator} />
            )}
          </button>
        }
        content={
          <Card className={styles.menuCard}>
            <Stack gap={0}>
              {user && (
                <Flex align="center" gap={3} className={styles.menuUser}>
                  <Avatar fallback={initials} size="md" shape="circle" />
                  <Stack gap={0}>
                    <Text weight="bold">{user.display_name}</Text>
                    <Text variant="caption" color="muted">{user.username}</Text>
                    {user.is_sandbox && (
                      <Flex align="center" gap={1}>
                        <FlaskConical size={10} strokeWidth={2.5} />
                        <Text variant="caption" color="warning" weight="semibold">Sandbox</Text>
                      </Flex>
                    )}
                  </Stack>
                </Flex>
              )}
              <button
                className={styles.menuItem}
                onClick={() => { logout(); setMenuOpen(false); }}
              >
                <LogOut size={16} strokeWidth={2.5} />
                <Text variant="small">Logout</Text>
              </button>
            </Stack>
          </Card>
        }
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        placement="bottom-end"
      />
    </Flex>
  );
}
