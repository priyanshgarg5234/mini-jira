import { User } from '../models/index.js';
import { verifyAccessToken } from '../services/token.service.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    // Client reacts to 401 by calling /auth/refresh once.
    throw ApiError.unauthorized('Access token expired or invalid');
  }

  // Load the user on every request so deactivation and role changes apply immediately.
  const user = await User.findById(payload.sub).select('+passwordChangedAt');
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or disabled');
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
    throw ApiError.unauthorized('Password was changed. Sign in again.');
  }

  req.user = user;
  req.log = req.log?.child({ userId: String(user._id) }) ?? req.log;
  next();
});

/** Role gate, e.g. authorize('admin', 'manager') */
export const authorize = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(ApiError.forbidden());
