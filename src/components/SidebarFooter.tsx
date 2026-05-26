'use client';

import { useState } from 'react';
import { Avatar, Card, Chip, Flex, Popover, Stack, Text } from 'doom-design-system';
import { logout } from '@/app/actions/auth';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  LogOut,
} from 'lucide-react';
import type { SafeUser } from '@/lib/types';
import styles from './SidebarFooter.module.scss';

interface SidebarFooterProps {
  user: SafeUser | null;
  selectedYear: number;
  availableYears: number[];
  onYearChange: (year: string) => void;
}

type View = 'main' | 'year';

export default function SidebarFooter({
  user,
  selectedYear,
  availableYears,
  onYearChange,
}: SidebarFooterProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('main');

  const initials = user?.display_name
    ? user.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  function handleClose() {
    setOpen(false);
    setView('main');
  }

  function handleYearSelect(year: number) {
    onYearChange(year.toString());
    handleClose();
  }

  return (
    <Popover
      isOpen={open}
      onClose={handleClose}
      placement="right-end"
      offset={12}
      trigger={
        <button
          type="button"
          className={styles.trigger}
          onClick={() => setOpen((o) => !o)}
          aria-label="User menu"
        >
          <Avatar fallback={initials} size="sm" shape="circle" />
          <div className={styles.identity}>
            <span className={styles.name}>{user?.display_name ?? 'User'}</span>
            <span className={styles.email}>{user?.username ?? ''}</span>
          </div>
          <ChevronRight
            size={16}
            strokeWidth={2.5}
            className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          />
        </button>
      }
      content={
        <Card className={styles.menu} style={{ padding: 0 }}>
          {view === 'main' ? (
            <Stack key="main" gap={0} className={styles.viewMain}>
              <Stack gap={1} className={styles.menuHeader}>
                <Flex align="center" gap={3}>
                  <Avatar fallback={initials} size="md" shape="circle" />
                  <Stack gap={0}>
                    <Text weight="bold">{user?.display_name ?? 'User'}</Text>
                    <Text variant="caption" color="muted">
                      {user?.username ?? ''}
                    </Text>
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
                type="button"
                className={styles.menuRow}
                onClick={() => setView('year')}
              >
                <Calendar size={16} strokeWidth={2.5} className={styles.menuRowIcon} />
                <span className={styles.menuRowLabel}>Year</span>
                <span className={styles.menuRowValue}>{selectedYear}</span>
                <ChevronRight
                  size={14}
                  strokeWidth={2.5}
                  className={styles.menuRowChevron}
                />
              </button>
              <button
                type="button"
                className={`${styles.menuRow} ${styles.menuRowDestructive}`}
                onClick={() => {
                  logout();
                  handleClose();
                }}
              >
                <LogOut size={16} strokeWidth={2.5} className={styles.menuRowIcon} />
                <span className={styles.menuRowLabel}>Sign out</span>
              </button>
            </Stack>
          ) : (
            <Stack key="year" gap={0} className={styles.viewYear}>
              <div className={styles.subHeader}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => setView('main')}
                  aria-label="Back to menu"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>
                <Text weight="bold">Select Year</Text>
              </div>
              <div className={styles.yearList}>
                {[...availableYears]
                  .sort((a, b) => b - a)
                  .map((year) => {
                    const isActive = year === selectedYear;
                    return (
                      <button
                        key={year}
                        type="button"
                        className={`${styles.menuRow} ${isActive ? styles.menuRowActive : ''}`}
                        onClick={() => handleYearSelect(year)}
                      >
                        <span className={styles.menuRowLabel}>{year}</span>
                        {isActive && (
                          <Check
                            size={14}
                            strokeWidth={2.5}
                            className={styles.menuRowCheck}
                          />
                        )}
                      </button>
                    );
                  })}
              </div>
            </Stack>
          )}
        </Card>
      }
    />
  );
}
