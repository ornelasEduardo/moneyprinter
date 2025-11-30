'use server';

import { getCurrentUser } from '@/lib/auth';

/**
 * Helper to get the current user and throw if not authenticated.
 * Use this at the start of server actions to reduce boilerplate.
 * 
 * @returns The authenticated user ID
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<number> {
  const userId = await getCurrentUser();
  
  if (!userId) {
    throw new Error('Not authenticated');
  }
  
  return userId;
}

/**
 * Helper to verify a resource belongs to the current user.
 * 
 * @param verifyFn - Function that returns true if user owns the resource
 * @throws Error if not authenticated or not authorized
 */
export async function requireOwnership(
  verifyFn: (userId: number) => Promise<boolean>
): Promise<number> {
  const userId = await requireAuth();
  
  const isOwner = await verifyFn(userId);
  if (!isOwner) {
    throw new Error('Unauthorized: You do not own this resource');
  }
  
  return userId;
}
