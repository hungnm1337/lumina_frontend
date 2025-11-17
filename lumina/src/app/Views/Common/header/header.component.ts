import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../../Services/Auth/auth.service';
import { AuthUserResponse } from '../../../Interfaces/auth.interfaces';
import { StreakService } from '../../../Services/streak/streak.service';
import { QuotaService } from '../../../Services/Quota/quota.service';
import { UpgradeModalComponent } from '../../User/upgrade-modal/upgrade-modal.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, UpgradeModalComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  currentUser$!: Observable<AuthUserResponse | null>;
  isDropdownOpen = false;
  isPremium = false;
  showUpgradeModal = false;

  // Streak data
  currentStreak = 0;
  streakLoading = true;

  constructor(
    private authService: AuthService,
    private elementRef: ElementRef,
    private router: Router,
    private streakService: StreakService,
    private quotaService: QuotaService
  ) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
    this.loadStreakData();
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
      }
    });
  }

  // ✅ Lấy emoji (chỉ 1 loại)
  getFireEmoji(): string {
    return this.currentStreak === 0 ? '🌱' : '🔥';
  }

  // ✅ Lấy intensity level cho animation
  getFireIntensity(): string {
    if (this.currentStreak === 0) return 'seed';
    if (this.currentStreak < 7) return 'gentle'; // 1-6 ngày: nhẹ nhàng
    if (this.currentStreak < 30) return 'strong'; // 7-29 ngày: mạnh mẽ
    return 'intense'; // 30+ ngày: dữ dội
  }

  // ✅ Lấy size emoji
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

  // ✅ SỬA: Navigate to streak page (path mới)
  goToStreakPage(): void {
    this.router.navigate(['/homepage/streak']); // ✅ Thêm /homepage/
    this.checkPremiumStatus();
  }

  checkPremiumStatus(): void {
    this.quotaService.isPremiumUser().subscribe({
      next: (isPremium) => {
        this.isPremium = isPremium;
        console.log('✅ Premium status checked:', isPremium);
      },
      error: (err) => {
        console.error('❌ Error checking premium status:', err);
        this.isPremium = false;
      },
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

  openUpgradeModal(): void {
    this.showUpgradeModal = true;
  }

  closeUpgradeModal(): void {
    this.showUpgradeModal = false;
  }
}
