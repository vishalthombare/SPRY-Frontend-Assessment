import { Injectable, signal } from '@angular/core';

const AUTH_KEY = 'spry.authenticated';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isAuthenticated = signal(sessionStorage.getItem(AUTH_KEY) === 'true');
  login(): void {
    sessionStorage.setItem(AUTH_KEY, 'true');
    this.isAuthenticated.set(true);
  }
  logout(): void {
    sessionStorage.removeItem(AUTH_KEY);
    this.isAuthenticated.set(false);
  }
}
