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
      <Flex align="center" gap={3} className={styles.yearControl}>
        <Text variant="caption" weight="bold" color="muted" className="uppercase">
          Fiscal Year
        </Text>
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

      <Popover
        trigger={
          <button
            className={styles.profileTrigger}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="User menu"
          >
            <Avatar fallback={initials} size="sm" shape="square" />
            <Stack gap={0} className={styles.profileText}>
              <Text variant="caption" weight="bold">{user?.display_name ?? 'User'}</Text>
              {user?.is_sandbox ? (
                <Text variant="caption" color="warning" weight="semibold">Sandbox</Text>
              ) : (
                <Text variant="caption" color="muted">Personal</Text>
              )}
            </Stack>
            <ChevronDown
              size={14}
              strokeWidth={2.5}
              className={`${styles.chevron} ${menuOpen ? styles.chevronOpen : ''}`}
            />
          </button>
        }
        content={
          <Card className={styles.dropdown}>
            <Stack gap={0}>
              <Stack gap={1} className={styles.dropdownHeader}>
                <Flex align="center" gap={3}>
                  <Avatar fallback={initials} size="md" shape="square" />
                  <Stack gap={0}>
                    <Text weight="bold">{user?.display_name}</Text>
                    <Text variant="caption" color="muted">{user?.username}</Text>
                  </Stack>
                </Flex>
                {user?.is_sandbox && (
                  <Chip variant="warning" size="xs">
                    <FlaskConical size={10} strokeWidth={2.5} />
                    Sandbox Mode
                  </Chip>
                )}
              </Stack>
              <button
                className={styles.dropdownAction}
                onClick={() => { logout(); setMenuOpen(false); }}
              >
                <LogOut size={16} strokeWidth={2.5} />
                <Text variant="small" weight="medium">Sign out</Text>
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
