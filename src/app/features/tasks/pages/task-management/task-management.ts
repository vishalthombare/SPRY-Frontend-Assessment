import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ToastComponent, ToastType } from '../../../../shared/components/toast/toast';
import { TaskFiltersComponent } from '../../components/task-filters/task-filters';
import { TaskFormDialogComponent } from '../../components/task-form-dialog/task-form-dialog';
import { TaskRowComponent } from '../../components/task-row/task-row';
import { TaskSummaryCardComponent } from '../../components/task-summary-card/task-summary-card';
import { TaskStore } from '../../data-access/task.store';
import { filterAndSortTasks } from '../../data-access/task.selectors';
import { Task, TaskFilterValue, TaskFormValue } from '../../models/task.model';

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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(TaskStore);
  private readonly filterSubject = new BehaviorSubject<TaskFilterValue>({
    query: '',
    status: 'all',
    sort: 'asc',
  });

  readonly completedView = toSignal(
    this.route.data.pipe(map((data) => data['completedOnly'] === true)),
    { initialValue: false },
  );
  private readonly createRequested = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('create') === 'true')),
    { initialValue: false },
  );
  readonly counts = toSignal(this.store.counts$, {
    initialValue: { total: 0, pending: 0, inProgress: 0, completed: 0 },
  });
  readonly loading = toSignal(this.store.loading$, { initialValue: true });
  readonly error = toSignal(this.store.error$, { initialValue: null });
  readonly visibleTasks = toSignal(
    combineLatest([this.store.tasks$, this.filterSubject, this.route.data]).pipe(
      map(([tasks, filters, data]) => {
        return filterAndSortTasks(tasks, filters, data['completedOnly'] === true);
      }),
    ),
    { initialValue: [] },
  );

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
    effect(() => {
      if (this.createRequested()) this.addTask();
    });
  }

  setFilters(filters: TaskFilterValue): void {
    this.filterSubject.next(filters);
  }
  addTask(): void {
    this.selectedTask.set(null);
    this.formOpen.set(true);
  }
  editTask(task: Task): void {
    this.selectedTask.set(task);
    this.formOpen.set(true);
  }
  closeForm(): void {
    if (!this.saving()) {
      this.formOpen.set(false);
      this.clearCreateRequest();
    }
  }
  saveTask(value: TaskFormValue): void {
    if (this.saving()) return;
    this.saving.set(true);
    const selected = this.selectedTask();
    const saved = selected ? this.store.update(selected.id, value) : this.store.add(value);
    this.saving.set(false);
    if (saved) {
      this.formOpen.set(false);
      this.clearCreateRequest();
      this.showToast(
        selected ? 'Task updated' : 'Task added',
        'success',
        'Your changes were saved locally.',
      );
    } else this.showToast('Unable to save task', 'error', 'Please try again.');
  }
  deleteTask(): void {
    const task = this.deleteTarget();
    if (!task) return;
    const removed = this.store.remove(task.id);
    this.deleteTarget.set(null);
    this.showToast(
      removed ? 'Task deleted' : 'Unable to delete task',
      removed ? 'success' : 'error',
      removed ? 'The task was removed.' : 'Please try again.',
    );
  }
  completeTask(task: Task): void {
    const saved = this.store.setStatus(task.id, 'completed');
    this.showToast(
      saved ? 'Task completed' : 'Unable to complete task',
      saved ? 'success' : 'error',
      saved ? 'The task moved to Completed Tasks.' : 'Please try again.',
    );
  }
  restoreTask(task: Task): void {
    const saved = this.store.setStatus(task.id, 'in-progress');
    this.showToast(
      saved ? 'Task restored' : 'Unable to restore task',
      saved ? 'success' : 'error',
      saved ? 'The task moved back to In Progress.' : 'Please try again.',
    );
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

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { create: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
