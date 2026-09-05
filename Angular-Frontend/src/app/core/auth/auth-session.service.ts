import { Injectable, computed, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage.constants';
import { AuthUser, TokenPair } from './auth.model';

/** Owns browser-session auth state without making HTTP requests. */
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly userState = signal<AuthUser | null>(null);
  private readonly validatedState = signal(false);

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.accessToken));
  readonly isValidated = this.validatedState.asReadonly();

  /** Read the short-lived token attached to protected API requests. */
  get accessToken(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.accessToken);
  }

  /** Read the longer-lived token used only to renew an expired session. */
  get refreshToken(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.refreshToken);
  }

  /** Replace both tokens together so a refresh cannot leave a mixed token pair. */
  setTokens(tokens: TokenPair): void {
    sessionStorage.setItem(STORAGE_KEYS.accessToken, tokens.access_token);
    sessionStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refresh_token);
  }

  /** Initialize tokens and user state after a successful login. */
  start(tokens: TokenPair, user: AuthUser): void {
    this.setTokens(tokens);
    this.userState.set(user);
    this.validatedState.set(true);
  }

  /** Mark a restored browser session as validated by the backend. */
  setUser(user: AuthUser): void {
    this.userState.set(user);
    this.validatedState.set(true);
  }

  /** Remove all local authentication data after logout or refresh failure. */
  clear(): void {
    sessionStorage.removeItem(STORAGE_KEYS.accessToken);
    sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
    this.userState.set(null);
    this.validatedState.set(false);
  }
}
