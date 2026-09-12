import { useEffect, useRef, useState } from 'react';

// doom's Sheet sets role="dialog"/aria-modal but manages no focus. This traps
// Tab within the dialog (incl. its own close button), focuses it on open, and
// restores the opener on close. `setDialogNode` is a ref-callback on the
// dialog's content — using state (not a bare ref) so the effect re-runs after
// doom's two-pass portal mount; `openFrom(e)` captures the trigger for restore.
export function useDialogFocusTrap(open: boolean) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !node) return;
    const dialog = (node.closest('[role="dialog"]') as HTMLElement) ?? node;
    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
    (focusables()[0] ?? node).focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return () => {
      dialog.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open, node]);

  const openFrom = (e?: { currentTarget?: EventTarget | null }) => {
    triggerRef.current = (e?.currentTarget as HTMLElement) ?? null;
  };

  return { setDialogNode: setNode, openFrom };
}
