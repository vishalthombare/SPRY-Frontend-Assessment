import { Routes } from '@angular/router';
import { TaskApiService } from './data-access/task-api.service';
import { TaskStore } from './data-access/task.store';

// Route-level providers keep task state scoped to the Task Management feature.
const taskProviders = [TaskStore, TaskApiService];

/** Both task tabs reuse one standalone page and differ only through route data. */
export const TASK_ROUTES: Routes = [
  {
    path: '',
    providers: taskProviders,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/task-management/task-management').then(
            (m) => m.TaskManagementPageComponent,
          ),
        data: { completedOnly: false },
        title: 'Task Management | SPRY',
      },
      {
        path: 'completed',
        loadComponent: () =>
          import('./pages/task-management/task-management').then(
            (m) => m.TaskManagementPageComponent,
          ),
        data: { completedOnly: true },
        title: 'Completed Tasks | SPRY',
      },
    ],
  },
];
