import { Component, Input } from '@angular/core';
@Component({ selector: 'app-task-summary-card', templateUrl: './task-summary-card.html', styleUrl: './task-summary-card.scss' })
export class TaskSummaryCardComponent { @Input() label = ''; @Input() value: number | string = 0; @Input() hint = ''; @Input() icon = '✓'; @Input() tone: 'blue' | 'amber' | 'green' = 'blue'; }
