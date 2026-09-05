import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  Observable,
  of,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';
import { Task, TaskCounts, TaskFormValue, TaskListQuery, TaskStatus } from '../models/task.model';
import { TaskApiService } from './task-api.service';

/**
 * Owns task state for the routed task feature.
 * BehaviorSubjects expose API data as one reactive source for every task component.
 */
@Injectable()
export class TaskStore {
  private readonly taskApi = inject(TaskApiService);
  private readonly tasksSubject = new BehaviorSubject<readonly Task[]>([]);
  private readonly loadingSubject = new BehaviorSubject(true);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly countsSubject = new BehaviorSubject<TaskCounts>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  private readonly paginationSubject = new BehaviorSubject({
    page: 1,
    pageSize: 10,
    totalElements: 0,
    totalPages: 0,
  });
  private query: TaskListQuery = {
    query: '',
    status: 'all',
    sort: 'asc',
    page: 1,
    completedOnly: false,
  };
  private loadSubscription?: Subscription;
  readonly tasks$ = this.tasksSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable().pipe(distinctUntilChanged());
  readonly error$ = this.errorSubject.asObservable().pipe(distinctUntilChanged());
  readonly counts$ = this.countsSubject.asObservable();
  readonly pagination$ = this.paginationSubject.asObservable();

  /** Reload the current server page, normally after a retry or mutation. */
  reload(): void {
    this.loadPage(this.query);
  }

  /** Load one server-filtered page and the full task summary. */
  loadPage(query: TaskListQuery): void {
    this.query = query;
    // Cancel an older filter/search request so it cannot overwrite newer results.
    this.loadSubscription?.unsubscribe();
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.loadSubscription = this.fetchPage(query)
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe({
        error: () => {
          this.tasksSubject.next([]);
          this.errorSubject.next('Tasks could not be loaded. Please try again.');
        },
      });
  }

  /** Adds a normalized task without mutating the existing collection. */
  add(value: TaskFormValue): Observable<boolean> {
    return this.mutate(
      this.taskApi.createTask(value),
      'Task could not be created. Please try again.',
    );
  }

  /** Updates only the matching task and preserves immutable creation metadata. */
  update(id: number, value: TaskFormValue): Observable<boolean> {
    return this.mutate(
      this.taskApi.updateTask(id, value),
      'Task could not be updated. Please try again.',
    );
  }

  /** Removes a task by identifier using an immutable filter operation. */
  remove(id: number): Observable<boolean> {
    return this.mutate(this.taskApi.deleteTask(id), 'Task could not be deleted. Please try again.');
  }

  /** Applies workflow transitions used by Complete and Restore actions. */
  setStatus(id: number, status: TaskStatus): Observable<boolean> {
    return this.mutate(
      this.taskApi.updateStatus(id, status),
      'Task status could not be changed. Please try again.',
    );
  }

  /** Commit an immutable state update only after the API operation succeeds. */
  private mutate<T>(request: Observable<T>, errorMessage: string): Observable<boolean> {
    this.errorSubject.next(null);
    return request.pipe(
      // Do not report success until the refreshed page and summary are available.
      switchMap(() => this.fetchPage(this.query)),
      map(() => true),
      catchError(() => {
        this.errorSubject.next(errorMessage);
        return of(false);
      }),
    );
  }

  /** Fetch and publish one consistent page/summary snapshot. */
  private fetchPage(query: TaskListQuery): Observable<void> {
    return forkJoin({
      page: this.taskApi.getTasks(query),
      counts: this.taskApi.getSummary(),
    }).pipe(
      tap(({ page, counts }) => {
        this.tasksSubject.next(page.tasks);
        this.countsSubject.next(counts);
        this.paginationSubject.next({
          page: page.page,
          pageSize: page.pageSize,
          totalElements: page.totalElements,
          totalPages: page.totalPages,
        });
      }),
      map(() => undefined),
    );
  }
}
