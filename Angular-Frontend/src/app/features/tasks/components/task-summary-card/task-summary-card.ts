import { Component, Input } from '@angular/core';

/** Reusable presentation card for one derived task summary value. */
@Component({
  selector: 'app-task-summary-card',
  templateUrl: './task-summary-card.html',
  styleUrl: './task-summary-card.scss',
})
export class TaskSummaryCardComponent {
  // Inputs allow the same component to represent every status and visual tone.
  @Input() label = '';
  @Input() value: number | string = 0;
  @Input() hint = '';
  @Input() icon = '✓';
  @Input() tone: 'purple' | 'amber' | 'green' = 'purple';
}
