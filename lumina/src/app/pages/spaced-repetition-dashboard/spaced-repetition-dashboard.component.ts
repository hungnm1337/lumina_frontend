import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../Views/Common/header/header.component';
import { SpacedRepetitionService, SpacedRepetition } from '../../Services/spaced-repetition/spaced-repetition.service';

@Component({
  selector: 'app-spaced-repetition-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './spaced-repetition-dashboard.component.html',
  styleUrls: ['./spaced-repetition-dashboard.component.scss']
})
export class SpacedRepetitionDashboardComponent implements OnInit {
  // Statistics
  spacedRepetitionStats: {
    dueToday: number;
    learning: number;
    mastered: number;
    total: number;
  } | null = null;

  // Lists
  dueTodayLists: SpacedRepetition[] = [];
  upcomingLists: SpacedRepetition[] = [];
  allRepetitions: SpacedRepetition[] = [];

  // Loading states
  isLoadingStats = false;
  isLoadingDue = false;
  isLoadingUpcoming = false;

  // Filter
  filterStatus: 'all' | 'due' | 'learning' | 'mastered' = 'all';

  constructor(
    private spacedRepetitionService: SpacedRepetitionService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loadStatistics();
    this.loadDueToday();
    this.loadUpcoming();
  }

  loadStatistics(): void {
    this.isLoadingStats = true;
    
    this.spacedRepetitionService.getAllRepetitions().subscribe({
      next: (repetitions) => {
        const now = new Date();
        
        // Tính toán thống kê - chỉ tính những từ đã được review với đánh giá thấp
        const dueToday = repetitions.filter(r => {
          if (!r.nextReviewAt || r.reviewCount === 0) return false;
          const reviewDate = new Date(r.nextReviewAt);
          // Chỉ tính những từ đã review và có intervals = 1 (đánh giá thấp)
          return reviewDate <= now && (r.status === 'New' || r.status === 'Learning') && r.intervals === 1;
        });

        const learning = repetitions.filter(r => r.status === 'Learning' && r.reviewCount > 0);
        const mastered = repetitions.filter(r => r.status === 'Mastered');
        
        this.spacedRepetitionStats = {
          dueToday: dueToday.length,
          learning: learning.length,
          mastered: mastered.length,
          total: repetitions.filter(r => r.reviewCount > 0).length  // Chỉ tính những từ đã review
        };

        this.allRepetitions = repetitions;
        this.isLoadingStats = false;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.isLoadingStats = false;
      }
    });
  }

  loadDueToday(): void {
    this.isLoadingDue = true;
    
    this.spacedRepetitionService.getDueForReview().subscribe({
      next: (repetitions) => {
        this.dueTodayLists = repetitions;
        this.isLoadingDue = false;
      },
      error: (error) => {
        console.error('Error loading due today:', error);
        this.isLoadingDue = false;
      }
    });
  }

  loadUpcoming(): void {
    this.isLoadingUpcoming = true;
    
    this.spacedRepetitionService.getAllRepetitions().subscribe({
      next: (repetitions) => {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // Lọc những từ sẽ review trong 7 ngày tới
        this.upcomingLists = repetitions
          .filter(r => {
            if (!r.nextReviewAt) return false;
            const reviewDate = new Date(r.nextReviewAt);
            return reviewDate > now && reviewDate <= nextWeek && (r.status === 'New' || r.status === 'Learning');
          })
          .sort((a, b) => {
            if (!a.nextReviewAt || !b.nextReviewAt) return 0;
            return new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime();
          })
          .slice(0, 10); // Lấy 10 item đầu tiên
        
        this.isLoadingUpcoming = false;
      },
      error: (error) => {
        console.error('Error loading upcoming:', error);
        this.isLoadingUpcoming = false;
      }
    });
  }

  // Navigate to deck detail để review
  goToDeck(listId: number): void {
    this.router.navigate(['/flashcards', listId]);
  }

  // Start reviewing all due vocabulary
  startDueReviews(): void {
    if (this.dueTodayLists && this.dueTodayLists.length > 0) {
      // Navigate to first due vocabulary list
      this.router.navigate(['/flashcards', this.dueTodayLists[0].vocabularyListId]);
    }
  }

  // Format date
  formatDate(dateString?: string | null): string {
    if (!dateString) return 'Chưa có';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Format datetime
  formatDateTime(dateString?: string | null): string {
    if (!dateString) return 'Chưa có';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get days until review
  getDaysUntilReview(dateString?: string | null): number {
    if (!dateString) return 0;
    const reviewDate = new Date(dateString);
    const now = new Date();
    const diffTime = reviewDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Get status badge class
  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'new':
        return 'badge-new';
      case 'learning':
        return 'badge-learning';
      case 'mastered':
        return 'badge-mastered';
      default:
        return 'badge-default';
    }
  }

  // Get filtered repetitions
  get filteredRepetitions(): SpacedRepetition[] {
    if (!this.allRepetitions || this.allRepetitions.length === 0) return [];
    
    switch (this.filterStatus) {
      case 'due':
        return this.allRepetitions.filter(r => r.isDue);
      case 'learning':
        return this.allRepetitions.filter(r => r.status === 'Learning');
      case 'mastered':
        return this.allRepetitions.filter(r => r.status === 'Mastered');
      default:
        return this.allRepetitions;
    }
  }

  // Set filter
  setFilter(status: 'all' | 'due' | 'learning' | 'mastered'): void {
    this.filterStatus = status;
  }

  // Go back
  goBack(): void {
    this.router.navigate(['/vocabulary']);
  }
}

