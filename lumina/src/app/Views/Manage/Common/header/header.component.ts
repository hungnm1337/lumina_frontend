import { Component, EventEmitter, Output, OnInit, ElementRef, HostListener, OnDestroy } from '@angular/core';
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
  @Output() sidebarToggle = new EventEmitter<void>();
  pageTitle = 'Manager Panel';
  isDropdownOpen = false;
  currentUser$!: Observable<AuthUserResponse | null>;
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
      this.pageTitle = data['title'] || 'Manager Panel';
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
    this.router.navigate(['/manager/notifications']);
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
        console.error('Error loading profile:', err);
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
  
  logout(): void {
    this.isDropdownOpen = false;
    this.authService.logout();
  }
}