import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { ApiLoadingService } from './core/api/api-loading.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly apiLoading = inject(ApiLoadingService);
  readonly apiRequestPending = toSignal(this.apiLoading.loading$, { initialValue: false });
}
