'use client';

import { useState, type MouseEvent } from 'react';
import { Badge, Button, Card, Flex, Input, Sheet, Spinner, Stack, Text, useToast } from 'doom-design-system';
import { Sparkles } from 'lucide-react';
import { suggestCategories, applyCategory, type CategorySuggestionRow } from '@/app/actions/llm';
import { money } from '@/lib/planning/format';
import { useDialogFocusTrap } from '@/lib/useDialogFocusTrap';
import styles from './CategorySuggestions.module.scss';

const NUMERIC = { fontVariantNumeric: 'tabular-nums' as const };

export default function CategorySuggestions() {
  const { toastError, toastSuccess } = useToast();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CategorySuggestionRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const { setDialogNode, openFrom } = useDialogFocusTrap(open);

  const run = async () => {
    setLoading(true);
    setRows(null);
    try {
      const r = await suggestCategories();
      setRows(r);
      setEdits(Object.fromEntries(r.map((x) => [x.id, x.suggestion.category])));
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Couldn't get suggestions.");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const start = (e?: MouseEvent) => {
    openFrom(e);
    setOpen(true);
    run();
  };

  const apply = async (id: number) => {
    const tag = (edits[id] ?? '').trim();
    if (!tag) return;
    try {
      await applyCategory(id, tag);
      setRows((prev) => prev?.filter((r) => r.id !== id) ?? null);
      toastSuccess(`Tagged as “${tag}”.`);
    } catch {
      toastError("Couldn't apply that category.");
    }
  };

  return (
    <Card className={styles.bar}>
      <div>
        <Text weight="bold">Suggest categories with local AI</Text>
        <Text variant="caption" color="muted">
          Runs on your machine via Ollama; review each before it&apos;s applied.
        </Text>
      </div>
      <Button variant="primary" onClick={start} disabled={loading} data-testid="llm-suggest">
        <Sparkles size={16} strokeWidth={2.5} /> Suggest categories
      </Button>

      {open && (
        <Sheet isOpen={open} onClose={() => setOpen(false)} title="Review category suggestions">
          <div ref={setDialogNode} tabIndex={-1} className={styles.sheet}>
            {loading ? (
              <Flex align="center" gap={2} className={styles.state}>
                <Spinner size="sm" />
                <Text color="muted">Categorizing your untagged transactions locally…</Text>
              </Flex>
            ) : rows && rows.length > 0 ? (
              <Stack gap={0}>
                {rows.map((r) => (
                  <div key={r.id} className={styles.row} data-testid="llm-slat">
                    <div className={styles.txn}>
                      <Text weight="bold" className={styles.name}>{r.name}</Text>
                      <Text variant="caption" color="muted" style={NUMERIC}>{money(r.amount)}</Text>
                    </div>
                    <div className={styles.controls}>
                      <Badge variant="secondary" title={`${Math.round(r.suggestion.confidence * 100)}% confidence`}>
                        {Math.round(r.suggestion.confidence * 100)}%
                      </Badge>
                      <Input
                        aria-label={`Category for ${r.name}`}
                        value={edits[r.id] ?? ''}
                        onChange={(e) => setEdits((s) => ({ ...s, [r.id]: e.target.value }))}
                        className={styles.cat}
                      />
                      <Button size="sm" variant="primary" onClick={() => apply(r.id)}>Apply</Button>
                    </div>
                  </div>
                ))}
              </Stack>
            ) : (
              <Text color="muted" className={styles.state}>
                All caught up — every recent transaction already has a tag.
              </Text>
            )}
          </div>
        </Sheet>
      )}
    </Card>
  );
}
