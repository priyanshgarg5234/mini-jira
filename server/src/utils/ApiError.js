export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(msg = 'Bad request', details) { return new ApiError(400, msg, details); }
  static unauthorized(msg = 'Sign in to continue') { return new ApiError(401, msg); }
  static forbidden(msg = 'You do not have permission to do this') { return new ApiError(403, msg); }
  static notFound(msg = 'Not found') { return new ApiError(404, msg); }
  static conflict(msg = 'Already exists') { return new ApiError(409, msg); }
  static tooMany(msg = 'Too many requests') { return new ApiError(429, msg); }

  /** Field-level validation error, e.g. ApiError.field('dueDate', 'Due date cannot be in the past') */
  static field(field, message) {
    return new ApiError(400, message, [{ field, message }]);
  }
}
