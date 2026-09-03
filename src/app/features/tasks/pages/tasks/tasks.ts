import { Component, signal } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ToastComponent } from '../../../../shared/components/toast/toast';
import { TaskFiltersComponent } from '../../components/task-filters/task-filters';
import { TaskFormDialogComponent } from '../../components/task-form-dialog/task-form-dialog';
import { TaskRowComponent } from '../../components/task-row/task-row';
import { TaskSummaryCardComponent } from '../../components/task-summary-card/task-summary-card';
import { Task, TaskFormValue } from '../../models/task.model';

@Component({
  selector: 'app-tasks',
  imports: [ButtonComponent, ConfirmDialogComponent, ToastComponent, TaskFiltersComponent, TaskFormDialogComponent, TaskRowComponent, TaskSummaryCardComponent],
  templateUrl: './tasks.html', styleUrl: './tasks.scss',
})
export class Tasks {
  readonly formOpen = signal(false);
  readonly selectedTask = signal<Task | null>(null);
  readonly deleteTarget = signal<Task | null>(null);
  readonly toastOpen = signal(false);
  readonly previewTasks: Task[] = [
    { id: '1', title: 'Review homepage concepts', description: 'Compare the latest design directions and add feedback.', assignee: 'Maya Chen', dueDate: '2026-09-08', priority: 'high', status: 'in-progress' },
    { id: '2', title: 'Prepare weekly update', description: 'Summarize delivery progress and open decisions.', assignee: 'Alex Morgan', dueDate: '2026-09-11', priority: 'medium', status: 'todo' },
  ];

  addTask(): void { this.selectedTask.set(null); this.formOpen.set(true); }
  editTask(task: Task): void { this.selectedTask.set(task); this.formOpen.set(true); }
  closeForm(): void { this.formOpen.set(false); }
  previewSave(_value: TaskFormValue): void { this.formOpen.set(false); this.toastOpen.set(true); }
  confirmDelete(): void { this.deleteTarget.set(null); this.toastOpen.set(true); }
}
