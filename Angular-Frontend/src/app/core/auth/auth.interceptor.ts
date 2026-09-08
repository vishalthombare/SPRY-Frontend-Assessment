import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints.constants';
import { APP_ROUTES } from '../constants/routes.constants';
import { AuthSessionService } from './auth-session.service';
import { TokenRefreshService } from './token-refresh.service';

/** Adds bearer authentication and retries once after refreshing an expired token. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSessionService);
  const refreshService = inject(TokenRefreshService);
  const router = inject(Router);
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
        catchError((refreshError) => {
          // A failed refresh ends the session and explains why sign-in is required again.
          const returnUrl = router.url.startsWith(APP_ROUTES.login) ? undefined : router.url;
          session.clear();
          void router.navigate([APP_ROUTES.login], {
            queryParams: { sessionExpired: 'true', returnUrl },
          });
          return throwError(() => refreshError);
        }),
        // Retry the original request once with the replacement access token.
        switchMap((token) =>
          next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })),
        ),
      );
    }),
  );
};
