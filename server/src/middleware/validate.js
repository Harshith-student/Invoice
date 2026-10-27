import { z } from 'zod';
import { createError } from './errorHandler.js';

/**
 * Returns Express middleware that validates req.body against a Zod schema.
 * On failure, passes a 422 error to next().
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join('; ');
    return next(createError(message, 422));
  }
  req.body = result.data; // replace with coerced/stripped data
  next();
};
