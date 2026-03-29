import { describe, it, expect } from 'vitest';
import { auditStore, withAuditContext } from './audit-context';

describe('audit-context', () => {
  it('should propagate userId through async context', async () => {
    let captured: { userId: number; batchId?: string } | undefined;

    await withAuditContext({ userId: 42 }, async () => {
      captured = auditStore.getStore();
    });

    expect(captured).toEqual({ userId: 42 });
  });

  it('should propagate batchId when provided', async () => {
    let captured: { userId: number; batchId?: string } | undefined;
    const batchId = '550e8400-e29b-41d4-a716-446655440000';

    await withAuditContext({ userId: 42, batchId }, async () => {
      captured = auditStore.getStore();
    });

    expect(captured).toEqual({ userId: 42, batchId });
  });

  it('should return undefined outside of context', () => {
    expect(auditStore.getStore()).toBeUndefined();
  });

  it('should return the result of the wrapped function', async () => {
    const result = await withAuditContext({ userId: 1 }, async () => {
      return 'hello';
    });

    expect(result).toBe('hello');
  });

  it('should isolate nested contexts', async () => {
    await withAuditContext({ userId: 1 }, async () => {
      expect(auditStore.getStore()?.userId).toBe(1);

      await withAuditContext({ userId: 2 }, async () => {
        expect(auditStore.getStore()?.userId).toBe(2);
      });

      expect(auditStore.getStore()?.userId).toBe(1);
    });
  });
});
