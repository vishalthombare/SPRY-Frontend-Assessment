import { InjectionToken } from '@angular/core';
import { Task } from '../models/task.model';
export interface TaskRepository {
  load(): Task[];
  save(tasks: readonly Task[]): void;
}
export const TASK_REPOSITORY = new InjectionToken<TaskRepository>('TASK_REPOSITORY');
