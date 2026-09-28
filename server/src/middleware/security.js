import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Real client IP. On Vercel the request passes through Vercel's proxy (and the
 * frontend's /api rewrite), so prefer the headers Vercel sets itself.
 */
const clientIp = (req) =>
  req.headers['x-vercel-forwarded-for']?.split(',')[0].trim() ||
  req.headers['x-real-ip'] ||
  req.ip;

const limiter = (windowMinutes, limit, message) =>
  rateLimit({
    keyGenerator: clientIp,
    validate: false, // proxy-header checks don't apply to our custom key
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.isTest, // tests exercise account lockout, not IP limits
    handler: (_req, _res, next) => next(ApiError.tooMany(message)),
  });

export const apiLimiter = limiter(1, 300, 'Too many requests. Slow down and try again shortly.');
export const loginLimiter = limiter(15, 10, 'Too many sign-in attempts from this network. Try again in 15 minutes.');
export const refreshLimiter = limiter(15, 60, 'Too many session refreshes. Try again later.');

/**
 * CSRF guard for cookie-authenticated endpoints (/auth/refresh, /auth/logout).
 * Browsers can't attach a custom header to a cross-site request without a CORS
 * preflight, and our CORS policy only allows CLIENT_URL. Combined with a
 * SameSite=Strict cookie this blocks cross-site request forgery.
 */
export function requireCsrfHeader(req, _res, next) {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    return next(ApiError.forbidden('Missing X-Requested-With header'));
  }
  next();
}
