'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, Card, Text, Stack, Flex, Badge, FileUpload, Select,
  Tabs, TabsList, TabsTrigger, TabsBody, TabsContent,
} from 'doom-design-system';
import { Download, Upload, Shield, X } from 'lucide-react';
import { EXPORTABLE_ENTITIES, formatBytes, type BackupHistoryEntry, type ImportValidationResult, type ConflictReport } from '@/lib/constants';
import { validateImport, commitImportAction } from '@/app/actions/import';
import { getBackupEstimate, recordBackup, dismissBackupReminder } from '@/app/actions/backup';
import styles from './DataTab.module.scss';

interface DataTabProps {
  backupHistory: BackupHistoryEntry[];
  showBackupReminder: boolean;
}

function toTitleCase(str: string): string {
  return str
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export default function DataTab({ backupHistory, showBackupReminder }: DataTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Import state
  const [importEntity, setImportEntity] = useState<string>(EXPORTABLE_ENTITIES[0] ?? 'accounts');
  const [importValidation, setImportValidation] = useState<ImportValidationResult | null>(null);
  const [importConflicts, setImportConflicts] = useState<ConflictReport | null>(null);
  const [conflictMode, setConflictMode] = useState<'skip' | 'overwrite'>('skip');
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Backup state
  const [backupEstimate, setBackupEstimate] = useState<{ totalRows: number; estimatedBytes: number; entities: Record<string, number> } | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);

  useEffect(() => {
    getBackupEstimate().then(setBackupEstimate).catch(() => null);
  }, []);

  const handleFileSelect = async (file: File) => {
    setImportResult(null);
    setImportError(null);
    setImportValidation(null);
    setImportConflicts(null);
    setIsValidating(true);
    try {
      const text = await file.text();
      const { validation, conflicts } = await validateImport(importEntity, text);
      setImportValidation(validation);
      setImportConflicts(conflicts);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importValidation) return;
    setIsCommitting(true);
    try {
      const result = await commitImportAction(importEntity, importValidation.valid, conflictMode);
      setImportResult(result);
      setImportValidation(null);
      setImportConflicts(null);
      router.refresh();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsCommitting(false);
    }
  };

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
            <Stack gap={4}>
              <Text color="muted">Upload a CSV file to add data for a specific entity.</Text>

              <Select
                label="Entity"
                value={importEntity}
                onChange={(e) => {
                  setImportEntity(e.target.value);
                  setImportValidation(null);
                  setImportConflicts(null);
                  setImportResult(null);
                  setImportError(null);
                }}
                options={EXPORTABLE_ENTITIES.map((e) => ({ value: e, label: toTitleCase(e) }))}
              />

              <FileUpload
                accept=".csv"
                label="Upload CSV"
                onChange={(files) => {
                  if (files[0]) handleFileSelect(files[0]);
                }}
              />

              {isValidating && <Text color="muted">Validating...</Text>}

              {importError && (
                <Card className={styles.resultCard}>
                  <Text color="error">{importError}</Text>
                </Card>
              )}

              {importValidation && (
                <Card className={styles.previewCard}>
                  <Stack gap={3}>
                    <Flex gap={2} align="center">
                      <Text weight="bold">Preview</Text>
                      <Badge variant="success">{importValidation.valid.length} valid</Badge>
                      {importValidation.errors.length > 0 && (
                        <Badge variant="error">{importValidation.errors.length} errors</Badge>
                      )}
                    </Flex>
                    <Text color="muted">
                      {importValidation.total} rows total, {importValidation.valid.length} will be imported.
                    </Text>

                    {importValidation.errors.length > 0 && (
                      <Stack gap={1}>
                        {importValidation.errors.slice(0, 5).map((err, i) => (
                          <Text key={i} color="error" variant="small">
                            Row {err.row} — {err.field}: {err.message}
                          </Text>
                        ))}
                        {importValidation.errors.length > 5 && (
                          <Text color="muted" variant="small">
                            ...and {importValidation.errors.length - 5} more errors
                          </Text>
                        )}
                      </Stack>
                    )}

                    {importConflicts && importConflicts.existingCount > 0 && (
                      <Stack gap={2}>
                        <Text weight="bold" color="warning">
                          {importConflicts.existingCount} conflict{importConflicts.existingCount !== 1 ? 's' : ''} detected
                        </Text>
                        <Select
                          label="Conflict resolution"
                          value={conflictMode}
                          onChange={(e) => setConflictMode(e.target.value as 'skip' | 'overwrite')}
                          options={[
                            { value: 'skip', label: 'Skip existing records' },
                            { value: 'overwrite', label: 'Overwrite existing records' },
                          ]}
                        />
                      </Stack>
                    )}

                    {importValidation.valid.length > 0 && (
                      <Button onClick={handleCommitImport} disabled={isCommitting}>
                        {isCommitting ? 'Importing...' : `Import ${importValidation.valid.length} records`}
                      </Button>
                    )}
                  </Stack>
                </Card>
              )}

              {importResult && (
                <Card className={styles.resultCard}>
                  <Flex gap={3}>
                    <Badge variant="success">{importResult.created} created</Badge>
                    {importResult.updated > 0 && <Badge variant="secondary">{importResult.updated} updated</Badge>}
                    {importResult.skipped > 0 && <Badge variant="outline">{importResult.skipped} skipped</Badge>}
                  </Flex>
                </Card>
              )}
            </Stack>
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
