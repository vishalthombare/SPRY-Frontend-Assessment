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
        path: 'assessment',
        loadChildren: () =>
          import('./features/assessment/assessment.routes').then((m) => m.ASSESSMENT_ROUTES),
      },
      {
        path: 'tasks',
        loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.TASK_ROUTES),
      },
      { path: 'dashboard', pathMatch: 'full', redirectTo: 'assessment' },
      { path: 'assignment', pathMatch: 'full', redirectTo: 'assessment' },
      { path: '', pathMatch: 'full', redirectTo: 'assessment' },
    ],
  },
  { path: '**', redirectTo: 'assessment' },
];
