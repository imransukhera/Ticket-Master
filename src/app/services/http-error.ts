import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorKind = 'network' | 'unauthorized' | 'forbidden' | 'notFound' | 'invalid' | 'server' | 'unknown';

export function errorKind(err: unknown): ApiErrorKind {
  if (!(err instanceof HttpErrorResponse)) return 'unknown';
  if (err.status === 0) return 'network';
  if (err.status === 401) return 'unauthorized';
  if (err.status === 403) return 'forbidden';
  if (err.status === 404) return 'notFound';
  if (err.status >= 500) return 'server';
  if (err.status >= 400) return 'invalid';
  return 'unknown';
}

/** Only temporary failures are worth a "Try again" button. */
export function isRetryable(kind: ApiErrorKind | null): boolean {
  return kind === 'network' || kind === 'server' || kind === 'unknown';
}

export function isForbidden(err: unknown): boolean {
  return errorKind(err) === 'forbidden';
}

export interface ErrorCopy {
  /** Shown for 403. */
  forbidden?: string;
  /** Shown for 404. */
  notFound?: string;
  /** Shown when nothing more specific applies. */
  fallback?: string;
}

/** Turns an HTTP error into a short message a user can act on. */
export function apiErrorMessage(err: unknown, copy: string | ErrorCopy = {}): string {
  const c: ErrorCopy = typeof copy === 'string' ? { fallback: copy } : copy;
  const fallback = c.fallback ?? 'Something went wrong. Please try again.';

  switch (errorKind(err)) {
    case 'network':
      return "Couldn't reach SupportFlow. Check your internet connection and try again.";
    case 'unauthorized':
      return 'Your session has expired. Please sign in again.';
    case 'forbidden':
      return c.forbidden ?? "You don't have permission to do this. Ask an admin if you need access.";
    case 'notFound':
      return c.notFound ?? "We couldn't find what you were looking for. It may have been deleted.";
    case 'server':
      return `SupportFlow is having trouble right now (error ${(err as HttpErrorResponse).status}). Please try again in a moment.`;
    case 'invalid':
      return backendMessage(err) ?? fallback;
    default:
      return fallback;
  }
}

/** Validation errors (400/409/422) usually carry a useful message from the backend. */
function backendMessage(err: unknown): string | null {
  const body = (err as HttpErrorResponse).error;
  const msg = typeof body === 'string' ? body : (body?.message ?? body?.error);
  return typeof msg === 'string' && msg.trim() ? msg : null;
}
