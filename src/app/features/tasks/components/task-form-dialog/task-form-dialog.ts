import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { Task, TaskFormValue, TaskPriority, TaskStatus } from '../../models/task.model';

@Component({ selector: 'app-task-form-dialog', imports: [ReactiveFormsModule, ButtonComponent], templateUrl: './task-form-dialog.html', styleUrl: './task-form-dialog.scss' })
export class TaskFormDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() task: Task | null = null;
  @Output() readonly save = new EventEmitter<TaskFormValue>();
  @Output() readonly cancel = new EventEmitter<void>();

  readonly form;
  readonly titleId = `task-form-title-${Math.random().toString(36).slice(2)}`;

  constructor(formBuilder: FormBuilder) {
    this.form = formBuilder.nonNullable.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      assignee: ['', Validators.required],
      dueDate: ['', Validators.required],
      priority: new FormControl<TaskPriority>('medium', { nonNullable: true, validators: Validators.required }),
      status: new FormControl<TaskStatus>('todo', { nonNullable: true, validators: Validators.required }),
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] || changes['open']) {
      const value = this.task;
      this.form.reset(value ? {
        title: value.title, description: value.description, assignee: value.assignee,
        dueDate: value.dueDate, priority: value.priority, status: value.status,
      } : { title: '', description: '', assignee: '', dueDate: '', priority: 'medium', status: 'todo' });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.save.emit(this.form.getRawValue());
  }
}
