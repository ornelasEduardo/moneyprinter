import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentUser, createSession, clearSession, requireAuth } from './auth';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    users: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Auth Library', () => {
  const mockCookies = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (cookies as any).mockResolvedValue(mockCookies);
  });

  describe('getCurrentUser', () => {
    it('should return null if no session cookie exists', async () => {
      mockCookies.get.mockReturnValue(undefined);
      
      const result = await getCurrentUser();
      expect(result).toBeNull();
    });

    it('should return null if session token is invalid', async () => {
      mockCookies.get.mockReturnValue({ value: 'invalid-token' });
      (prisma.users.findFirst as any).mockResolvedValue(null);

      const result = await getCurrentUser();
      expect(result).toBeNull();
    });

    it('should return user id if session is valid', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      
      mockCookies.get.mockReturnValue({ value: 'valid-token' });
      (prisma.users.findFirst as any).mockResolvedValue({
        id: 123,
        session_expires_at: futureDate,
      });

      const result = await getCurrentUser();
      expect(result).toBe(123);
    });

    it('should clear session and return null if session is expired', async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);
      
      mockCookies.get.mockReturnValue({ value: 'expired-token' });
      (prisma.users.findFirst as any).mockResolvedValue({
        id: 123,
        session_expires_at: pastDate,
      });

      const result = await getCurrentUser();
      expect(result).toBeNull();
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: 123 },
        data: { session_token: null, session_expires_at: null },
      });
    });
  });

  describe('createSession', () => {
    it('should create a session and set cookie', async () => {
      const userId = 123;
      
      await createSession(userId);

      expect(prisma.users.update).toHaveBeenCalled();
      expect(mockCookies.set).toHaveBeenCalled();
    });
  });

  describe('clearSession', () => {
    it('should clear session from db and cookie', async () => {
      mockCookies.get.mockReturnValue({ value: 'token-to-clear' });
      
      await clearSession();

      expect(prisma.users.updateMany).toHaveBeenCalledWith({
        where: { session_token: 'token-to-clear' },
        data: { session_token: null, session_expires_at: null },
      });
      expect(mockCookies.delete).toHaveBeenCalledWith('moneyprinter_session');
    });
  });

  describe('requireAuth', () => {
    it('should throw error if not authenticated', async () => {
      mockCookies.get.mockReturnValue(undefined);
      
      await expect(requireAuth()).rejects.toThrow('Not authenticated');
    });

    it('should return userId if authenticated', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      
      mockCookies.get.mockReturnValue({ value: 'valid-token' });
      (prisma.users.findFirst as any).mockResolvedValue({
        id: 123,
        session_expires_at: futureDate,
      });

      const result = await requireAuth();
      expect(result).toBe(123);
    });
  });
});
