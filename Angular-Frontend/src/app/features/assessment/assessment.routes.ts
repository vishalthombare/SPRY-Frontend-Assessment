import { Routes } from '@angular/router';
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
