import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Introduces the assignment and links reviewers to its task implementation. */
@Component({
  selector: 'app-assignment-overview',
  imports: [RouterLink],
  templateUrl: './assignment-overview.html',
  styleUrl: './assignment-overview.scss',
})
export class AssignmentOverviewComponent {}
