'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, Card, Text, Stack, Flex,
  Tabs, TabsList, TabsTrigger, TabsBody, TabsContent,
} from 'doom-design-system';
import { Download, Shield, X } from 'lucide-react';
import { EXPORTABLE_ENTITIES, formatBytes, type BackupHistoryEntry } from '@/lib/constants';
import { getBackupEstimate, recordBackup, dismissBackupReminder } from '@/app/actions/backup';
import ImportSpreadsheet from '@/components/ImportSpreadsheet';
import styles from './DataTab.module.scss';

interface DataTabProps {
  backupHistory: BackupHistoryEntry[];
  showBackupReminder: boolean;
  existingTransactions?: Record<string, unknown>[];
  accounts?: { id: number; name: string }[];
}

function toTitleCase(str: string): string {
  return str
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export default function DataTab({ backupHistory, showBackupReminder, existingTransactions, accounts }: DataTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Backup state
  const [backupEstimate, setBackupEstimate] = useState<{ totalRows: number; estimatedBytes: number; entities: Record<string, number> } | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);

  useEffect(() => {
    getBackupEstimate().then(setBackupEstimate).catch(() => null);
  }, []);

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    try {
      const filename = `moneyprinter-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      window.open('/api/export?format=zip&type=backup', '_blank');
      await recordBackup({
        date: new Date().toISOString(),
        filename,
        size: backupEstimate?.estimatedBytes ?? 0,
        entityCounts: backupEstimate?.entities ?? {},
      });
      router.refresh();
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDismissReminder = () => {
    setReminderDismissed(true);
    startTransition(async () => {
      await dismissBackupReminder();
    });
  };

  const showReminder = showBackupReminder && !reminderDismissed;

  return (
    <Stack gap={4}>
      {/* Backup Reminder */}
      {showReminder && (
        <Card className={styles.reminderCard}>
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={3}>
              <Shield size={20} strokeWidth={2.5} />
              <Text weight="bold">It&apos;s been a while since your last backup.</Text>
            </Flex>
            <Flex align="center" gap={2}>
              <Button size="sm" onClick={handleBackupNow} disabled={isBackingUp}>
                Backup Now
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDismissReminder} aria-label="Dismiss">
                <X size={16} strokeWidth={2.5} />
              </Button>
            </Flex>
          </Flex>
        </Card>
      )}

      <Tabs defaultValue="export">
        <TabsList>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        <TabsBody>
          {/* Export */}
          <TabsContent value="export">
            <Stack gap={4}>
              <Text color="muted">Download your data as CSV or JSON for each entity, or grab everything at once.</Text>

              <Stack gap={0}>
                {EXPORTABLE_ENTITIES.map((entity) => (
                  <div key={entity} className={styles.entityRow}>
                    <Flex align="center" justify="space-between">
                      <Text weight="bold">{toTitleCase(entity)}</Text>
                      <Flex gap={2}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`/api/export?entity=${entity}&format=csv`, '_blank')}
                        >
                          CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`/api/export?entity=${entity}&format=json`, '_blank')}
                        >
                          JSON
                        </Button>
                      </Flex>
                    </Flex>
                  </div>
                ))}
              </Stack>

              <Button onClick={() => window.open('/api/export?format=zip', '_blank')}>
                <Download size={16} strokeWidth={2.5} />
                Download All (.zip)
              </Button>
            </Stack>
          </TabsContent>

          {/* Import */}
          <TabsContent value="import">
            <ImportSpreadsheet
              existingTransactions={existingTransactions}
              accounts={accounts}
            />
          </TabsContent>

          {/* Backup */}
          <TabsContent value="backup">
            <Stack gap={4}>
              <Text color="muted">Create a full archive of all your data for safekeeping.</Text>

              {backupEstimate && (
                <Card className={styles.estimateCard}>
                  <Flex gap={6}>
                    <Stack gap={0}>
                      <Text variant="small" color="muted">Estimated size</Text>
                      <Text weight="bold">{formatBytes(backupEstimate.estimatedBytes)}</Text>
                    </Stack>
                    <Stack gap={0}>
                      <Text variant="small" color="muted">Total rows</Text>
                      <Text weight="bold">{backupEstimate.totalRows}</Text>
                    </Stack>
                  </Flex>
                </Card>
              )}

              <Button onClick={handleBackupNow} disabled={isBackingUp}>
                <Shield size={16} strokeWidth={2.5} />
                {isBackingUp ? 'Saving...' : 'Backup Now'}
              </Button>

              {backupHistory.length > 0 && (
                <Stack gap={2}>
                  <Text weight="bold">Backup History</Text>
                  <Stack gap={0}>
                    {backupHistory.map((entry, i) => (
                      <div key={i} className={styles.historyRow}>
                        <Flex align="center" justify="space-between">
                          <Stack gap={0}>
                            <Text variant="small" weight="bold">{entry.filename}</Text>
                            <Text variant="caption" color="muted">
                              {new Date(entry.date).toLocaleDateString()} — {formatBytes(entry.size)}
                            </Text>
                          </Stack>
                        </Flex>
                      </div>
                    ))}
                  </Stack>
                </Stack>
              )}
            </Stack>
          </TabsContent>
        </TabsBody>
      </Tabs>
    </Stack>
  );
}
