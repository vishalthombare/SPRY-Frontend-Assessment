import { Routes } from '@angular/router';
import { LocalStorageTaskRepository } from './data-access/local-storage-task.repository';
import { TASK_REPOSITORY } from './data-access/task.repository';
import { TaskStore } from './data-access/task.store';

const taskProviders = [
  TaskStore,
  LocalStorageTaskRepository,
  { provide: TASK_REPOSITORY, useExisting: LocalStorageTaskRepository },
];

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
