import { Routes } from '@angular/router';
export const ASSIGNMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/assignment/assignment').then((m) => m.Assignment),
    title: 'Assignment | SPRY',
  },
];
