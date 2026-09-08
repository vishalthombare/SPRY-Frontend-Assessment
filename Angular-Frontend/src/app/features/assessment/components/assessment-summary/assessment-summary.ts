import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith } from 'rxjs';
import { TaskCounts } from '../../../tasks/models/task.model';
import { TaskApiService } from '../../../tasks/data-access/task-api.service';

interface TaskProgressState {
  status: 'loading' | 'loaded' | 'error';
  counts: TaskCounts;
}

const EMPTY_COUNTS: TaskCounts = { total: 0, pending: 0, inProgress: 0, completed: 0 };

/** Displays the high-level assessment identity and current review state. */
@Component({
  selector: 'app-assessment-summary',
  providers: [TaskApiService],
  templateUrl: './assessment-summary.html',
  styleUrl: './assessment-summary.scss',
})
export class AssessmentSummaryComponent {
  private readonly taskApi = inject(TaskApiService);

  /** Loads only the existing summary endpoint; task rows remain owned by Task Management. */
  readonly taskProgress = toSignal<TaskProgressState>(
    this.taskApi.getSummary().pipe(
      map((counts): TaskProgressState => ({ status: 'loaded', counts })),
      startWith<TaskProgressState>({ status: 'loading', counts: EMPTY_COUNTS }),
      catchError(() => of<TaskProgressState>({ status: 'error', counts: EMPTY_COUNTS })),
    ),
    { requireSync: true },
  );
}
