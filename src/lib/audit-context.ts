import { AsyncLocalStorage } from 'node:async_hooks';

export type AuditContext = {
  userId: number;
  batchId?: string;
};

export const auditStore = new AsyncLocalStorage<AuditContext>();

export function withAuditContext<T>(
  ctx: AuditContext,
  fn: () => Promise<T>
): Promise<T> {
  return auditStore.run(ctx, fn);
}
