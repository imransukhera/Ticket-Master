import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let router: Router;
  const auth = {
    getAccessToken: vi.fn(() => 'token-123' as string | null),
    setReturnUrl: vi.fn(),
    endSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => backend.verify());

  it('adds the bearer token to API requests', () => {
    http.get(`${environment.apiUrl}/tickets`).subscribe();
    const req = backend.expectOne(`${environment.apiUrl}/tickets`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    req.flush([]);
  });

  it('does not send the token to other hosts', () => {
    http.get('https://example.com/data').subscribe();
    const req = backend.expectOne('https://example.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('sends no header when signed out', () => {
    auth.getAccessToken.mockReturnValueOnce(null);
    http.get(`${environment.apiUrl}/tickets`).subscribe();
    const req = backend.expectOne(`${environment.apiUrl}/tickets`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('ends the session and goes to login on 401', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    let failed = false;
    http.get(`${environment.apiUrl}/tickets`).subscribe({ error: () => (failed = true) });
    backend.expectOne(`${environment.apiUrl}/tickets`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBe(true);
    expect(auth.endSession).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'expired' } });
  });

  it('leaves the session alone on 403', () => {
    const navigate = vi.spyOn(router, 'navigate');
    http.get(`${environment.apiUrl}/users`).subscribe({ error: () => {} });
    backend.expectOne(`${environment.apiUrl}/users`).flush({}, { status: 403, statusText: 'Forbidden' });

    expect(auth.endSession).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
