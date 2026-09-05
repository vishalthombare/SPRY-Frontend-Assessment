import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints.constants';
import { AuthSessionService } from './auth-session.service';
import { TokenRefreshService } from './token-refresh.service';

/** Adds bearer authentication and retries once after refreshing an expired token. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSessionService);
  const refreshService = inject(TokenRefreshService);
  const accessToken = session.accessToken;
  // Login is public; all other calls receive the token when one exists.
  const isLoginRequest = request.url.includes(API_ENDPOINTS.auth.login);
  const authenticatedRequest =
    accessToken && !isLoginRequest
      ? request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
      : request;

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // Refresh only authentication failures and never retry login/refresh recursively.
      const canRefresh =
        error.status === 401 &&
        Boolean(session.refreshToken) &&
        !request.url.includes(API_ENDPOINTS.auth.login) &&
        !request.url.includes(API_ENDPOINTS.auth.refresh);
      if (!canRefresh) return throwError(() => error);

      return refreshService.refresh().pipe(
        // Retry the original request once with the replacement access token.
        switchMap((token) =>
          next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })),
        ),
        catchError((refreshError) => {
          // A failed refresh means the browser session can no longer be trusted.
          session.clear();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
