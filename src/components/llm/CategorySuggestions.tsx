'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { Button, Flex, Input, Sheet, Spinner, Text, useToast } from 'doom-design-system';
import { Sparkles } from 'lucide-react';
import { suggestCategories, applyCategory, getLlmHealth, type CategorySuggestionRow } from '@/app/actions/llm';
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
  const [available, setAvailable] = useState<boolean | null>(null);
  const { setDialogNode, openFrom } = useDialogFocusTrap(open);

  // Only surface the AI UI when the local integration is actually usable
  // (enabled + Ollama reachable + model pulled). Hidden until confirmed.
  useEffect(() => {
    let cancelled = false;
    getLlmHealth()
      .then((h) => { if (!cancelled) setAvailable(h.ok); })
      .catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, []);

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

  const applyAll = async () => {
    const current = rows ?? [];
    let n = 0;
    for (const r of current) {
      const tag = (edits[r.id] ?? '').trim();
      if (!tag) continue;
      try { await applyCategory(r.id, tag); n += 1; } catch { /* skip and continue */ }
    }
    setRows([]);
    toastSuccess(`Applied ${n} categor${n === 1 ? 'y' : 'ies'}.`);
  };

  if (!available) return null;

  return (
    <>
    <div className={styles.bar}>
      <div className={styles.intro}>
        <span className={styles.icon} aria-hidden="true">
          <Sparkles size={20} strokeWidth={2.5} />
        </span>
        <div className={styles.copy}>
          <Text as="p" weight="bold" className={styles.title}>Suggest categories with local AI</Text>
          <Text as="p" variant="caption" color="muted" className={styles.sub}>
            Runs on your machine via Ollama — review each before it&apos;s applied.
          </Text>
        </div>
      </div>
      <Button variant="primary" onClick={start} disabled={loading} data-testid="llm-suggest" className={styles.cta}>
        {loading ? <><Spinner size="sm" /> Categorizing…</> : 'Suggest categories'}
      </Button>
    </div>

      {open && (
        <Sheet
          isOpen={open}
          onClose={() => setOpen(false)}
          title={<span className={styles.sheetTitle}>Review category suggestions</span>}
          className={styles.panelFit}
        >
          <div ref={setDialogNode} tabIndex={-1} className={styles.sheet}>
            {loading ? (
              <div className={styles.state}>
                <Flex align="center" justify="center" gap={2}>
                  <Spinner size="sm" />
                  <Text color="muted">Categorizing your untagged transactions locally…</Text>
                </Flex>
              </div>
            ) : rows && rows.length > 0 ? (
              <>
                <div className={styles.sheetHead}>
                  <Text variant="caption" color="muted">
                    {rows.length} suggestion{rows.length === 1 ? '' : 's'} — edit any category, then apply.
                  </Text>
                  <Button size="sm" variant="secondary" onClick={applyAll}>Apply all</Button>
                </div>
                <div className={styles.slats}>
                  {rows.map((r) => {
                    const conf = Math.round(r.suggestion.confidence * 100);
                    const tier = conf >= 85 ? styles.high : conf >= 60 ? styles.medium : styles.low;
                    return (
                      <div key={r.id} className={styles.row} data-testid="llm-slat">
                        <div className={styles.txn}>
                          <Text as="p" weight="bold" className={styles.name}>{r.name}</Text>
                          <Text as="p" variant="caption" color="muted" className={styles.amount} style={NUMERIC}>
                            {money(r.amount)}
                          </Text>
                        </div>
                        <span className={`${styles.conf} ${tier}`} title={`${conf}% confidence`}>{conf}%</span>
                        <Input
                          aria-label={`Category for ${r.name}`}
                          value={edits[r.id] ?? ''}
                          onChange={(e) => setEdits((s) => ({ ...s, [r.id]: e.target.value }))}
                          className={styles.cat}
                        />
                        <Button size="sm" variant="primary" onClick={() => apply(r.id)}>Apply</Button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className={styles.state}>
                <Text color="muted">All caught up — every recent transaction already has a tag.</Text>
              </div>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}
