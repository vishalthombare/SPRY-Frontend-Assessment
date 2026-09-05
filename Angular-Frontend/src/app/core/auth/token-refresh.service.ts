import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { finalize, map, Observable, shareReplay, tap, throwError, timeout } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { ApiResponse } from '../api/api-response.model';
import { APP_CONSTANTS } from '../constants/app.constants';
import { API_ENDPOINTS } from '../constants/api-endpoints.constants';
import { AuthSessionService } from './auth-session.service';
import { TokenPair } from './auth.model';

/** Refreshes expired sessions outside the normal interceptor chain. */
@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  // HttpBackend bypasses interceptors and prevents refresh requests from intercepting themselves.
  private readonly rawHttp = new HttpClient(inject(HttpBackend));
  private readonly apiUrl = inject(API_BASE_URL);
  private readonly session = inject(AuthSessionService);
  private pendingRefresh: Observable<string> | null = null;

  /** Return one shared refresh operation when several requests fail with 401 together. */
  refresh(): Observable<string> {
    const refreshToken = this.session.refreshToken;
    if (!refreshToken) return throwError(() => new Error('Refresh token is unavailable.'));
    if (this.pendingRefresh) return this.pendingRefresh;

    this.pendingRefresh = this.rawHttp
      .post<ApiResponse<TokenPair>>(`${this.apiUrl}${API_ENDPOINTS.auth.refresh}`, {
        refresh_token: refreshToken,
      })
      .pipe(
        timeout(APP_CONSTANTS.apiTimeoutMs),
        tap(({ response }) => this.session.setTokens(response)),
        map(({ response }) => response.access_token),
        finalize(() => (this.pendingRefresh = null)),
        // Every waiting request receives the same newly issued access token.
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.pendingRefresh;
  }
}
