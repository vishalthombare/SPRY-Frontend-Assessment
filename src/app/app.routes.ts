import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-layout').then((m) => m.AppLayout),
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'assignment',
        loadChildren: () =>
          import('./features/assignments/assignments.routes').then((m) => m.ASSIGNMENT_ROUTES),
      },
      {
        path: 'tasks',
        loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.TASK_ROUTES),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
