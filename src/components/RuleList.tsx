'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Flex,
  Modal,
  Spinner,
  Table,
  Text,
  useToast,
} from 'doom-design-system';
import { Pencil, Trash2, Wand } from 'lucide-react';
import {
  deleteRule,
  applyRuleToHistory,
  previewRuleAgainstHistory,
} from '@/app/actions/rules';

export interface RuleListItem {
  id: number;
  name: string;
  enabled: boolean;
  priority: number;
  matchCount?: number;
}

interface RuleListProps {
  rules: RuleListItem[];
}

export default function RuleList({ rules }: RuleListProps) {
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();

  const [deleting, setDeleting] = useState<RuleListItem | null>(null);
  const [stripApplications, setStripApplications] = useState(false);
  const [applying, setApplying] = useState<RuleListItem | null>(null);
  const [previewCount, setPreviewCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const openApply = async (rule: RuleListItem) => {
    setApplying(rule);
    setBusy(true);
    try {
      const { matches } = await previewRuleAgainstHistory(rule.id);
      setPreviewCount(matches.length);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Preview failed';
      toastError(message);
      setApplying(null);
    } finally {
      setBusy(false);
    }
  };

  const confirmApply = async () => {
    if (!applying) return;
    setBusy(true);
    try {
      const { applied } = await applyRuleToHistory(applying.id);
      toastSuccess(`Applied to ${applied} transactions`);
      setApplying(null);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Apply failed';
      toastError(message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteRule(deleting.id, { stripApplications });
      toastSuccess('Rule deleted');
      setDeleting(null);
      setStripApplications(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toastError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <Flex justify="space-between" align="center" className="mb-4">
          <Text variant="h4">Categorization rules</Text>
          <Button onClick={() => router.push('/rules/new')}>New Rule</Button>
        </Flex>
        <Table
          data={rules}
          columns={[
            {
              accessorKey: 'name',
              header: 'Name',
              cell: (info) => (
                <Flex align="center" gap={2}>
                  <Wand size={14} />
                  <Text weight="medium">{info.getValue() as string}</Text>
                  {!info.row.original.enabled && (
                    <Badge variant="secondary" className="text-xs">disabled</Badge>
                  )}
                </Flex>
              ),
            },
            {
              accessorKey: 'priority',
              header: 'Priority',
              cell: (info) => <Text>{info.getValue() as number}</Text>,
            },
            {
              accessorKey: 'matchCount',
              header: 'Matches',
              cell: (info) => {
                const v = info.getValue() as number | undefined;
                return <Text color="muted">{v == null ? '—' : `${v} transactions`}</Text>;
              },
            },
            {
              id: 'actions',
              header: '',
              cell: (info) => (
                <Flex gap={2} justify="flex-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openApply(info.row.original)}
                    aria-label="Apply to history"
                  >
                    Apply to history
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/rules/${info.row.original.id}`)}
                    aria-label="Edit rule"
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleting(info.row.original)}
                    aria-label="Delete rule"
                  >
                    <Trash2 size={16} />
                  </Button>
                </Flex>
              ),
            },
          ]}
          variant="flat"
        />
      </Card>

      {applying && (
        <Modal isOpen={true} onClose={() => setApplying(null)}>
          <Modal.Header>
            <Text variant="h5" style={{ color: 'inherit' }}>Apply to history</Text>
          </Modal.Header>
          <Modal.Body>
            {busy ? (
              <Flex align="center" gap={2}><Spinner size="sm" /> <Text>Counting…</Text></Flex>
            ) : (
              <Text>{previewCount} matching transactions. Apply this rule to all of them?</Text>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Flex justify="flex-end" gap={4}>
              <Button variant="ghost" onClick={() => setApplying(null)} disabled={busy}>Cancel</Button>
              <Button onClick={confirmApply} disabled={busy || previewCount === 0}>Apply</Button>
            </Flex>
          </Modal.Footer>
        </Modal>
      )}

      {deleting && (
        <Modal isOpen={true} onClose={() => setDeleting(null)}>
          <Modal.Header>
            <Text variant="h5" style={{ color: 'inherit' }}>Delete rule</Text>
          </Modal.Header>
          <Modal.Body>
            <Flex direction="column" gap={3}>
              <Text>
                Delete &quot;{deleting.name}&quot;? Past tags applied by this rule will be kept and
                demoted to manual unless you opt to strip them.
              </Text>
              <Checkbox
                checked={stripApplications}
                onChange={(e) => setStripApplications(e.target.checked)}
                label="Also strip this rule's tags from transactions"
              />
            </Flex>
          </Modal.Body>
          <Modal.Footer>
            <Flex justify="flex-end" gap={4}>
              <Button
                variant="ghost"
                onClick={() => {
                  setDeleting(null);
                  setStripApplications(false);
                }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button onClick={confirmDelete} disabled={busy}>Delete</Button>
            </Flex>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}
