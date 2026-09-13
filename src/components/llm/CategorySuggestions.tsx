'use client';

import { useEffect, useState } from 'react';
import { Button, Flex, Input, Spinner, Text, useToast } from 'doom-design-system';
import { Sparkles } from 'lucide-react';
import { suggestCategories, applyCategory, getLlmHealth, type CategorySuggestionRow } from '@/app/actions/llm';
import { money } from '@/lib/planning/format';
import styles from './CategorySuggestions.module.scss';

const NUMERIC = { fontVariantNumeric: 'tabular-nums' as const };

export default function CategorySuggestions() {
  const { toastError, toastSuccess } = useToast();
  const [rows, setRows] = useState<CategorySuggestionRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [available, setAvailable] = useState<boolean | null>(null);

  // Only surface the AI UI when the local integration is actually usable.
  useEffect(() => {
    let cancelled = false;
    getLlmHealth()
      .then((h) => { if (!cancelled) setAvailable(h.ok); })
      .catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  const run = async () => {
    setLoading(true);
    try {
      const r = await suggestCategories();
      setRows(r);
      setEdits(Object.fromEntries(r.map((x) => [x.id, x.suggestion.category])));
      if (r.length === 0) toastSuccess('Nothing to categorize — every recent transaction already has a tag.');
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Couldn't get suggestions.");
    } finally {
      setLoading(false);
    }
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

  const dismiss = () => { setRows(null); setEdits({}); };

  if (!available) return null;

  const showList = rows !== null && rows.length > 0;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.intro}>
          <span className={styles.icon} aria-hidden="true">
            <Sparkles size={20} strokeWidth={2.5} />
          </span>
          <div className={styles.copy}>
            <Text as="p" weight="bold" className={styles.title}>Suggest categories with local AI</Text>
            <Text as="p" variant="caption" color="muted" className={styles.sub}>
              {showList
                ? `${rows!.length} suggestion${rows!.length === 1 ? '' : 's'} — edit any category, then apply.`
                : 'Runs on your machine via Ollama — review each before it’s applied.'}
            </Text>
          </div>
        </div>
        <div className={styles.actions}>
          {showList ? (
            <>
              <Button size="sm" variant="secondary" onClick={applyAll}>Apply all</Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>Dismiss</Button>
            </>
          ) : (
            <Button variant="primary" onClick={run} disabled={loading} data-testid="llm-suggest">
              {loading ? <><Spinner size="sm" /> Categorizing…</> : 'Suggest categories'}
            </Button>
          )}
        </div>
      </div>

      {loading && !showList && (
        <div className={styles.state}>
          <Flex align="center" gap={2}>
            <Spinner size="sm" />
            <Text color="muted">Categorizing your untagged transactions locally…</Text>
          </Flex>
        </div>
      )}

      {showList && (
        <div className={styles.list}>
          {rows!.map((r) => {
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
      )}
    </div>
  );
}
