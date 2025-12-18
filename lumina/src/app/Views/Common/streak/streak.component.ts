import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StreakService } from '../../../Services/streak/streak.service';
import { AuthService } from '../../../Services/Auth/auth.service';
import { Router } from '@angular/router';
import { HeaderComponent } from '../header/header.component';

interface MilestoneReward {
  days: number;
  reward: string;
  freezeTokens: number;
  icon: string;
  color: string;
  reached: boolean;
}

@Component({
  selector: 'app-streak',
  standalone: true,
  imports: [CommonModule,HeaderComponent],
  templateUrl: './streak.component.html',
  styleUrl: './streak.component.scss'
})
export class StreakComponent implements OnInit {
  // Streak data
  streakData: any = null;
  loading = true;
  error = false;

  // UPDATE: Milestones với Listening & Reading tests
  milestones: MilestoneReward[] = [
    { 
      days: 3, 
      reward: 'First milestone', 
      freezeTokens: 1,
      icon: '💎', 
      color: '#3B82F6', 
      reached: false 
    },
    { 
      days: 7, 
      reward: 'One week of persistence', 
      freezeTokens: 1,
      icon: '🔥', 
      color: '#F59E0B', 
      reached: false 
    },
    { 
      days: 14, 
      reward: 'Two weeks of effort', 
      freezeTokens: 1,
      icon: '⚡', 
      color: '#EF4444', 
      reached: false 
    },
    { 
      days: 30, 
      reward: 'Perfect month', 
      freezeTokens: 1,
      icon: '🏆', 
      color: '#8B5CF6', 
      reached: false 
    },
    { 
      days: 60, 
      reward: 'Two extraordinary months', 
      freezeTokens: 2,
      icon: '👑', 
      color: '#EC4899', 
      reached: false 
    },
    { 
      days: 100, 
      reward: 'Peak discipline', 
      freezeTokens: 3,
      icon: '🌟', 
      color: '#10B981', 
      reached: false 
    },
    { 
      days: 180, 
      reward: 'Half a year outstanding', 
      freezeTokens: 5,
      icon: '💫', 
      color: '#6366F1', 
      reached: false 
    },
    { 
      days: 365, 
      reward: 'Legendary year', 
      freezeTokens: 5,
      icon: '🎖️', 
      color: '#F59E0B', 
      reached: false 
    },
  ];

  // Current streak info
  currentStreak = 0;
  longestStreak = 0;
  freezeTokens = 0;
  lastPracticeDate: string | null = null;
  nextMilestone: MilestoneReward | null = null;
  progressPercent = 0;

  constructor(
    private streakService: StreakService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStreakData();
  }

  loadStreakData(): void {
    const userId = this.authService.getCurrentUserId();

    if (!userId || userId === 0) {
      this.error = true;
      this.loading = false;
      return;
    }

    this.streakService.getStreakSummary(userId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.streakData = response.data;
          this.currentStreak = response.data.currentStreak || 0;
          this.longestStreak = response.data.longestStreak || 0;
          this.freezeTokens = response.data.freezeTokens || 0;
          this.lastPracticeDate = response.data.lastPracticeDate;

          // Update milestones reached status
          this.updateMilestonesStatus();

          // Calculate next milestone
          this.calculateNextMilestone();

          this.loading = false;
        }
      },
      error: (err) => {
        console.error('Error loading streak:', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  updateMilestonesStatus(): void {
    this.milestones.forEach(milestone => {
      milestone.reached = this.currentStreak >= milestone.days;
    });
  }

  calculateNextMilestone(): void {
    const upcomingMilestones = this.milestones.filter(m => m.days > this.currentStreak);
    
    if (upcomingMilestones.length > 0) {
      this.nextMilestone = upcomingMilestones[0];
      const previousMilestone = this.milestones
        .filter(m => m.days <= this.currentStreak)
        .pop();
      
      const start = previousMilestone?.days || 0;
      const end = this.nextMilestone.days;
      const current = this.currentStreak;
      
      this.progressPercent = Math.round(((current - start) / (end - start)) * 100);
    } else {
      this.nextMilestone = null;
      this.progressPercent = 100;
    }
  }

  getStreakEmoji(): string {
    return this.streakService.getStreakEmoji(this.currentStreak);
  }

  getStreakColor(): string {
    return this.streakService.getStreakColor(this.currentStreak);
  }

  formatDate(isoDate: string | null): string {
    return this.streakService.formatDate(isoDate);
  }

  getMilestoneProgress(milestone: MilestoneReward): number {
    if (this.currentStreak >= milestone.days) return 100;
    if (this.currentStreak === 0) return 0;
    
    const previousMilestone = this.milestones
      .filter(m => m.days < milestone.days)
      .pop();
    
    const start = previousMilestone?.days || 0;
    const end = milestone.days;
    const current = Math.min(this.currentStreak, end);
    
    return Math.round(((current - start) / (end - start)) * 100);
  }

  goBack(): void {
    this.router.navigate(['/homepage']);
  }

  getDaysUntilNextMilestone(): number {
    return this.nextMilestone ? this.nextMilestone.days - this.currentStreak : 0;
  }

  getPreviousMilestoneDays(): number {
    const previousMilestone = this.milestones
      .filter(m => m.days <= this.currentStreak)
      .pop();
    return previousMilestone?.days || 0;
  }

  getDaysCompletedFromPrevious(): number {
    return this.currentStreak - this.getPreviousMilestoneDays();
  }

  getTotalDaysToNextMilestone(): number {
    if (!this.nextMilestone) return 0;
    return this.nextMilestone.days - this.getPreviousMilestoneDays();
  }

  // THÊM: Helper method format rewards
  getRewardSummary(milestone: MilestoneReward): string {
    if (milestone.freezeTokens > 0) {
      return `${milestone.freezeTokens} Freeze Token${milestone.freezeTokens > 1 ? 's' : ''}`;
    }
    return '';
  }

  // THÊM: Methods cho fire animation
  getFireEmoji(): string {
    return this.currentStreak === 0 ? '🌱' : '🔥';
  }

  getFireIntensity(): string {
    if (this.currentStreak === 0) return 'seed';
    if (this.currentStreak < 7) return 'gentle';
    if (this.currentStreak < 30) return 'strong';
    return 'intense';
  }
}
