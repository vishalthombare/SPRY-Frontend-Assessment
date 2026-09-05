import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { DueDateSort, TaskFilterValue, TaskStatus } from '../../models/task.model';

@Component({
  selector: 'app-task-filters',
  imports: [ReactiveFormsModule],
  templateUrl: './task-filters.html',
  styleUrl: './task-filters.scss',
})
export class TaskFiltersComponent {
  @Input() completedOnly = false;
  @Output() readonly filtersChange = new EventEmitter<TaskFilterValue>();
  readonly form = inject(FormBuilder).nonNullable.group({
    query: '',
    status: new FormControl<TaskStatus | 'all'>('all', { nonNullable: true }),
    sort: new FormControl<DueDateSort>('asc', { nonNullable: true }),
  });
  constructor() {
    // Avoid sending an API request for every keystroke while keeping selects responsive.
    this.form.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => this.filtersChange.emit(this.form.getRawValue()));
  }
  get hasActiveFilters(): boolean {
    const value = this.form.getRawValue();
    return value.query.trim().length > 0 || value.status !== 'all' || value.sort !== 'asc';
  }
  clear(): void {
    this.form.setValue({ query: '', status: 'all', sort: 'asc' });
  }
}
