'use server';

import prisma from '@/lib/prisma';
import { createSession, clearSession, getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

export async function login(username: string, password: string) {
  try {
    // Get user with password hash
    const user = await prisma.users.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        display_name: true,
        is_sandbox: true,
        user_passwords: {
          select: { password_hash: true }
        }
      }
    });

    if (!user || !user.user_passwords) {
      return { error: 'Invalid username or password' };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.user_passwords.password_hash);
    if (!isValidPassword) {
      return { error: 'Invalid username or password' };
    }

    // Create session
    await createSession(user.id);
    
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'An error occurred during login' };
  }
  
  redirect('/');
}

export async function signup(username: string, displayName: string, password: string) {
  try {
    // Validate input
    if (!username || username.length < 3) {
      return { error: 'Username must be at least 3 characters' };
    }

    if (!displayName || displayName.length < 2) {
      return { error: 'Display name must be at least 2 characters' };
    }

    if (!password || password.length < 6) {
      return { error: 'Password must be at least 6 characters' };
    }

    // Check if username already exists
    const existingUser = await prisma.users.findUnique({
      where: { username },
      select: { id: true }
    });

    if (existingUser) {
      return { error: 'Username already taken' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.users.create({
      data: {
        username,
        display_name: displayName,
        is_sandbox: false,
        user_passwords: {
          create: {
            password_hash: passwordHash
          }
        }
      },
      select: { id: true }
    });

    // Create session for new user
    await createSession(newUser.id);

  } catch (error) {
    console.error('Signup error:', error);
    return { error: 'An error occurred during signup' };
  }
  
  redirect('/');
}

export async function logout() {
  await clearSession();
  redirect('/login');
}

export async function getUser() {
  const userId = await getCurrentUser();
  if (!userId) {
    return null;
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      display_name: true,
      is_sandbox: true
    }
  });

  if (user) {
    return {
      ...user,
      display_name: user.display_name || '',
      is_sandbox: user.is_sandbox || false
    };
  }

  return null;
}
