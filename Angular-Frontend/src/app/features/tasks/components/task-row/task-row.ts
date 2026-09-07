import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Task } from '../../models/task.model';

/** Renders one task and emits user intentions without changing state itself. */
@Component({
  selector: 'app-task-row',
  imports: [DatePipe],
  templateUrl: './task-row.html',
  styleUrl: './task-row.scss',
})
export class TaskRowComponent {
  // The task is mandatory; the route view controls which workflow action is shown.
  @Input({ required: true }) task!: Task;
  @Input() completedView = false;
  // Outputs let the page coordinate API operations, dialogs, and toast feedback.
  @Output() readonly edit = new EventEmitter<Task>();
  @Output() readonly remove = new EventEmitter<Task>();
  @Output() readonly complete = new EventEmitter<Task>();
  @Output() readonly restore = new EventEmitter<Task>();
  /** Convert stored status values into reviewer-friendly labels. */
  get statusLabel(): string {
    return this.task.status === 'in-progress'
      ? 'In Progress'
      : this.task.status === 'pending'
        ? 'Pending'
        : 'Completed';
  }
}
