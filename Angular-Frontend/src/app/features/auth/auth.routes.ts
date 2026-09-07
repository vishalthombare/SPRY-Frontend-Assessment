import { Routes } from '@angular/router';

/** Public authentication routes loaded separately from the protected workspace. */
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    title: 'Sign in | SPRY',
  },
];
