import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

const SESSION_COOKIE = 'moneyprinter_session';
const SESSION_DURATION_HOURS = 1;

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function getCurrentUser(): Promise<number | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  
  if (!sessionToken) {
    return null;
  }

  // Validate session token and check expiration
  const user = await prisma.users.findFirst({
    where: { session_token: sessionToken },
    select: { id: true, session_expires_at: true }
  });

  if (!user) {
    return null;
  }

  const expiresAt = user.session_expires_at ? new Date(user.session_expires_at) : new Date(0);
  
  // Check if session has expired
  if (expiresAt < new Date()) {
    // Clear expired session
    await prisma.users.update({
      where: { id: user.id },
      data: {
        session_token: null,
        session_expires_at: null
      }
    });
    return null;
  }

  return user.id;
}

export async function createSession(userId: number): Promise<string> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);

  // Store session token in database
  await prisma.users.update({
    where: { id: userId },
    data: {
      session_token: sessionToken,
      session_expires_at: expiresAt
    }
  });

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
  });

  return sessionToken;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionToken) {
    // Clear session from database
    await prisma.users.updateMany({
      where: { session_token: sessionToken },
      data: {
        session_token: null,
        session_expires_at: null
      }
    });
  }

  // Clear cookie
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireAuth(): Promise<number> {
  const userId = await getCurrentUser();
  if (!userId) {
    throw new Error('Not authenticated');
  }
  return userId;
}
