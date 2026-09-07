import { Component, Input } from '@angular/core';

/** Reusable inline loading state with an accessible, customizable label. */
@Component({
  selector: 'app-loading-spinner',
  templateUrl: './loading-spinner.html',
  styleUrl: './loading-spinner.scss',
})
export class LoadingSpinnerComponent {
  /** Text announced and displayed while the parent content is loading. */
  @Input() label = 'Loading…';
}
