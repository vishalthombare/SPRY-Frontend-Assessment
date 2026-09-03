import { Component, Input } from '@angular/core';
@Component({ selector: 'app-loading-spinner', templateUrl: './loading-spinner.html', styleUrl: './loading-spinner.scss' })
export class LoadingSpinnerComponent { @Input() label = 'Loading…'; }
