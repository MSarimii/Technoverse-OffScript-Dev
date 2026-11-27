import { ApiError } from '../utils/ApiError.js';

/**
 * Validates req.params, req.query, and req.body against provided Zod schemas.
 */
export const validate = (schemas = {}) => (req, _res, next) => {
  const details = [];

  for (const part of ['params', 'query', 'body']) {
    const schema = schemas[part];
    if (!schema) continue;

    const result = schema.safeParse(req[part]);
    if (!result.success) {
      for (const issue of result.error.issues) {
        details.push({
          path: issue.path.length > 0 ? issue.path.join('.') : part,
          message: issue.message,
        });
      }
    } else {
      req[part] = result.data;
    }
  }

  if (details.length > 0) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', details));
  }

  return next();
};
