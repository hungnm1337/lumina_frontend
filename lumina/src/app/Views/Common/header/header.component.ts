import { Component, ElementRef, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../../../Services/Auth/auth.service';
import { AuthUserResponse } from '../../../Interfaces/auth.interfaces';
import { StreakService } from '../../../Services/streak/streak.service';
import { QuotaService } from '../../../Services/Quota/quota.service';
import { UpgradeModalComponent } from '../../User/upgrade-modal/upgrade-modal.component';
import { ReportPopupComponent } from '../../User/Report/report-popup/report-popup.component';
import { UserService } from '../../../Services/User/user.service';
import { SignalRService } from '../../../Services/SignalR/signalr.service';
import { NotificationService } from '../../../Services/Notification/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, UpgradeModalComponent, ReportPopupComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser$!: Observable<AuthUserResponse | null>;

  
  isDropdownOpen = false;
  isPremium = false;
  showUpgradeModal = false;

  // Streak data
  currentStreak = 0;
  streakLoading = true;

  // Notification badge
  unreadNotificationCount = 0;
  private signalRSubscription?: Subscription;
  private unreadCountSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private elementRef: ElementRef,
    private router: Router,
    private streakService: StreakService,
    private quotaService: QuotaService,
    private userService: UserService,
    private signalRService: SignalRService,
    private notificationService: NotificationService
  ) {}

  showReportPopup: boolean = false;

  openReportPopup(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = false;
    this.showReportPopup = true;
  }

  onReportPopupClose(): void {
    this.showReportPopup = false;
    try {
      // force change detection in some modal contexts
      (this as any).cdr?.detectChanges();
    } catch {}
  }

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
    this.loadStreakData();
    this.loadUserProfile();
    this.checkPremiumStatus();
    this.loadUnreadNotificationCount();

    // ✅ Subscribe to unread count updates from NotificationService
    this.unreadCountSubscription = this.notificationService.unreadCount$.subscribe(
      count => {
        this.unreadNotificationCount = count;
        // console.log('Unread count updated in header:', count);
      }
    );

    // ✅ Listen for realtime notifications and refresh count
    this.signalRSubscription = this.signalRService.notificationReceived$.subscribe(
      (notification) => {
        // console.log('New notification received in header:', notification);
        // Refresh unread count from server when new notification arrives
        this.loadUnreadNotificationCount();
      }
    );
  }

  ngOnDestroy(): void {
    if (this.signalRSubscription) {
      this.signalRSubscription.unsubscribe();
    }
    if (this.unreadCountSubscription) {
      this.unreadCountSubscription.unsubscribe();
    }
  }

  loadUserProfile(): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId || userId === 0) return;

    this.userService.getProfile().subscribe({
      next: (profile) => {
        if (profile.avatarUrl) {
          this.authService.updateCurrentUser({
            avatarUrl: profile.avatarUrl,
            name: profile.fullName,
          });
        }
      },
      error: (err) => {
        console.error('Error loading profile for header:', err);
      },
    });
  }

  loadStreakData(): void {
    const userId = this.authService.getCurrentUserId();

    if (!userId || userId === 0) {
      this.streakLoading = false;
      return;
    }

    this.streakService.getStreakSummary(userId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentStreak = response.data.currentStreak || 0;
          this.streakLoading = false;
        }
      },
      error: (err) => {
        console.error('Error loading streak:', err);
        this.currentStreak = 0;
        this.streakLoading = false;
      },
    });
  }

  // Lấy emoji (chỉ 1 loại)
  getFireEmoji(): string {
    return this.currentStreak === 0 ? '🌱' : '🔥';
  }

  //  Lấy intensity level cho animation
  getFireIntensity(): string {
    if (this.currentStreak === 0) return 'seed';
    if (this.currentStreak < 7) return 'gentle'; // 1-6 ngày: nhẹ nhàng
    if (this.currentStreak < 30) return 'strong'; // 7-29 ngày: mạnh mẽ
    return 'intense'; // 30+ ngày: dữ dội
  }

  // Lấy size emoji
  getFireSize(): string {
    if (this.currentStreak === 0) return '1.25rem';
    if (this.currentStreak < 7) return '1.25rem';
    if (this.currentStreak < 30) return '1.4rem';
    return '1.6rem'; // Lửa to hơn khi streak cao
  }

  getStreakDisplayText(): string {
    if (this.streakLoading) return '...';
    return this.currentStreak.toString();
  }

  goToStreakPage(): void {
    this.router.navigate(['/streak']);
    this.checkPremiumStatus();
  }

  checkPremiumStatus(): void {
    this.quotaService.isPremiumUser().subscribe({
      next: (isPremium) => {
        this.isPremium = isPremium;
        // console.log('Premium status checked:', isPremium);
      },
      error: (err) => {
        console.error('❌ Error checking premium status:', err);
        this.isPremium = false;
      },
    });
  }

  loadUnreadNotificationCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadNotificationCount = response.unreadCount;
      },
      error: (err) => {
        console.error('Error loading unread notification count:', err);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  logout(): void {
    this.isDropdownOpen = false;
    this.authService.logout();
  }

  goToProfile(): void {
    this.isDropdownOpen = false;
    this.router.navigate(['/profile']);
  }

  moveToExams() {
    this.router.navigate(['homepage/user-dashboard']);
  }

  goToNotifications(): void {
    this.router.navigate(['/homepage/notifications']);
  }

  openUpgradeModal(): void {
    this.showUpgradeModal = true;
  }

  closeUpgradeModal(): void {
    this.showUpgradeModal = false;
  }
}
