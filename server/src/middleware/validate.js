import { ApiError } from '../utils/ApiError.js';

/** Validates params/query/body with zod; controllers receive parsed, typed values. */
export const validate = (schemas) => (req, _res, next) => {
  const errors = [];
  for (const part of ['params', 'query', 'body']) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({ field: issue.path.join('.') || part, message: issue.message });
      }
    } else if (part === 'query') {
      req.validatedQuery = result.data;
    } else {
      req[part] = result.data;
    }
  }
  if (errors.length) return next(ApiError.badRequest('Please fix the highlighted fields', errors));
  next();
};
