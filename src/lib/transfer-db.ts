import { Prisma, PrismaClient, type transfers } from '@prisma/client';

// Transfer mutations explicitly audit within their transaction. Query extensions
// on the ordinary client can execute mutations outside callback transactions.
const globalTransfer = globalThis as unknown as { transferDb?: PrismaClient };
export const transferDb = globalTransfer.transferDb ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalTransfer.transferDb = transferDb;

// Callers must keep this lock until their mutation and audit write commit.
export async function lockUnlinkedTransfer(
  db: Prisma.TransactionClient,
  userId: number,
  id: number,
  operation: string,
  allowDeleted = false,
) {
  const rows = await db.$queryRaw<transfers[]>(Prisma.sql`
    SELECT * FROM transfers WHERE id=${id} AND user_id=${userId}
      ${allowDeleted ? Prisma.empty : Prisma.sql`AND deleted_at IS NULL`} FOR UPDATE`);
  const before = rows[0];
  if (!before) throw new Error('Transfer not found or unauthorized');
  if (await db.transactions.count({ where: { transfer_id: id, deleted_at: null } })) {
    throw new Error(`Unlink statement payments before ${operation}`);
  }
  return before;
}

export async function writeTransferAudit(
  db: Prisma.TransactionClient,
  userId: number,
  id: number,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  action: 'UPDATE' | 'DELETE',
  batchId?: string,
) {
  await db.$executeRaw(Prisma.sql`
    INSERT INTO audit_log (user_id,batch_id,entity_type,entity_id,action,previous_value,new_value)
    VALUES (${userId},${batchId ?? null}::uuid,'transfers',${id},${action},${JSON.stringify(before)}::jsonb,${JSON.stringify(after)}::jsonb)`);
}
