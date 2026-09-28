import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, _res, next) =>
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Please fix the highlighted fields';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = `This ${field} is already in use`;
    details = [{ field, message }];
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  }

  // 5xx = our bug: log with stack. 4xx = client mistake: debug-level is enough.
  const log = req.log ?? console;
  if (status >= 500) log.error({ err }, 'Unhandled error');
  else log.debug({ status, message, details }, 'Request rejected');

  res.status(status).json({
    error: {
      message: status >= 500 && env.isProd ? 'Something went wrong on our side. Try again.' : message,
      ...(details && { details }),
      requestId: req.id, // quote this when reporting a bug; it matches the server log line
    },
  });
}
