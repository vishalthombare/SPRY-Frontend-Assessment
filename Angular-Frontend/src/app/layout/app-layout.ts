import { Component, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
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
  private readonly profileMenu = viewChild<ElementRef<HTMLElement>>('profileMenu');
  readonly menuOpen = signal(false);
  readonly profileOpen = signal(false);

  @HostListener('document:click', ['$event'])
  closeProfileOnOutsideClick(event: MouseEvent): void {
    const menu = this.profileMenu()?.nativeElement;

    if (this.profileOpen() && menu && !menu.contains(event.target as Node)) {
      this.profileOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeProfileOnEscape(): void {
    this.profileOpen.set(false);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
  logout(): void {
    this.profileOpen.set(false);
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
