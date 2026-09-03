import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { TaskFilterValue, TaskPriority, TaskStatus } from '../models/task.model';

@Component({ selector: 'app-task-filters', imports: [ReactiveFormsModule], templateUrl: './task-filters.html', styleUrl: './task-filters.scss' })
export class TaskFiltersComponent {
  @Output() readonly filtersChange = new EventEmitter<TaskFilterValue>();
  readonly form;
  constructor(formBuilder: FormBuilder) {
    this.form = formBuilder.nonNullable.group({
      query: '',
      status: new FormControl<TaskStatus | 'all'>('all', { nonNullable: true }),
      priority: new FormControl<TaskPriority | 'all'>('all', { nonNullable: true }),
    });
    this.form.valueChanges.subscribe(() => this.filtersChange.emit(this.form.getRawValue()));
  }
}
