/**
 * Normalized error categories (spec section 30). UI code should switch on
 * `kind`, never on raw status codes or provider-specific error shapes, so
 * the backend can change without every screen's error handling changing too.
 */
export type ApiErrorKind = 'network' | 'auth' | 'validation' | 'not_found' | 'server' | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly cause?: unknown;

  constructor(kind: ApiErrorKind, message: string, status: number | null = null, cause?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.cause = cause;
  }

  /** Copy to show a user — never surface `message` from an upstream response directly. */
  get userMessage(): string {
    switch (this.kind) {
      case 'network':
        return 'No connection. Check your network and try again.';
      case 'auth':
        return 'Your session has expired. Please sign in again.';
      case 'validation':
        return 'Some of the information provided is invalid.';
      case 'not_found':
        return 'We couldn’t find what you were looking for.';
      case 'server':
        return 'The server ran into a problem. Please try again shortly.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}

export function errorFromStatus(status: number, cause?: unknown): ApiError {
  if (status === 401 || status === 403) {
    return new ApiError('auth', `Request failed with status ${status}`, status, cause);
  }
  if (status === 404) {
    return new ApiError('not_found', `Request failed with status ${status}`, status, cause);
  }
  if (status === 422 || status === 400) {
    return new ApiError('validation', `Request failed with status ${status}`, status, cause);
  }
  if (status >= 500) {
    return new ApiError('server', `Request failed with status ${status}`, status, cause);
  }
  return new ApiError('unknown', `Request failed with status ${status}`, status, cause);
}
