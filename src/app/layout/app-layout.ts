import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly profileOpen = signal(false);
  closeMenu(): void {
    this.menuOpen.set(false);
  }
  logout(): void {
    this.profileOpen.set(false);
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
