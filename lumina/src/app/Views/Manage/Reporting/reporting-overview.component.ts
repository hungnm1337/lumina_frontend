import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ManagerAnalyticsService } from '../../../Services/ManagerAnalytics/manager-analytics.service';
import {
  ManagerAnalyticsOverviewDTO,
  ActiveUsersDTO,
  TopArticleDTO,
  TopVocabularyDTO,
  TopEventDTO,
  TopSlideDTO,
  TopExamDTO,
  ExamCompletionRateDTO,
  ArticleCompletionRateDTO,
  VocabularyCompletionRateDTO,
  EventParticipationRateDTO
} from '../../../Interfaces/manager-analytics.interfaces';

@Component({
  selector: 'app-reporting-overview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporting-overview.component.html',
  styleUrls: ['./reporting-overview.component.scss']
})
export class ReportingOverviewComponent implements OnInit {
  isLoading = false;
  errorMessage = '';

  // Data
  overview: ManagerAnalyticsOverviewDTO | null = null;
  activeUsers: ActiveUsersDTO | null = null;

  // Top Content Tabs
  topContentActiveTab: 'articles' | 'vocabulary' | 'events' | 'slides' | 'exams' = 'articles';

  // Completion Rates Tabs
  completionRatesActiveTab: 'exams' | 'articles' | 'vocabulary' | 'events' = 'exams';

  // Filters
  selectedDays: number = 30;
  topN: number = 10;

  constructor(private analyticsService: ManagerAnalyticsService) {}

  ngOnInit(): void {
    this.loadOverview();
  }

  loadOverview(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.analyticsService.getOverview(this.topN, this.selectedDays).subscribe({
      next: (response) => {
        console.log('API Response:', response);
        if (response.success) {
          this.overview = response.data;
          this.activeUsers = response.data.activeUsers;
          console.log('Data loaded successfully:', this.overview);
        } else {
          this.errorMessage = response.message || 'Không thể tải dữ liệu';
          console.error('API returned success=false:', response);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading overview:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error,
          url: error.url
        });
        
        // Hiển thị thông báo lỗi chi tiết hơn
        if (error.status === 0) {
          this.errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc đảm bảo backend đang chạy.';
        } else if (error.status === 401) {
          this.errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        } else if (error.status === 403) {
          this.errorMessage = 'Bạn không có quyền truy cập tính năng này.';
        } else if (error.status === 404) {
          this.errorMessage = 'API endpoint không tìm thấy. Vui lòng kiểm tra lại cấu hình.';
        } else if (error.status >= 500) {
          this.errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
        } else {
          this.errorMessage = error.error?.message || error.message || 'Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.';
        }
        this.isLoading = false;
      }
    });
  }

  refreshData(): void {
    this.loadOverview();
  }

  onDaysChange(): void {
    this.loadOverview();
  }

  onTopNChange(): void {
    this.loadOverview();
  }

  // Helper methods
  formatNumber(num: number): string {
    return num.toLocaleString('vi-VN');
  }

  formatPercentage(num: number): string {
    return num.toFixed(1) + '%';
  }

  abs(num: number): number {
    return Math.abs(num);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  }

  formatTime(minutes: number): string {
    if (minutes < 1) {
      return '< 1 phút';
    }
    if (minutes < 60) {
      return Math.round(minutes) + ' phút';
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours + 'h ' + mins + 'm';
  }

  getCompletionRateColor(rate: number): string {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  }

  getCompletionRateBadgeClass(rate: number): string {
    if (rate >= 80) return 'bg-green-100 text-green-800';
    if (rate >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }
}

