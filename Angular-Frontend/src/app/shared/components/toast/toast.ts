import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { APP_CONSTANTS } from '../../../core/constants/app.constants';

export type ToastType = 'success' | 'error' | 'info';

/** Displays transient success, error, or informational feedback from a parent. */
@Component({ selector: 'app-toast', templateUrl: './toast.html', styleUrl: './toast.scss' })
export class ToastComponent implements OnChanges, OnDestroy {
  private dismissTimer?: ReturnType<typeof setTimeout>;

  // Inputs describe the toast; the output asks the parent to close it.
  @Input() open = false;
  @Input() type: ToastType = 'success';
  @Input() title = '';
  @Input() message = '';
  @Output() readonly dismiss = new EventEmitter<void>();

  /** Restart auto-dismiss whenever a notification opens or its content changes. */
  ngOnChanges(): void {
    this.clearDismissTimer();
    if (this.open) {
      this.dismissTimer = setTimeout(() => {
        this.dismissTimer = undefined;
        this.dismiss.emit();
      }, APP_CONSTANTS.toastDurationMs);
    }
  }

  ngOnDestroy(): void {
    this.clearDismissTimer();
  }

  close(): void {
    this.clearDismissTimer();
    this.dismiss.emit();
  }

  private clearDismissTimer(): void {
    if (this.dismissTimer === undefined) return;
    clearTimeout(this.dismissTimer);
    this.dismissTimer = undefined;
  }
}
