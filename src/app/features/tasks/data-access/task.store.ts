import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';
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
    try {
      this.tasksSubject.next(this.repository.load());
    } catch {
      this.tasksSubject.next([]);
      this.errorSubject.next('Tasks could not be loaded. Please try again.');
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /** Adds a normalized task without mutating the existing collection. */
  add(value: TaskFormValue): boolean {
    return this.commit([
      {
        ...value,
        title: value.title.trim(),
        description: value.description.trim(),
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      },
      ...this.tasksSubject.value,
    ]);
  }

  /** Updates only the matching task and preserves immutable creation metadata. */
  update(id: string, value: TaskFormValue): boolean {
    return this.commit(
      this.tasksSubject.value.map((task) =>
        task.id === id
          ? { ...task, ...value, title: value.title.trim(), description: value.description.trim() }
          : task,
      ),
    );
  }

  /** Removes a task by identifier using an immutable filter operation. */
  remove(id: string): boolean {
    return this.commit(this.tasksSubject.value.filter((task) => task.id !== id));
  }

  /** Applies workflow transitions used by Complete and Restore actions. */
  setStatus(id: string, status: TaskStatus): boolean {
    return this.commit(
      this.tasksSubject.value.map((task) => (task.id === id ? { ...task, status } : task)),
    );
  }

  /** Persists first so in-memory state changes only after a successful save. */
  private commit(tasks: readonly Task[]): boolean {
    this.errorSubject.next(null);
    try {
      this.repository.save(tasks);
      this.tasksSubject.next(tasks);
      return true;
    } catch {
      this.errorSubject.next('Your changes could not be saved. Please try again.');
      return false;
    }
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
