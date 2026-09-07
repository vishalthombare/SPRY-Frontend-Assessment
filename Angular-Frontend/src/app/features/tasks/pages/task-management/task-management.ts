import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { BehaviorSubject, map } from 'rxjs';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ToastComponent, ToastType } from '../../../../shared/components/toast/toast';
import { TaskFiltersComponent } from '../../components/task-filters/task-filters';
import { TaskFormDialogComponent } from '../../components/task-form-dialog/task-form-dialog';
import { TaskRowComponent } from '../../components/task-row/task-row';
import { TaskSummaryCardComponent } from '../../components/task-summary-card/task-summary-card';
import { TaskStore } from '../../data-access/task.store';
import { Task, TaskFilterValue, TaskFormValue } from '../../models/task.model';

/** Coordinates route state, task selectors, dialogs, actions, and transient feedback. */
@Component({
  selector: 'app-task-management-page',
  imports: [
    RouterLink,
    RouterLinkActive,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    ConfirmDialogComponent,
    ToastComponent,
    TaskFiltersComponent,
    TaskFormDialogComponent,
    TaskRowComponent,
    TaskSummaryCardComponent,
  ],
  templateUrl: './task-management.html',
  styleUrl: './task-management.scss',
})
export class TaskManagementPageComponent {
  // Injected route services expose URL state; TaskStore owns server-backed task state.
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(TaskStore);
  // BehaviorSubject remembers the latest filters when moving between server pages.
  private readonly filterSubject = new BehaviorSubject<TaskFilterValue>({
    query: '',
    status: 'all',
    sort: 'created-desc',
  });

  // Route data selects All or Completed without duplicating the page component.
  readonly completedView = toSignal(
    this.route.data.pipe(map((data) => data['completedOnly'] === true)),
    { initialValue: false },
  );
  // A route flag lets the global header open the existing form without duplicating it.
  private readonly createRequested = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('create') === 'true')),
    { initialValue: false },
  );
  // Store observables become signals so the template can read their latest values directly.
  readonly counts = toSignal(this.store.counts$, {
    initialValue: { total: 0, pending: 0, inProgress: 0, completed: 0 },
  });
  readonly loading = toSignal(this.store.loading$, { initialValue: true });
  readonly error = toSignal(this.store.error$, { initialValue: null });
  readonly visibleTasks = toSignal(this.store.tasks$, { initialValue: [] });
  readonly pagination = toSignal(this.store.pagination$, {
    initialValue: { page: 1, pageSize: 10, totalElements: 0, totalPages: 0 },
  });
  // Computed signals derive pagination labels without storing duplicate state.
  readonly currentPage = computed(() => this.pagination().page);
  readonly totalPages = computed(() => this.pagination().totalPages);
  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );
  readonly firstVisibleTask = computed(() =>
    this.pagination().totalElements === 0
      ? 0
      : (this.currentPage() - 1) * this.pagination().pageSize + 1,
  );
  readonly lastVisibleTask = computed(() =>
    Math.min(this.currentPage() * this.pagination().pageSize, this.pagination().totalElements),
  );

  // Writable signals hold temporary dialog and feedback state owned only by this page.
  readonly formOpen = signal(false);
  readonly selectedTask = signal<Task | null>(null);
  readonly deleteTarget = signal<Task | null>(null);
  readonly saving = signal(false);
  readonly toast = signal<{ open: boolean; type: ToastType; title: string; message: string }>({
    open: false,
    type: 'success',
    title: '',
    message: '',
  });

  constructor() {
    // React to navigation from the global Create task action, including same-page navigation.
    // Route-tab changes request the corresponding first server page.
    effect(() => {
      if (this.createRequested()) this.addTask();
    });
    effect(() => {
      const completedOnly = this.completedView();
      this.store.loadPage({ ...this.filterSubject.value, page: 1, completedOnly });
    });
    // Return to the last available page when deleting the final item on a page.
    effect(() => {
      if (this.totalPages() > 0 && this.currentPage() > this.totalPages()) {
        this.goToPage(this.totalPages());
      }
    });
  }

  /** Apply filters and return to the first server page. */
  setFilters(filters: TaskFilterValue): void {
    this.filterSubject.next(filters);
    this.store.loadPage({ ...filters, page: 1, completedOnly: this.completedView() });
  }

  /** Request a valid server page while preserving the current filters. */
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.store.loadPage({
      ...this.filterSubject.value,
      page,
      completedOnly: this.completedView(),
    });
  }
  /** Open the shared form in Add mode. */
  addTask(): void {
    this.selectedTask.set(null);
    this.formOpen.set(true);
  }
  /** Open the same shared form in Edit mode with an existing task. */
  editTask(task: Task): void {
    this.selectedTask.set(task);
    this.formOpen.set(true);
  }
  /** Close the form unless a save request is still active. */
  closeForm(): void {
    if (!this.saving()) {
      this.formOpen.set(false);
      this.clearCreateRequest();
    }
  }
  /** Create or update through the store and report the result to the user. */
  saveTask(value: TaskFormValue): void {
    if (this.saving()) return;
    this.saving.set(true);
    const selected = this.selectedTask();
    const request = selected ? this.store.update(selected.id, value) : this.store.add(value);
    request.subscribe((saved) => {
      this.saving.set(false);
      if (saved) {
        this.formOpen.set(false);
        this.clearCreateRequest();
        this.showToast(
          selected ? 'Task updated' : 'Task added',
          'success',
          'Your changes were saved.',
        );
      } else this.showToast('Unable to save task', 'error', 'Please try again.');
    });
  }
  /** Confirmed deletion is sent to the backend as a soft delete. */
  deleteTask(): void {
    const task = this.deleteTarget();
    if (!task) return;
    this.deleteTarget.set(null);
    this.store.remove(task.id).subscribe((removed) => {
      this.showToast(
        removed ? 'Task deleted' : 'Unable to delete task',
        removed ? 'success' : 'error',
        removed ? 'The task was removed.' : 'Please try again.',
      );
    });
  }
  /** Move a task into the completed workflow state. */
  completeTask(task: Task): void {
    this.store.setStatus(task.id, 'completed').subscribe((saved) => {
      this.showToast(
        saved ? 'Task completed' : 'Unable to complete task',
        saved ? 'success' : 'error',
        saved ? 'The task moved to Completed Tasks.' : 'Please try again.',
      );
    });
  }
  /** Return a completed task to the in-progress workflow state. */
  restoreTask(task: Task): void {
    this.store.setStatus(task.id, 'in-progress').subscribe((saved) => {
      this.showToast(
        saved ? 'Task restored' : 'Unable to restore task',
        saved ? 'success' : 'error',
        saved ? 'The task moved back to In Progress.' : 'Please try again.',
      );
    });
  }
  retry(): void {
    this.store.reload();
  }
  dismissToast(): void {
    this.toast.update((value) => ({ ...value, open: false }));
  }
  private showToast(title: string, type: ToastType, message: string): void {
    this.toast.set({ open: true, type, title, message });
  }

  private clearCreateRequest(): void {
    if (!this.createRequested()) return;

    // Replace history so closing the dialog cannot reopen it through browser Back navigation.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { create: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
