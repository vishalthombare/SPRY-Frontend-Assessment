import { Component, Input } from '@angular/core';
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyStateComponent {
  @Input() icon = '✓';
  @Input() title = 'Nothing here yet';
  @Input() description = 'New items will appear here.';
}
