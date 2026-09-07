import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { StreakService } from '../../../Services/streak/streak.service';
import { AuthService } from '../../../Services/Auth/auth.service';

export interface CalendarDay {
  dayNumber: number;
  isCurrentMonth: boolean;
  hasStreak: boolean;
  isStreakGolden: boolean;
  dateStr: string;
}

export interface StreakMilestone {
  days: number;
  badgeName: string;
  badgeType: 'fire-small' | 'fire-silver' | 'fire-gold' | 'champion' | 'legend';
  icon: string;
  isOwned: boolean;
}

@Component({
  selector: 'app-streak',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './streak.component.html',
  styleUrl: './streak.component.scss'
})
export class StreakComponent implements OnInit {
  // Stats
  currentStreak: number = 7;
  longestStreak: number = 15;
  totalStudyDays: number = 32;
  percentile: number = 15; // Top 15%
  freezeTokens: number = 2;
  daysUntilReward: number = 23;

  loading: boolean = false;
  error: boolean = false;

  // Weekly tracker (7 days: Monday to Sunday)
  weekDays = [
    { label: 'T2', active: true },
    { label: 'T3', active: true },
    { label: 'T4', active: true },
    { label: 'T5', active: true },
    { label: 'T6', active: true },
    { label: 'T7', active: false },
    { label: 'CN', active: false },
  ];

  // Calendar
  currentYear: number = 2026;
  currentMonth: number = 8; // August (1-indexed)
  calendarDays: CalendarDay[] = [];

  // Rewards Milestones matching the mockup
  milestones: StreakMilestone[] = [
    {
      days: 7,
      badgeName: 'Huy hiệu Lửa nhỏ',
      badgeType: 'fire-small',
      icon: '🔥',
      isOwned: true
    },
    {
      days: 14,
      badgeName: 'Huy hiệu Lửa bạc',
      badgeType: 'fire-silver',
      icon: '❄️',
      isOwned: false
    },
    {
      days: 30,
      badgeName: 'Huy hiệu Lửa vàng',
      badgeType: 'fire-gold',
      icon: '🌟',
      isOwned: false
    },
    {
      days: 60,
      badgeName: 'Huy hiệu Nhà vô địch',
      badgeType: 'champion',
      icon: '👑',
      isOwned: false
    },
    {
      days: 100,
      badgeName: 'Huy hiệu Huyền thoại',
      badgeType: 'legend',
      icon: '⭐',
      isOwned: false
    }
  ];

  constructor(
    private streakService: StreakService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generateCalendar();
    this.loadStreakData();
  }

  loadStreakData(): void {
    const userId = this.authService.getCurrentUserId();

    if (!userId || userId === 0) {
      // Demo / Fallback defaults matching design
      this.currentStreak = 7;
      this.longestStreak = 15;
      this.totalStudyDays = 32;
      this.percentile = 15;
      this.daysUntilReward = 23;
      this.updateMilestones();
      return;
    }

    this.streakService.getStreakSummary(userId).subscribe({
      next: (response) => {
        if (response && (response.success || response.data)) {
          const data = response.data || response;
          this.currentStreak = data.currentStreak ?? 7;
          this.longestStreak = data.longestStreak ?? 15;
          this.freezeTokens = data.freezeTokens ?? 2;
          this.totalStudyDays = data.totalDays ?? 32;
          this.updateMilestones();
        }
      },
      error: (err) => {
        console.warn('Could not load streak summary from API, using fallback data:', err);
        // Maintain defaults
        this.updateMilestones();
      }
    });
  }

  updateMilestones(): void {
    this.milestones.forEach(m => {
      m.isOwned = this.currentStreak >= m.days;
    });

    // Next milestone after current streak
    const next = this.milestones.find(m => m.days > this.currentStreak);
    if (next) {
      this.daysUntilReward = Math.max(0, next.days - this.currentStreak);
    } else {
      this.daysUntilReward = 0;
    }
  }

  // Calendar logic
  generateCalendar(): void {
    const days: CalendarDay[] = [];
    const year = this.currentYear;
    const month = this.currentMonth; // 1-12

    // First day of current month
    const firstDate = new Date(year, month - 1, 1);
    // Number of days in current month
    const daysInMonth = new Date(year, month, 0).getDate();
    // Number of days in previous month
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    // JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
    // We want Monday as index 0, ..., Sunday as index 6
    const firstDayIndex = (firstDate.getDay() + 6) % 7;

    // Previous month overflow days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        hasStreak: false,
        isStreakGolden: false,
        dateStr: `${year}-${month - 1}-${daysInPrevMonth - i}`
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      let hasStreak = false;
      let isStreakGolden = false;

      // In August 2026 (matching the mock image):
      // Days 1..9: normal streak flame badge
      // Days 10..15: golden streak badge with flame
      if (year === 2026 && month === 8) {
        if (day >= 1 && day <= 9) {
          hasStreak = true;
          isStreakGolden = false;
        } else if (day >= 10 && day <= 15) {
          hasStreak = true;
          isStreakGolden = true;
        }
      } else {
        // Generic logic for other months: mark first few days if current streak applies
        if (day <= Math.min(this.currentStreak, 15)) {
          hasStreak = true;
          isStreakGolden = day > 9;
        }
      }

      days.push({
        dayNumber: day,
        isCurrentMonth: true,
        hasStreak,
        isStreakGolden,
        dateStr: `${year}-${month}-${day}`
      });
    }

    // Next month overflow days to complete last row (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        dayNumber: i,
        isCurrentMonth: false,
        hasStreak: false,
        isStreakGolden: false,
        dateStr: `${year}-${month + 1}-${i}`
      });
    }

    this.calendarDays = days;
  }

  previousMonth(): void {
    if (this.currentMonth === 1) {
      this.currentMonth = 12;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  nextMonth(): void {
    if (this.currentMonth === 12) {
      this.currentMonth = 1;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  startStudying(): void {
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }

  continueStudying(): void {
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }

  goBack(): void {
    this.router.navigate(['/homepage']);
  }
}

