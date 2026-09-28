import { Router } from 'express';
import { changePassword, login, logout, logoutAll, me, refresh } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { loginLimiter, refreshLimiter, requireCsrfHeader } from '../middleware/security.js';
import { validate } from '../middleware/validate.js';
import { changePasswordSchema, loginSchema } from '../validators/auth.validator.js';

const router = Router();

router.post('/login', loginLimiter, validate({ body: loginSchema }), login);
router.post('/refresh', refreshLimiter, requireCsrfHeader, refresh);
router.post('/logout', requireCsrfHeader, logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, me);
router.patch('/password', authenticate, validate({ body: changePasswordSchema }), changePassword);

export default router;
