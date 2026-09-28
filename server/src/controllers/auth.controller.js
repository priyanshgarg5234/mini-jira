import bcrypt from 'bcryptjs';
import { LOGIN_LOCK_MINUTES, LOGIN_MAX_ATTEMPTS, REFRESH_COOKIE } from '../config/constants.js';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import {
  issueRefreshToken,
  revokeAllForUser,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from '../services/token.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const cookieOptions = () => ({
  httpOnly: true, // not readable by JavaScript -> safe from XSS token theft
  secure: env.cookieSecure, // HTTPS only in production
  sameSite: 'strict', // never sent on cross-site requests
  path: '/api/auth', // only sent to auth endpoints
  maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
});

const clearCookieOptions = () => {
  const { maxAge, ...rest } = cookieOptions();
  return rest;
};

async function startSession(res, req, user) {
  const refreshToken = await issueRefreshToken(user, req);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  return { accessToken: signAccessToken(user), user };
}

// Pre-computed hash so unknown emails take as long as wrong passwords (no user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', 12);

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil');

  if (user?.lockUntil && user.lockUntil > new Date()) {
    const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
    req.log.warn({ email }, 'Login blocked: account locked');
    throw ApiError.tooMany(`Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
  }

  const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  if (!user || !valid) {
    if (user) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= LOGIN_MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60000);
        user.failedLoginAttempts = 0;
        req.log.warn({ userId: String(user._id) }, 'Account locked after repeated failed logins');
      }
      await user.save();
    }
    req.log.info({ email, ip: req.headers['x-vercel-forwarded-for'] || req.ip }, 'Login failed');
    throw ApiError.unauthorized('Email or password is incorrect');
  }

  if (!user.isActive) throw ApiError.forbidden('Your account is disabled. Contact an admin.');

  if (user.failedLoginAttempts || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }

  req.log.info({ userId: String(user._id) }, 'Login succeeded');
  res.json(await startSession(res, req, user));
});

export const refresh = asyncHandler(async (req, res) => {
  try {
    const { user, refreshToken } = await rotateRefreshToken(req.cookies?.[REFRESH_COOKIE], req);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
    res.json({ accessToken: signAccessToken(user), user });
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, clearCookieOptions());
    throw err;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await revokeRefreshToken(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, clearCookieOptions());
  res.status(204).end();
});

export const logoutAll = asyncHandler(async (req, res) => {
  await revokeAllForUser(req.user._id);
  res.clearCookie(REFRESH_COOKIE, clearCookieOptions());
  req.log.info('Signed out of all sessions');
  res.status(204).end();
});

export const me = asyncHandler(async (req, res) => res.json({ user: req.user }));

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.field('currentPassword', 'Current password is incorrect');
  }
  user.password = req.body.newPassword;
  await user.save(); // sets passwordChangedAt -> older access tokens stop working
  await revokeAllForUser(user._id); // sign out every other device
  req.log.info('Password changed');
  res.json(await startSession(res, req, user)); // keep this device signed in
});
