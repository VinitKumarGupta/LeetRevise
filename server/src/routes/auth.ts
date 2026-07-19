import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'leetcode-revision-tracker-secret-key-12345!';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  leetcodeUsername: z.string().nullable().optional(),
  timezone: z.string().optional(),
  notificationEnabled: z.boolean().optional(),
  reminderTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format').optional(),
});

// Helper to sign JWT and set cookie
function sendTokenResponse(user: { id: string; email: string }, res: Response) {
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '7d',
  });

  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  };

  res.cookie('token', token, cookieOptions);
  return token;
}

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    sendTokenResponse(user, res);

    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        leetcodeUsername: user.leetcodeUsername,
        timezone: user.timezone,
        notificationEnabled: user.notificationEnabled,
        reminderTime: user.reminderTime,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    sendTokenResponse(user, res);

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        leetcodeUsername: user.leetcodeUsername,
        timezone: user.timezone,
        notificationEnabled: user.notificationEnabled,
        reminderTime: user.reminderTime,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  return res.json({ message: 'Successfully logged out' });
});

// GET CURRENT USER PROFILE
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        name: true,
        email: true,
        leetcodeUsername: true,
        timezone: true,
        notificationEnabled: true,
        reminderTime: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// UPDATE PROFILE
router.patch('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const updateData = profileUpdateSchema.parse(req.body);

    const user = await db.user.update({
      where: { id: req.user?.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        leetcodeUsername: true,
        timezone: true,
        notificationEnabled: true,
        reminderTime: true,
      },
    });

    return res.json({ user });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
