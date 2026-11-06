import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  const auth = { isAuthenticated: vi.fn(), setReturnUrl: vi.fn() };
  const run = (url: string) =>
    TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  it('lets signed-in users through', () => {
    auth.isAuthenticated.mockReturnValue(true);
    expect(run('/tickets')).toBe(true);
  });

  it('redirects signed-out users to /login and remembers the page', () => {
    auth.isAuthenticated.mockReturnValue(false);
    const result = run('/tickets/42');
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
    expect(auth.setReturnUrl).toHaveBeenCalledWith('/tickets/42');
  });
});
