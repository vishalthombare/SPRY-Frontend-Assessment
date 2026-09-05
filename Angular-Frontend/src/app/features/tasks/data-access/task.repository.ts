import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Task, TaskFormValue, TaskStatus } from '../models/task.model';
export interface TaskRepository {
  load(): Observable<Task[]>;
  create(value: TaskFormValue): Observable<Task>;
  update(id: number, value: TaskFormValue): Observable<Task>;
  remove(id: number): Observable<void>;
  setStatus(id: number, status: TaskStatus): Observable<Task>;
}
export const TASK_REPOSITORY = new InjectionToken<TaskRepository>('TASK_REPOSITORY');
