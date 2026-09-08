import { Component } from '@angular/core';
import { EXTERNAL_LINKS } from '../../../../core/constants/external-links.constants';

/** Groups reliable reviewer links without fetching external repository metadata. */
@Component({
  selector: 'app-submission-resources',
  templateUrl: './submission-resources.html',
  styleUrl: './submission-resources.scss',
})
export class SubmissionResourcesComponent {
  readonly resources = [
    {
      label: 'Primary resource',
      title: 'Git repository',
      description:
        'Review the Angular implementation, project structure, tests and commit history.',
      url: EXTERNAL_LINKS.repository,
      action: 'View repository',
    },
    {
      label: 'Documentation',
      title: 'Frontend README',
      description: 'Review setup instructions, architecture decisions, scripts and testing notes.',
      url: EXTERNAL_LINKS.frontendReadme,
      action: 'Read documentation',
    },
    {
      label: 'Optional backend',
      title: 'FastAPI documentation',
      description: 'Explore the optional production API integration and endpoint documentation.',
      url: EXTERNAL_LINKS.apiDocumentation,
      action: 'View API docs',
    },
  ] as const;
}
