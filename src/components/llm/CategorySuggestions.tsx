'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { Button, Modal, Text, useToast } from 'doom-design-system';
import { Sparkles } from 'lucide-react';
import { getLlmHealth, applyCategories } from '@/app/actions/llm';
import { useCategorizationStream } from '@/lib/llm/useCategorizationStream';
import { useDialogFocusTrap } from '@/lib/useDialogFocusTrap';
import CategorizationWorkspace from './CategorizationWorkspace';
import styles from './CategorySuggestions.module.scss';

// Entry point for local-AI categorization on the Transactions page. Gated on the
// integration being healthy (enabled + Ollama up + model pulled). The CTA sits
// inline; opening it is a dedicated task, so the streamed review runs in a
// focus-trapped modal with room to work. Nothing is written without approval.
export default function CategorySuggestions() {
  const { toastError, toastSuccess } = useToast();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { rows, progress, streaming, error, start, cancel, reset, removeRows } = useCategorizationStream();
  const { setDialogNode, openFrom } = useDialogFocusTrap(open);

  useEffect(() => {
    let cancelled = false;
    getLlmHealth()
      .then((h) => { if (!cancelled) setAvailable(h.ok); })
      .catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (error) toastError(error);
  }, [error, toastError]);

  const review = async (e: MouseEvent) => {
    openFrom(e);
    setOpen(true);
    await start();
  };

  const close = () => {
    cancel();
    reset();
    setOpen(false);
  };

  const onApply = async (items: { id: number; tag: string }[]) => {
    if (!items.length) return;
    setBusy(true);
    try {
      const n = await applyCategories(items);
      removeRows(items.map((i) => i.id));
      toastSuccess(`Tagged ${n} transaction${n === 1 ? '' : 's'}.`);
    } catch {
      toastError("Couldn't apply those categories.");
    } finally {
      setBusy(false);
    }
  };

  if (!available) return null;

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.intro}>
            <span className={styles.icon} aria-hidden="true">
              <Sparkles size={20} strokeWidth={2.5} />
            </span>
            <div className={styles.copy}>
              <Text as="p" weight="bold" className={styles.title}>Categorize with local AI</Text>
              <Text as="p" variant="caption" color="muted" className={styles.sub}>
                Runs on your machine via Ollama — suggestions stream in and you approve each before it&rsquo;s applied.
              </Text>
            </div>
          </div>
          <div className={styles.actions}>
            <Button variant="primary" onClick={review} data-testid="llm-suggest">Review categories</Button>
          </div>
        </div>
      </div>

      {open && (
        <Modal
          isOpen
          onClose={close}
          className={styles.modalOverlay}
          title={<span className={styles.modalTitle}>Review categories</span>}
        >
          <div ref={setDialogNode}>
            <CategorizationWorkspace
              rows={rows}
              streaming={streaming}
              progress={progress}
              busy={busy}
              onApply={onApply}
              onCancel={cancel}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
