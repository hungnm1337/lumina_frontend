import { Component, EventEmitter, Output, OnInit, Input, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { AuthService } from './../../../../Services/Auth/auth.service';
import { UserService } from './../../../../Services/User/user.service';
import { NotificationService } from './../../../../Services/Notification/notification.service';
import { Observable, Subscription } from 'rxjs';
import { AuthUserResponse } from './../../../../Interfaces/auth.interfaces';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() sidebarToggle = new EventEmitter();
  @Input() sidebarOpen = true;

  pageTitle = 'Bài viết'; // Default title
  currentUser$!: Observable<AuthUserResponse | null>;
  isDropdownOpen = false;
  unreadNotificationCount = 0;
  private unreadCountSubscription?: Subscription;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private userService: UserService,
    private notificationService: NotificationService,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    this.currentUser$ = this.authService.currentUser$;
    this.loadUserProfile();
    this.loadUnreadCount();

    // Subscribe to unread count updates
    this.unreadCountSubscription = this.notificationService.unreadCount$.subscribe(
      count => this.unreadNotificationCount = count
    );

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      }),
      mergeMap(route => route.data)
    ).subscribe(data => {
      // Set title from route data, or use default if not provided
      this.pageTitle = data['title'] || this.getPageTitleFromUrl();
    });
  }

  ngOnDestroy(): void {
    this.unreadCountSubscription?.unsubscribe();
  }

  loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadNotificationCount = response.unreadCount;
      },
      error: (err) => {
        console.error('Failed to load unread count:', err);
      }
    });
  }

  goToNotifications(): void {
    this.router.navigate(['/staff/notifications']);
  }

  loadUserProfile(): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId || userId === 0) return;

    this.userService.getProfile().subscribe({
      next: (profile) => {
        if (profile.avatarUrl) {
          this.authService.updateCurrentUser({
            avatarUrl: profile.avatarUrl,
            name: profile.fullName
          });
        }
      },
      error: (err) => {
        console.error('Error loading profile for staff header:', err);
      }
    });
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  goToProfile(): void {
    this.isDropdownOpen = false;
    this.router.navigate(['/profile']);
  }

  toggleSidebar() {
    this.sidebarToggle.emit();
  }

  private getPageTitleFromUrl(): string {
    const url = this.router.url;
    if (url.includes('dashboard')) return 'Bảng điều khiển';
    if (url.includes('articles')) return 'Bài viết';
    if (url.includes('questions')) return 'Câu hỏi';
    if (url.includes('tests')) return 'Bài thi';
    if (url.includes('vocabulary')) return 'Từ vựng';
    if (url.includes('seasons')) return 'Mùa thi đấu';
    if (url.includes('reports')) return 'Báo cáo';
    return 'Staff Panel';
  }

  logout(): void {
    this.isDropdownOpen = false;
    this.authService.logout();
  }
}
