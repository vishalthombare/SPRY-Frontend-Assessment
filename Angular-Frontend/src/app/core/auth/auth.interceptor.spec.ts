import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { AuthSessionService } from './auth-session.service';
import { authInterceptor } from './auth.interceptor';
import { TokenRefreshService } from './token-refresh.service';

describe('authInterceptor', () => {
  it('clears the session and redirects to login when token refresh fails', () => {
    const session = {
      accessToken: 'expired-access-token',
      refreshToken: 'expired-refresh-token',
      clear: vi.fn(),
    };
    const router = {
      url: '/tasks',
      navigate: vi.fn().mockResolvedValue(true),
    };
    const refreshService = {
      refresh: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 401 }))),
    };
    const next = vi.fn(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSessionService, useValue: session },
        { provide: TokenRefreshService, useValue: refreshService },
        { provide: Router, useValue: router },
      ],
    });

    TestBed.runInInjectionContext(() =>
      authInterceptor(new HttpRequest('GET', '/api/v1/tasks'), next),
    ).subscribe({ error: () => undefined });

    expect(session.clear).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { sessionExpired: 'true', returnUrl: '/tasks' },
    });
  });
});
