import { inject, Injectable } from '@angular/core';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { ApiService } from '../api/api.service';
import { API_ENDPOINTS } from '../constants/api-endpoints.constants';
import { AuthSessionService } from './auth-session.service';
import {
  AuthUser,
  LoginRequest,
  LoginResult,
  ResendOtpRequest,
  ResendOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from './auth.model';

/** Connects authentication UI flows to the FastAPI authentication endpoints. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly session = inject(AuthSessionService);

  readonly isAuthenticated = this.session.isAuthenticated;
  readonly user = this.session.user;

  /** Authenticate credentials and start a session only when no OTP challenge remains. */
  login(credentials: LoginRequest): Observable<LoginResult> {
    return this.api.post<LoginResult, LoginRequest>(API_ENDPOINTS.auth.login, credentials).pipe(
      tap(({ response }) => {
        if (!response.requires_otp) this.session.start(response, response.user);
      }),
      map(({ response }) => response),
    );
  }

  /** Exchange a valid email code for tokens and start the authenticated browser session. */
  verifyOtp(request: VerifyOtpRequest): Observable<AuthUser> {
    return this.api
      .post<VerifyOtpResponse, VerifyOtpRequest>(API_ENDPOINTS.auth.verifyOtp, request)
      .pipe(
        tap(({ response }) => this.session.start(response, response.user)),
        map(({ response }) => response.user),
      );
  }

  /** Replace an eligible challenge and return metadata for the newly emailed code. */
  resendOtp(request: ResendOtpRequest): Observable<ResendOtpResponse> {
    return this.api
      .post<ResendOtpResponse, ResendOtpRequest>(API_ENDPOINTS.auth.resendOtp, request)
      .pipe(map(({ response }) => response));
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
