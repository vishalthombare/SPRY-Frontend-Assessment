import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';

/** Tracks all active API requests so the application can show one global loader. */
@Injectable({ providedIn: 'root' })
export class ApiLoadingService {
  private readonly activeRequestsSubject = new BehaviorSubject(0);
  readonly loading$ = this.activeRequestsSubject.pipe(
    map((count) => count > 0),
    distinctUntilChanged(),
  );

  requestStarted(): void {
    this.activeRequestsSubject.next(this.activeRequestsSubject.value + 1);
  }

  requestFinished(): void {
    this.activeRequestsSubject.next(Math.max(0, this.activeRequestsSubject.value - 1));
  }
}
