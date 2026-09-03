import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login), title: 'Sign in | SPRY' },
  {
    path: '', canActivate: [authGuard],
    loadComponent: () => import('./layout/app-layout').then((m) => m.AppLayout),
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard), title: 'Dashboard | SPRY' },
      { path: 'assignment', loadComponent: () => import('./pages/assignment/assignment').then((m) => m.Assignment), title: 'Assignment | SPRY' },
      { path: 'tasks', loadComponent: () => import('./pages/tasks/tasks').then((m) => m.Tasks), title: 'Tasks | SPRY' },
      { path: 'tasks/completed', loadComponent: () => import('./pages/tasks/completed-tasks').then((m) => m.CompletedTasks), title: 'Completed tasks | SPRY' },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
