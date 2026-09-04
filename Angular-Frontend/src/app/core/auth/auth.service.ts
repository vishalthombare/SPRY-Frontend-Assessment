import { Injectable, signal } from '@angular/core';

const AUTH_KEY = 'spry.authenticated';

/** Maintains the lightweight assessment session used by the route guard. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Reactive authentication state initialized from the current browser tab. */
  readonly isAuthenticated = signal(sessionStorage.getItem(AUTH_KEY) === 'true');

  /** Starts a session that remains valid until the browser tab is closed. */
  login(): void {
    sessionStorage.setItem(AUTH_KEY, 'true');
    this.isAuthenticated.set(true);
  }

  /** Clears the current session and immediately updates guard consumers. */
  logout(): void {
    sessionStorage.removeItem(AUTH_KEY);
    this.isAuthenticated.set(false);
  }
}
