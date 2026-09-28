import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { RefreshToken, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const JWT_OPTIONS = { issuer: 'mini-jira', audience: 'mini-jira-web' };
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.accessTokenSecret, {
    ...JWT_OPTIONS,
    subject: String(user._id),
    expiresIn: env.accessTokenTtl,
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token) {
  // Pin the algorithm so tokens signed with "none" or another alg are rejected.
  return jwt.verify(token, env.accessTokenSecret, { ...JWT_OPTIONS, algorithms: ['HS256'] });
}

export async function issueRefreshToken(user, req, family = crypto.randomUUID()) {
  const token = crypto.randomBytes(48).toString('base64url');
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(token),
    family,
    expiresAt: new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
    createdByIp: req.ip,
    userAgent: req.get('user-agent')?.slice(0, 200),
  });
  return token;
}

/**
 * Rotates a refresh token: the presented token is revoked and a new one is
 * issued in the same family. Presenting an already-revoked token means it was
 * stolen or replayed, so the entire family (that login session) is revoked.
 */
export async function rotateRefreshToken(token, req) {
  const expired = ApiError.unauthorized('Your session has ended. Sign in again.');
  if (!token) throw expired;

  const tokenHash = hashToken(token);
  // Atomic "revoke if still active" prevents two parallel requests using the same token.
  const current = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    { revokedAt: new Date() },
    { new: false }
  );

  if (!current) {
    const reused = await RefreshToken.findOne({ tokenHash });
    if (reused) {
      await RefreshToken.updateMany({ family: reused.family, revokedAt: null }, { revokedAt: new Date() });
      logger.warn(
        { userId: String(reused.user), family: reused.family, ip: req.ip },
        'Refresh token reuse detected - session revoked'
      );
    }
    throw expired;
  }

  if (current.expiresAt < new Date()) throw expired;

  const user = await User.findById(current.user);
  if (!user || !user.isActive) {
    await revokeAllForUser(current.user);
    throw expired;
  }

  const refreshToken = await issueRefreshToken(user, req, current.family);
  return { user, refreshToken };
}

export const revokeRefreshToken = (token) =>
  token
    ? RefreshToken.updateOne({ tokenHash: hashToken(token), revokedAt: null }, { revokedAt: new Date() })
    : null;

export const revokeAllForUser = (userId) =>
  RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
