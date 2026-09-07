import { Routes } from '@angular/router';

/** Lazy route definition for the unified assessment overview page. */
export const ASSESSMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/assessment-overview/assessment-overview').then(
        (m) => m.AssessmentOverviewComponent,
      ),
    title: 'Assessment Overview | SPRY',
  },
];
