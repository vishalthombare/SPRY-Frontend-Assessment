import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-row',
  imports: [DatePipe],
  templateUrl: './task-row.html',
  styleUrl: './task-row.scss',
})
export class TaskRowComponent {
  @Input({ required: true }) task!: Task;
  @Input() completedView = false;
  @Output() readonly edit = new EventEmitter<Task>();
  @Output() readonly remove = new EventEmitter<Task>();
  @Output() readonly complete = new EventEmitter<Task>();
  @Output() readonly restore = new EventEmitter<Task>();
  get statusLabel(): string {
    return this.task.status === 'in-progress'
      ? 'In Progress'
      : this.task.status === 'pending'
        ? 'Pending'
        : 'Completed';
  }
}
