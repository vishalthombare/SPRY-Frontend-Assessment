import { Component } from '@angular/core';
import { AssessmentSummaryComponent } from '../../components/assessment-summary/assessment-summary';
import { AssignmentOverviewComponent } from '../../components/assignment-overview/assignment-overview';
import { EvaluationChecklistComponent } from '../../components/evaluation-checklist/evaluation-checklist';
import { RequirementsListComponent } from '../../components/requirements-list/requirements-list';
import { SubmissionResourcesComponent } from '../../components/submission-resources/submission-resources';

@Component({
  selector: 'app-assessment-overview',
  imports: [
    AssessmentSummaryComponent,
    AssignmentOverviewComponent,
    EvaluationChecklistComponent,
    RequirementsListComponent,
    SubmissionResourcesComponent,
  ],
  templateUrl: './assessment-overview.html',
  styleUrl: './assessment-overview.scss',
})
export class AssessmentOverviewComponent {}
