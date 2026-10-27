import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createError } from '../middleware/errorHandler.js';

// ─── Zod schemas ────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const profileSchema = z.object({
  name: z.string().min(2).trim().optional(),
  business: z
    .object({
      name: z.string().optional(),
      address: z.string().optional(),
      gstin: z.string().optional(),
      upiId: z.string().optional(),
    })
    .optional(),
});

// ─── Helper ──────────────────────────────────────────────────────────────────

const signToken = (userId) =>
  jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'chasepay_dev_secret_change_in_production',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );

const setCookieAndRespond = (res, user, statusCode = 200) => {
  const token = signToken(user._id);
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      business: user.business,
      createdAt: user.createdAt,
    },
  });
};

// ─── Controllers ─────────────────────────────────────────────────────────────

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) throw createError('Email already registered', 409);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    setCookieAndRespond(res, user, 201);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) throw createError('Invalid email or password', 401);

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw createError('Invalid email or password', 401);

    setCookieAndRespond(res, user);
  } catch (err) {
    next(err);
  }
};

export const logout = (_req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
};

export const getMe = (req, res) => {
  res.json({ success: true, user: req.user });
};

export const updateProfile = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.business) {
      // Merge existing business fields so partial updates work
      updates.business = { ...req.user.business.toObject(), ...req.body.business };
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-passwordHash');

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};
