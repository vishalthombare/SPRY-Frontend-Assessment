import { inject, Injectable } from '@angular/core';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { ApiService } from '../api/api.service';
import { API_ENDPOINTS } from '../constants/api-endpoints.constants';
import { AuthSessionService } from './auth-session.service';
import { AuthUser, LoginRequest, LoginResponse } from './auth.model';

/** Connects authentication UI flows to the FastAPI authentication endpoints. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly session = inject(AuthSessionService);

  readonly isAuthenticated = this.session.isAuthenticated;
  readonly user = this.session.user;

  /** Authenticate credentials and start the browser session from the returned token pair. */
  login(credentials: LoginRequest): Observable<AuthUser> {
    return this.api.post<LoginResponse, LoginRequest>(API_ENDPOINTS.auth.login, credentials).pipe(
      tap(({ response }) => this.session.start(response, response.user)),
      map(({ response }) => response.user),
    );
  }

  /** Validates a restored browser session once before protected navigation. */
  ensureAuthenticated(): Observable<boolean> {
    if (!this.session.accessToken) return of(false);
    if (this.session.isValidated()) return of(true);

    return this.api.get<AuthUser>(API_ENDPOINTS.auth.me).pipe(
      tap(({ response }) => this.session.setUser(response)),
      map(() => true),
      catchError(() => {
        this.session.clear();
        return of(false);
      }),
    );
  }

  /** Notify the backend when possible and always clear local session data afterward. */
  logout(): Observable<void> {
    const request: Observable<unknown> = this.session.accessToken
      ? this.api.post<null>(API_ENDPOINTS.auth.logout, {})
      : of(null);

    return request.pipe(
      map((): void => undefined),
      finalize(() => this.session.clear()),
    );
  }
}
