import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';

/** Tracks all active API requests so the application can show one global loader. */
@Injectable({ providedIn: 'root' })
export class ApiLoadingService {
  // A counter is safer than a boolean because multiple API calls can overlap.
  private readonly activeRequestsSubject = new BehaviorSubject(0);
  /** Emits true while at least one intercepted API request is active. */
  readonly loading$ = this.activeRequestsSubject.pipe(
    map((count) => count > 0),
    distinctUntilChanged(),
  );

  /** Register the start of an HTTP request. */
  requestStarted(): void {
    this.activeRequestsSubject.next(this.activeRequestsSubject.value + 1);
  }

  /** Register completion and prevent the counter from becoming negative. */
  requestFinished(): void {
    this.activeRequestsSubject.next(Math.max(0, this.activeRequestsSubject.value - 1));
  }
}
