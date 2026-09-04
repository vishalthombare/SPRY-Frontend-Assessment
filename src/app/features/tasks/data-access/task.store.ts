import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';
import { Task, TaskCounts, TaskFormValue, TaskStatus } from '../models/task.model';
import { TASK_REPOSITORY } from './task.repository';

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
  update(id: string, value: TaskFormValue): boolean {
    return this.commit(
      this.tasksSubject.value.map((task) =>
        task.id === id
          ? { ...task, ...value, title: value.title.trim(), description: value.description.trim() }
          : task,
      ),
    );
  }
  remove(id: string): boolean {
    return this.commit(this.tasksSubject.value.filter((task) => task.id !== id));
  }
  setStatus(id: string, status: TaskStatus): boolean {
    return this.commit(
      this.tasksSubject.value.map((task) => (task.id === id ? { ...task, status } : task)),
    );
  }

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
