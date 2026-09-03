import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({ selector: 'app-layout', imports: [RouterLink, RouterLinkActive, RouterOutlet], templateUrl: './app-layout.html', styleUrl: './app-layout.scss' })
export class AppLayout {
  readonly menuOpen = signal(false);
  constructor(private readonly auth: AuthService, private readonly router: Router) {}
  closeMenu(): void { this.menuOpen.set(false); }
  logout(): void { this.auth.logout(); void this.router.navigate(['/login']); }
}
