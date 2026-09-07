import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { APP_ROUTES } from '../core/constants/routes.constants';

/** Protected application shell containing the header, navigation, and routed content. */
@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayout {
  // Injected services coordinate authentication and navigation without owning UI state.
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  // viewChild is a signal-based reference used to detect clicks outside the profile menu.
  private readonly profileMenu = viewChild<ElementRef<HTMLElement>>('profileMenu');
  // Signals drive the responsive sidebar and profile dropdown visibility.
  readonly menuOpen = signal(false);
  readonly profileOpen = signal(false);

  /** @HostListener closes the profile menu when a document click occurs outside it. */
  @HostListener('document:click', ['$event'])
  closeProfileOnOutsideClick(event: MouseEvent): void {
    const menu = this.profileMenu()?.nativeElement;

    if (this.profileOpen() && menu && !menu.contains(event.target as Node)) {
      this.profileOpen.set(false);
    }
  }

  /** Provide standard keyboard dismissal for the profile menu. */
  @HostListener('document:keydown.escape')
  closeProfileOnEscape(): void {
    this.profileOpen.set(false);
  }

  /** Close the mobile navigation drawer after selecting a destination. */
  closeMenu(): void {
    this.menuOpen.set(false);
  }
  /** End the backend session, clear local auth state, and return to login. */
  logout(): void {
    this.profileOpen.set(false);
    this.auth.logout().subscribe({
      next: () => void this.router.navigate([APP_ROUTES.login]),
      error: () => void this.router.navigate([APP_ROUTES.login]),
    });
  }
}
