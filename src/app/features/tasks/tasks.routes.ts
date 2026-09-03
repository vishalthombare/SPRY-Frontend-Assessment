import { Routes } from '@angular/router';
export const TASK_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./pages/tasks/tasks').then((m) => m.Tasks), title: 'Tasks | SPRY' },
  { path: 'completed', loadComponent: () => import('./pages/completed-tasks/completed-tasks').then((m) => m.CompletedTasks), title: 'Completed tasks | SPRY' },
];
