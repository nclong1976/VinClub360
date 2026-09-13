/**
 * Input validation & sanitization utilities
 */

export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationException extends Error {
  constructor(public errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}

/**
 * Validates email format
 */
export function validateEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validates URL format
 */
export function validateUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes string input - removes dangerous characters
 */
export function sanitizeString(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  return input.slice(0, maxLength).trim();
}

/**
 * Validates Supabase configuration
 */
export interface SupabaseConfig {
  url?: string;
  key?: string;
}

export function validateSupabaseConfig(config: SupabaseConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!config.url || typeof config.url !== 'string') {
    errors.push({ field: 'url', message: 'Supabase URL is required' });
  } else if (!config.url.startsWith('https://')) {
    errors.push({ field: 'url', message: 'Supabase URL must start with https://' });
  } else if (!config.url.includes('supabase.co')) {
    errors.push({ field: 'url', message: 'Invalid Supabase URL' });
  }

  if (!config.key || typeof config.key !== 'string') {
    errors.push({ field: 'key', message: 'Supabase key is required' });
  } else if (config.key.length < 20) {
    errors.push({ field: 'key', message: 'Supabase key is too short' });
  }

  return errors;
}

/**
 * Validates API request body
 */
export function validateRequestBody(
  body: unknown,
  requiredFields: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof body !== 'object' || body === null) {
    errors.push({ field: 'body', message: 'Request body must be an object' });
    return errors;
  }

  for (const field of requiredFields) {
    if (!(field in body) || (body as Record<string, any>)[field] === undefined) {
      errors.push({ field, message: `${field} is required` });
    }
  }

  return errors;
}

/**
 * Express middleware for request validation
 */
export function validationMiddleware(req: any, res: any, next: any) {
  res.validateBody = (requiredFields: string[]) => {
    const errors = validateRequestBody(req.body, requiredFields);
    if (errors.length > 0) {
      throw new ValidationException(errors);
    }
  };
  next();
}
