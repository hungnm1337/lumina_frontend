import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface StaffStats {
  totalArticles: number;
  totalQuestions: number;
  totalTests: number;
  totalVocabulary: number;
  articlesThisMonth: number;
  questionsThisMonth: number;
  testsThisMonth: number;
  vocabularyThisMonth: number;
}

interface RecentActivity {
  id: number;
  type: 'article' | 'question' | 'test' | 'vocabulary';
  title: string;
  action: string;
  timestamp: string;
  status: 'created' | 'updated' | 'published' | 'reviewed';
}

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
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  staffStats: StaffStats = {
    totalArticles: 24,
    totalQuestions: 1247,
    totalTests: 18,
    totalVocabulary: 856,
    articlesThisMonth: 5,
    questionsThisMonth: 89,
    testsThisMonth: 3,
    vocabularyThisMonth: 42
  };

  recentActivities: RecentActivity[] = [
    {
      id: 1,
      type: 'article',
      title: '10 Tips cải thiện Listening TOEIC',
      action: 'Đã xuất bản bài viết',
      timestamp: '5 phút trước',
      status: 'published'
    },
    {
      id: 2,
      type: 'question',
      title: 'Listening Part 1 - Question #145',
      action: 'Tạo câu hỏi mới',
      timestamp: '15 phút trước',
      status: 'created'
    },
    {
      id: 3,
      type: 'test',
      title: 'TOEIC Mock Test 2024 - Set 5',
      action: 'Cập nhật bài thi',
      timestamp: '1 giờ trước',
      status: 'updated'
    },
    {
      id: 4,
      type: 'vocabulary',
      title: 'Business English - Unit 3',
      action: 'Thêm từ vựng mới',
      timestamp: '2 giờ trước',
      status: 'created'
    },
    {
      id: 5,
      type: 'article',
      title: 'Reading Strategies for Part 7',
      action: 'Chờ duyệt bài viết',
      timestamp: '3 giờ trước',
      status: 'reviewed'
    }
  ];

  quickActions: QuickAction[] = [
    {
      title: 'Tạo bài viết mới',
      description: 'Viết hướng dẫn học TOEIC',
      icon: 'fas fa-edit',
      route: '/staff/articles',
      color: 'purple'
    },
    {
      title: 'Thêm câu hỏi',
      description: 'Tạo câu hỏi luyện tập',
      icon: 'fas fa-question-circle',
      route: '/staff/questions',
      color: 'blue'
    },
    {
      title: 'Tạo bài thi',
      description: 'Thiết kế bài thi mới',
      icon: 'fas fa-clipboard-list',
      route: '/staff/tests',
      color: 'green'
    },
    {
      title: 'Quản lý từ vựng',
      description: 'Bổ sung từ vựng mới',
      icon: 'fas fa-spell-check',
      route: '/staff/vocabulary',
      color: 'orange'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // Initialize dashboard data
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
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  getTotalContent(): number {
    return this.staffStats.totalArticles + 
           this.staffStats.totalQuestions + 
           this.staffStats.totalTests + 
           this.staffStats.totalVocabulary;
  }

  getThisMonthContent(): number {
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
}
