import { Component } from '@angular/core';
import { EXTERNAL_LINKS } from '../../../../core/constants/external-links.constants';

/** Groups links to the live application, source repository, and documentation. */
@Component({
  selector: 'app-submission-resources',
  templateUrl: './submission-resources.html',
  styleUrl: './submission-resources.scss',
})
export class SubmissionResourcesComponent {
  readonly repositoryUrl = EXTERNAL_LINKS.repository;
}
