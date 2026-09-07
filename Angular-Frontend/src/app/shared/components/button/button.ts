import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

/** Shared button API that standardizes variants, loading, and disabled behavior. */
@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class ButtonComponent {
  // Inputs configure native behavior and appearance; pressed exposes a semantic click event.
  @Input() variant: ButtonVariant = 'primary';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() block = false;
  @Output() readonly pressed = new EventEmitter<void>();
}
