import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { Task, TaskFormValue, TaskStatus } from '../../models/task.model';

@Component({
  selector: 'app-task-form-dialog',
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './task-form-dialog.html',
  styleUrl: './task-form-dialog.scss',
})
export class TaskFormDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() task: Task | null = null;
  @Input() saving = false;
  @Output() readonly save = new EventEmitter<TaskFormValue>();
  @Output() readonly cancel = new EventEmitter<void>();

  readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
    dueDate: ['', Validators.required],
    status: new FormControl<TaskStatus>('pending', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });
  readonly titleId = `task-form-title-${Math.random().toString(36).slice(2)}`;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task'] || changes['open']) {
      const value = this.task;
      this.form.reset(
        value
          ? {
              title: value.title,
              description: value.description,
              dueDate: value.dueDate,
              status: value.status,
            }
          : { title: '', description: '', dueDate: '', status: 'pending' },
      );
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit(this.form.getRawValue());
  }
}
