import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonComponent } from '../button/button';

@Component({
  selector: 'app-confirm-dialog', imports: [ButtonComponent], templateUrl: './confirm-dialog.html', styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Confirm action';
  @Input() message = 'Are you sure you want to continue?';
  @Input() confirmLabel = 'Confirm';
  @Input() destructive = false;
  @Output() readonly confirm = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();
  readonly titleId = `confirm-title-${Math.random().toString(36).slice(2)}`;
}
