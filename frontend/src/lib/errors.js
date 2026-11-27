export const API_ERROR_COPY = {
  UNAUTHENTICATED: 'Your session has expired. Please sign in again.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  EXAM_NOT_AVAILABLE: 'This examination is not currently open for entry.',
  NOT_ENROLLED: 'You are not enrolled in this exam. Contact your examiner.',
  ATTEMPT_ALREADY_SUBMITTED: 'Your attempt has already been submitted.',
  ALREADY_SUBMITTED: 'Your attempt has already been submitted.',
  ATTEMPT_EXPIRED: 'Time is up. Your saved answers are being finalized.',
  DUPLICATE_ATTEMPT: 'Resuming your existing examination attempt.',
  VALIDATION_ERROR: 'Please check the highlighted fields and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  IMPORT_INVALID: 'Some imported rows contain validation errors.',
  NETWORK_ERROR: 'Connection lost. Keep working: your answers are saved on this device.',
  SERVER_ERROR: 'A server error occurred. Please retry.',
};

export function mapErrorCodeToCopy(code, fallbackMessage) {
  return API_ERROR_COPY[code] || fallbackMessage || 'Something went wrong. Please retry.';
}
