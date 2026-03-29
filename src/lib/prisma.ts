import { PrismaClient } from '@prisma/client';
import { auditStore } from '@/lib/audit-context';
import { writeAuditLog } from '@/lib/audit';

export const UNAUDITED_MODELS = [
  'users',
  'user_passwords',
  'user_settings',
  'audit_log',
];

const MUTATING_OPS = ['create', 'update', 'delete', 'updateMany', 'deleteMany'];

const SOFT_DELETE_MODELS = ['accounts', 'transactions', 'net_worth_history', 'income_sources'];

export function shouldAudit(model: string | undefined, operation: string): boolean {
  if (!model) return false;
  if (UNAUDITED_MODELS.includes(model)) return false;
  if (!MUTATING_OPS.includes(operation)) return false;
  return true;
}

const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends({
  query: {
    $allOperations({ model, operation, args, query }) {
      if (!shouldAudit(model, operation)) {
        return query(args);
      }

      return (async () => {
        const ctx = auditStore.getStore();
        const modelDelegate = (basePrisma as any)[model!];

        // Snapshot before state for updates/deletes
        let previousValue: Record<string, unknown> | null = null;
        if (operation !== 'create' && modelDelegate?.findFirst) {
          const where = (args as any).where;
          if (where) {
            previousValue = await modelDelegate.findFirst({ where }) as Record<string, unknown> | null;
          }
        }

        // Rewrite delete/deleteMany to soft delete for applicable models
        if (SOFT_DELETE_MODELS.includes(model!) && (operation === 'delete' || operation === 'deleteMany')) {
          const softDeleteArgs = {
            where: (args as any).where,
            data: { deleted_at: new Date() },
          };
          const result = operation === 'delete'
            ? await modelDelegate.update(softDeleteArgs)
            : await modelDelegate.updateMany(softDeleteArgs);

          // Write audit entry if context is available
          if (ctx && previousValue) {
            await writeAuditLog({
              userId: ctx.userId,
              entityType: model!,
              entityId: (previousValue as any).id,
              action: 'DELETE',
              previousValue: previousValue as Record<string, unknown>,
              batchId: ctx.batchId,
            });
          }

          return result;
        }

        // Execute the original mutation
        const result = await query(args);

        // Write audit entry if context is available
        if (ctx) {
          const entityId = (result as any)?.id ?? (previousValue as any)?.id;
          if (entityId) {
            let action: 'CREATE' | 'UPDATE' | 'DELETE' = 'UPDATE';
            if (operation === 'create') action = 'CREATE';
            else if (operation === 'delete' || operation === 'deleteMany') action = 'DELETE';

            await writeAuditLog({
              userId: ctx.userId,
              entityType: model!,
              entityId,
              action,
              previousValue: previousValue as Record<string, unknown> | undefined,
              newValue: result as Record<string, unknown> | undefined,
              batchId: ctx.batchId,
            });
          }
        }

        return result;
      })();
    },
  },
});

export default prisma;

const globalForPrisma = globalThis as unknown as {
  prisma: typeof prisma | undefined;
};

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
