import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  registerSchema,
  loginSchema,
  profileSchema,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, validate(profileSchema), updateProfile);

export default router;
