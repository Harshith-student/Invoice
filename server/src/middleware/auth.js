import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createError } from './errorHandler.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) throw createError('Not authenticated', 401);

    const secret = process.env.JWT_SECRET || 'chasepay_dev_secret_change_in_production';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) throw createError('User not found', 401);

    req.user = user;
    next();
  } catch (err) {
    // JWT errors get a 401
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(createError('Invalid or expired token', 401));
    }
    next(err);
  }
};
