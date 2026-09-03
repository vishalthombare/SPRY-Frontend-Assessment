import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Task } from '../models/task.model';

@Component({ selector: 'app-task-row', templateUrl: './task-row.html', styleUrl: './task-row.scss' })
export class TaskRowComponent {
  @Input({ required: true }) task!: Task;
  @Output() readonly edit = new EventEmitter<Task>();
  @Output() readonly remove = new EventEmitter<Task>();
  @Output() readonly toggleComplete = new EventEmitter<Task>();
}
