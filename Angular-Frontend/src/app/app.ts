import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { ApiLoadingService } from './core/api/api-loading.service';

/** Root standalone component that hosts routed pages and global application feedback. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly apiLoading = inject(ApiLoadingService);
  // toSignal makes the RxJS loading stream directly readable by the root template.
  readonly apiRequestPending = toSignal(this.apiLoading.loading$, { initialValue: false });
}
