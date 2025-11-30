import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, signup, logout, getUser } from './auth';
import prisma from '@/lib/prisma';
import { createSession, clearSession, getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    users: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  createSession: vi.fn(),
  clearSession: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        user_passwords: { password_hash: 'hashed_password' },
      };
      (prisma.users.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      await login('testuser', 'password');

      expect(prisma.users.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        select: expect.any(Object),
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashed_password');
      expect(createSession).toHaveBeenCalledWith(1);
      expect(redirect).toHaveBeenCalledWith('/');
    });

    it('should return error for invalid credentials', async () => {
      (prisma.users.findUnique as any).mockResolvedValue(null);

      const result = await login('testuser', 'password');

      expect(result).toEqual({ error: 'Invalid username or password' });
      expect(createSession).not.toHaveBeenCalled();
    });
  });

  describe('signup', () => {
    it('should create user and login', async () => {
      (prisma.users.findUnique as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue('new_hash');
      (prisma.users.create as any).mockResolvedValue({ id: 1 });

      await signup('newuser', 'New User', 'password123');

      expect(prisma.users.create).toHaveBeenCalled();
      expect(createSession).toHaveBeenCalledWith(1);
      expect(redirect).toHaveBeenCalledWith('/');
    });

    it('should return error if username exists', async () => {
      (prisma.users.findUnique as any).mockResolvedValue({ id: 1 });

      const result = await signup('existing', 'User', 'password');

      expect(result).toEqual({ error: 'Username already taken' });
    });
  });

  describe('logout', () => {
    it('should clear session and redirect', async () => {
      await logout();
      expect(clearSession).toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith('/login');
    });
  });

  describe('getUser', () => {
    it('should return user if authenticated', async () => {
      (getCurrentUser as any).mockResolvedValue(1);
      (prisma.users.findUnique as any).mockResolvedValue({
        id: 1,
        username: 'test',
        display_name: 'Test',
        is_sandbox: false,
      });

      const user = await getUser();
      expect(user).toEqual({
        id: 1,
        username: 'test',
        display_name: 'Test',
        is_sandbox: false,
      });
    });

    it('should return null if not authenticated', async () => {
      (getCurrentUser as any).mockResolvedValue(null);
      const user = await getUser();
      expect(user).toBeNull();
    });
  });
});
