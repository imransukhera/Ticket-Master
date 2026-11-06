import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage, errorKind, isRetryable } from './http-error';

const http = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('http-error', () => {
  it('classifies statuses', () => {
    expect(errorKind(http(0))).toBe('network');
    expect(errorKind(http(401))).toBe('unauthorized');
    expect(errorKind(http(403))).toBe('forbidden');
    expect(errorKind(http(404))).toBe('notFound');
    expect(errorKind(http(422))).toBe('invalid');
    expect(errorKind(http(503))).toBe('server');
    expect(errorKind(new Error('x'))).toBe('unknown');
  });

  it('only offers retry for temporary failures', () => {
    expect(isRetryable('network')).toBe(true);
    expect(isRetryable('server')).toBe(true);
    expect(isRetryable('forbidden')).toBe(false);
    expect(isRetryable('notFound')).toBe(false);
  });

  it('uses page-specific copy for 403 and 404', () => {
    expect(apiErrorMessage(http(403), { forbidden: 'Admins only.' })).toBe('Admins only.');
    expect(apiErrorMessage(http(404), { notFound: 'Ticket not found.' })).toBe('Ticket not found.');
  });

  it('shows the backend message for validation errors', () => {
    expect(apiErrorMessage(http(400, { message: 'Email already exists' }))).toBe('Email already exists');
    expect(apiErrorMessage(http(400, {}), 'Fallback')).toBe('Fallback');
  });

  it('gives retry-friendly copy for 5xx and network errors', () => {
    expect(apiErrorMessage(http(500))).toContain('try again');
    expect(apiErrorMessage(http(0))).toContain('try again');
  });
});
