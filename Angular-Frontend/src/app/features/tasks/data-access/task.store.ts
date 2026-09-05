import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  distinctUntilChanged,
  finalize,
  map,
  Observable,
  of,
  tap,
} from 'rxjs';
import { Task, TaskCounts, TaskFormValue, TaskStatus } from '../models/task.model';
import { TASK_REPOSITORY } from './task.repository';

/**
 * Owns task state for the routed task feature.
 * BehaviorSubjects keep state reactive while the repository isolates persistence details.
 */
@Injectable()
export class TaskStore {
  private readonly repository = inject(TASK_REPOSITORY);
  private readonly tasksSubject = new BehaviorSubject<readonly Task[]>([]);
  private readonly loadingSubject = new BehaviorSubject(true);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  readonly tasks$ = this.tasksSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable().pipe(distinctUntilChanged());
  readonly error$ = this.errorSubject.asObservable().pipe(distinctUntilChanged());
  readonly counts$ = this.tasks$.pipe(map((tasks) => this.calculateCounts(tasks)));

  constructor() {
    this.reload();
  }

  /** Reloads the collection and exposes loading or persistence failures to the UI. */
  reload(): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.repository
      .load()
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe({
        next: (tasks) => this.tasksSubject.next(tasks),
        error: () => {
          this.tasksSubject.next([]);
          this.errorSubject.next('Tasks could not be loaded. Please try again.');
        },
      });
  }

  /** Adds a normalized task without mutating the existing collection. */
  add(value: TaskFormValue): Observable<boolean> {
    return this.mutate(
      this.repository.create(value),
      (created) => [created, ...this.tasksSubject.value],
      'Task could not be created. Please try again.',
    );
  }

  /** Updates only the matching task and preserves immutable creation metadata. */
  update(id: number, value: TaskFormValue): Observable<boolean> {
    return this.mutate(
      this.repository.update(id, value),
      (updated) => this.tasksSubject.value.map((task) => (task.id === id ? updated : task)),
      'Task could not be updated. Please try again.',
    );
  }

  /** Removes a task by identifier using an immutable filter operation. */
  remove(id: number): Observable<boolean> {
    return this.mutate(
      this.repository.remove(id),
      () => this.tasksSubject.value.filter((task) => task.id !== id),
      'Task could not be deleted. Please try again.',
    );
  }

  /** Applies workflow transitions used by Complete and Restore actions. */
  setStatus(id: number, status: TaskStatus): Observable<boolean> {
    return this.mutate(
      this.repository.setStatus(id, status),
      (updated) => this.tasksSubject.value.map((task) => (task.id === id ? updated : task)),
      'Task status could not be changed. Please try again.',
    );
  }

  /** Commit an immutable state update only after the API operation succeeds. */
  private mutate<T>(
    request: Observable<T>,
    updateTasks: (result: T) => readonly Task[],
    errorMessage: string,
  ): Observable<boolean> {
    this.errorSubject.next(null);
    return request.pipe(
      tap((result) => this.tasksSubject.next(updateTasks(result))),
      map(() => true),
      catchError(() => {
        this.errorSubject.next(errorMessage);
        return of(false);
      }),
    );
  }

  /** Derives all summary values from the same collection in one pass. */
  private calculateCounts(tasks: readonly Task[]): TaskCounts {
    return tasks.reduce<TaskCounts>(
      (counts, task) => ({
        total: counts.total + 1,
        pending: counts.pending + Number(task.status === 'pending'),
        inProgress: counts.inProgress + Number(task.status === 'in-progress'),
        completed: counts.completed + Number(task.status === 'completed'),
      }),
      { total: 0, pending: 0, inProgress: 0, completed: 0 },
    );
  }
}
