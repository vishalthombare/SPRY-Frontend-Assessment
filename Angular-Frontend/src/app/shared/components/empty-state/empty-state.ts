import { Component, Input } from '@angular/core';

/** Reusable message shown when a list or page has no content to display. */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyStateComponent {
  // Inputs allow each parent to customize the same empty-state presentation.
  @Input() icon = '✓';
  @Input() title = 'Nothing here yet';
  @Input() description = 'New items will appear here.';
}
