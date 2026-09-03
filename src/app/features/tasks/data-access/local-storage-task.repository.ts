import { Injectable } from '@angular/core';
import { Task } from '../models/task.model';
import { TaskRepository } from './task.repository';

export const TASK_STORAGE_KEY = 'spry.tasks';
export const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Responsive QA pass',
    description: 'Verify the core workflow across desktop, tablet and mobile layouts.',
    status: 'completed',
    dueDate: '2026-09-02',
  },
  {
    id: '2',
    title: 'Completed route and persistence',
    description: 'Persist local task changes and expose the completed-task route.',
    status: 'completed',
    dueDate: '2026-09-03',
  },
  {
    id: '3',
    title: 'Responsive login and route guards',
    description: 'Complete the reviewer sign-in experience and protect assessment routes.',
    status: 'in-progress',
    dueDate: '2026-09-04',
  },
  {
    id: '4',
    title: 'RxJS state store',
    description: 'Manage task state with a BehaviorSubject and derived observable selectors.',
    status: 'in-progress',
    dueDate: '2026-09-04',
  },
  {
    id: '5',
    title: 'Reusable task components',
    description: 'Extract filters, rows, summary cards and shared feedback components.',
    status: 'in-progress',
    dueDate: '2026-09-05',
  },
  {
    id: '6',
    title: 'Task form validation',
    description: 'Validate mandatory titles and due dates with helpful field messages.',
    status: 'pending',
    dueDate: '2026-09-06',
  },
  {
    id: '7',
    title: 'CRUD interaction tests',
    description: 'Cover add, edit, delete, complete and restore state transitions.',
    status: 'pending',
    dueDate: '2026-09-07',
  },
  {
    id: '8',
    title: 'Final production review',
    description: 'Run formatting, tests and the optimized Angular build.',
    status: 'pending',
    dueDate: '2026-09-08',
  },
];

@Injectable()
export class LocalStorageTaskRepository implements TaskRepository {
  load(): Task[] {
    const value = localStorage.getItem(TASK_STORAGE_KEY);
    if (!value) return INITIAL_TASKS.map((task) => ({ ...task }));
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error('Saved task data is invalid.');
    return parsed as Task[];
  }
  save(tasks: readonly Task[]): void {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
  }
}
