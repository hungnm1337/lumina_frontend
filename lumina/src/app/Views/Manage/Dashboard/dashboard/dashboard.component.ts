import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EventService, EventDTO } from '../../../../Services/Event/event.service';
import { SlideService } from '../../../../Services/Slide/slide.service';
import { SlideDTO } from '../../../../Interfaces/slide.interface';

interface RecentActivity {
  id: number;
  type: 'event' | 'slide';
  title: string;
  action: string;
  timestamp: string;
  status: 'created' | 'updated' | 'published' | 'reviewed';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  // Loading/Error states
  isLoading = false;
  errorMessage: string | null = null;

  // Metrics for Manager (Events & Slides)
  totalEvents = 0;
  activeEvents = 0;
  upcomingEvents = 0;
  pastEvents = 0;

  totalSlides = 0;
  activeSlides = 0;

  recentEvents: EventDTO[] = [];
  recentSlides: SlideDTO[] = [];

  recentActivities: RecentActivity[] = [];

  // Quick actions for Manager
  quickActions: Array<{ title: string; description: string; icon: string; route: string; color: string }> = [
    {
      title: 'Tạo sự kiện',
      description: 'Thêm sự kiện mới',
      icon: 'fas fa-plus-circle',
      route: '/manager/events',
      color: 'green'
    },
    {
      title: 'Quản lý sự kiện',
      description: 'Xem và chỉnh sửa sự kiện',
      icon: 'fas fa-calendar-alt',
      route: '/manager/events',
      color: 'blue'
    },
    {
      title: 'Tạo slide',
      description: 'Thêm slide mới',
      icon: 'fas fa-plus',
      route: '/manager/slides',
      color: 'purple'
    },
    {
      title: 'Quản lý slide',
      description: 'Xem và chỉnh sửa slide',
      icon: 'fas fa-images',
      route: '/manager/slides',
      color: 'orange'
    }
  ];

  constructor(
    private router: Router,
    private eventService: EventService,
    private slideService: SlideService
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    forkJoin({
      events: this.eventService.GetAllEvents(),
      slides: this.slideService.getAllSlides()
    }).subscribe({
      next: ({ events, slides }) => {
        this.computeEventMetrics(events || []);
        this.computeSlideMetrics(slides || []);
        this.composeRecentActivities(events || [], slides || []);
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Không thể tải dữ liệu tổng quan.';
        this.isLoading = false;
        console.error('Manager dashboard load error', err);
      }
    });
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  private computeEventMetrics(events: EventDTO[]): void {
    const now = new Date();
    this.totalEvents = events.length;
    this.activeEvents = events.filter(e => new Date(e.startDate) <= now && new Date(e.endDate) >= now).length;
    this.upcomingEvents = events.filter(e => new Date(e.startDate) > now).length;
    this.pastEvents = events.filter(e => new Date(e.endDate) < now).length;

    this.recentEvents = [...events]
      .sort((a, b) => new Date(b.updateAt || b.createAt).getTime() - new Date(a.updateAt || a.createAt).getTime())
      .slice(0, 5);
  }

  private computeSlideMetrics(slides: SlideDTO[]): void {
    this.totalSlides = (slides || []).length;
    this.activeSlides = (slides || []).filter(s => s.isActive).length;

    this.recentSlides = [...(slides || [])]
      .sort((a, b) => new Date((b as any).updateAt || (b as any).createAt || 0).getTime() - new Date((a as any).updateAt || (a as any).createAt || 0).getTime())
      .slice(0, 5);
  }

  private composeRecentActivities(events: EventDTO[], slides: SlideDTO[]): void {
    const activities: RecentActivity[] = [];

    this.recentEvents.forEach((e, idx) => {
      activities.push({
        id: idx + 1,
        type: 'event',
        title: e.eventName,
        action: 'Cập nhật sự kiện',
        timestamp: this.formatRelativeTime(e.updateAt || e.createAt),
        status: 'updated'
      });
    });

    this.recentSlides.forEach((s, idx) => {
      activities.push({
        id: 100 + idx + 1,
        type: 'slide',
        title: s.slideName,
        action: s.isActive ? 'Slide đang hoạt động' : 'Slide đã tắt',
        timestamp: this.formatRelativeTime((s as any).updateAt || (s as any).createAt),
        status: s.isActive ? 'published' : 'reviewed'
      });
    });

    // Take latest 5 by time if possible
    this.recentActivities = activities.slice(0, 5);
  }

  private formatRelativeTime(dateValue?: Date): string {
    if (!dateValue) return 'Vừa xong';
    const date = new Date(dateValue);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} giờ trước`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} ngày trước`;
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'event': return 'fas fa-calendar-alt';
      case 'slide': return 'fas fa-images';
      default: return 'fas fa-bell';
    }
  }

  getActivityColor(type: string): string {
    switch (type) {
      case 'event': return 'green';
      case 'slide': return 'purple';
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

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  getCurrentDate(): string {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const now = new Date();
    const dayName = days[now.getDay()];
    const date = now.toLocaleDateString('vi-VN');
    return `${dayName}, ${date}`;
  }
}
