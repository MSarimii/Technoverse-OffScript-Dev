/**
 * Standardized application error carrying HTTP status, stable error code, and validation details.
 */
export class ApiError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = Array.isArray(details) ? details : [];
  }
}
