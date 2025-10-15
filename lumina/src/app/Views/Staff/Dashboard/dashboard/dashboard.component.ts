import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatisticService } from '../../../../Services/Statistic/statistic.service';
import { ToastService } from '../../../../Services/Toast/toast.service';
import { StaffStats, RecentActivity, StaffMetrics } from '../../../../Interfaces/statistic.interfaces';

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  staffStats: StaffStats = {
    totalArticles: 0, totalQuestions: 0, totalTests: 0, totalVocabulary: 0,
    articlesThisMonth: 0, questionsThisMonth: 0, testsThisMonth: 0, vocabularyThisMonth: 0,
    articlesLastMonth: 0, questionsLastMonth: 0, testsLastMonth: 0, vocabularyLastMonth: 0
  };

  recentActivities: RecentActivity[] = [];
  metrics: StaffMetrics = {
    productivityGrowth: 0, contentLikes: 0, qualityRating: 0
  };

  isLoading = false;
  error: string | null = null;

  quickActions: QuickAction[] = [
    { title: 'Tạo bài viết mới', description: 'Viết hướng dẫn học TOEIC', icon: 'fas fa-edit', route: '/staff/articles', color: 'purple' },
    { title: 'Thêm câu hỏi', description: 'Tạo câu hỏi luyện tập', icon: 'fas fa-question-circle', route: '/staff/questions', color: 'blue' },
    { title: 'Tạo bài thi', description: 'Thiết kế bài thi mới', icon: 'fas fa-clipboard-list', route: '/staff/tests', color: 'green' },
    { title: 'Quản lý từ vựng', description: 'Bổ sung từ vựng mới', icon: 'fas fa-spell-check', route: '/staff/vocabulary', color: 'orange' }
  ];

  constructor(
    private router: Router,
    private statisticService: StatisticService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading = true;
    this.error = null;

    this.statisticService.getStaffDashboardStats().subscribe({
      next: (response) => {
        this.staffStats = response.stats;
        this.recentActivities = response.recentActivities;
        this.metrics = response.metrics;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.error = 'Không thể tải dữ liệu dashboard. Vui lòng thử lại.';
        this.toastService.error(this.error);
        this.isLoading = false;
      }
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'article': return 'fas fa-edit';
      case 'question': return 'fas fa-question-circle';
      case 'test': return 'fas fa-clipboard-list';
      case 'vocabulary': return 'fas fa-spell-check';
      default: return 'fas fa-bell';
    }
  }

  getActivityColor(type: string): string {
    switch (type) {
      case 'article': return 'purple';
      case 'question': return 'blue';
      case 'test': return 'green';
      case 'vocabulary': return 'orange';
      default: return 'gray';
    }
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'published': return 'badge-success';
      case 'created': return 'badge-info';
      case 'updated': return 'badge-warning';
      case 'reviewed': return 'badge-pending';
      default: return 'badge-default';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'published': return 'Đã xuất bản';
      case 'created': return 'Đã tạo';
      case 'updated': return 'Đã cập nhật';
      case 'reviewed': return 'Chờ duyệt';
      default: return status;
    }
  }

  getGrowthPercentage(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    const percentage = ((current - previous) / previous) * 100;
    return Math.round(percentage * 10) / 10; // Làm tròn đến 1 chữ số thập phân
  }

  getTotalContent(): number {
    if (!this.staffStats) return 0;
    return this.staffStats.totalArticles + 
           this.staffStats.totalQuestions + 
           this.staffStats.totalTests + 
           this.staffStats.totalVocabulary;
  }

  getThisMonthContent(): number {
    if (!this.staffStats) return 0;
    return this.staffStats.articlesThisMonth + 
           this.staffStats.questionsThisMonth + 
           this.staffStats.testsThisMonth + 
           this.staffStats.vocabularyThisMonth;
  }

  getCurrentDate(): string {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const now = new Date();
    const dayName = days[now.getDay()];
    const date = now.toLocaleDateString('vi-VN');
    return `${dayName}, ${date}`;
  }

  refreshData() {
    this.loadDashboardData();
  }
}