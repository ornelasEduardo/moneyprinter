import { PrismaClient } from '@prisma/client';

// Restore writes its own audit records inside its transaction. The ordinary
// client's query extension writes audits outside callback transactions.
const globalRestore = globalThis as unknown as { restoreDb?: PrismaClient };
export const restoreDb = globalRestore.restoreDb ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalRestore.restoreDb = restoreDb;
