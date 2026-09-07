import { Component, EventEmitter, Input, Output } from '@angular/core';
export type ToastType = 'success' | 'error' | 'info';

/** Displays transient success, error, or informational feedback from a parent. */
@Component({ selector: 'app-toast', templateUrl: './toast.html', styleUrl: './toast.scss' })
export class ToastComponent {
  // Inputs describe the toast; the output asks the parent to close it.
  @Input() open = false;
  @Input() type: ToastType = 'success';
  @Input() title = '';
  @Input() message = '';
  @Output() readonly dismiss = new EventEmitter<void>();
}
