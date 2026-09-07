import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button/button';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker';
import { Task, TaskFormValue, TaskStatus } from '../../models/task.model';

/** Reusable reactive form for both task creation and task editing. */
@Component({
  selector: 'app-task-form-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, DatePickerComponent],
  templateUrl: './task-form-dialog.html',
  styleUrl: './task-form-dialog.scss',
})
export class TaskFormDialogComponent implements OnChanges {
  // Inputs control dialog mode/state; outputs keep persistence in the parent/store.
  @Input() open = false;
  @Input() task: Task | null = null;
  @Input() saving = false;
  @Output() readonly save = new EventEmitter<TaskFormValue>();
  @Output() readonly cancel = new EventEmitter<void>();

  /** Today's local date is the minimum accepted due date. */
  readonly today = this.toLocalDate(new Date());
  /** One typed reactive form is shared by Add and Edit modes. */
  readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
    dueDate: ['', [Validators.required, minimumDate(this.today)]],
    status: new FormControl<TaskStatus>('pending', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });
  readonly titleId = `task-form-title-${Math.random().toString(36).slice(2)}`;

  /** Provide an immutable creation label; new tasks preview today's date. */
  get createdDate(): string {
    const value = this.task?.createdAt ?? new Date().toISOString();
    return new Intl.DateTimeFormat('en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Reset whenever the dialog target changes so stale add/edit values never leak across modes.
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

  /** Emit only valid form values; the parent decides how they are saved. */
  submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit(this.form.getRawValue());
  }

  setDueDate(value: string): void {
    this.form.controls.dueDate.setValue(value);
    this.form.controls.dueDate.markAsTouched();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cancel.emit();
  }

  private toLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

function minimumDate(minimum: string): ValidatorFn {
  // ISO local dates compare chronologically as strings and avoid timezone conversion.
  return (control: AbstractControl<string>): ValidationErrors | null =>
    !control.value || control.value >= minimum ? null : { minimumDate: true };
}
