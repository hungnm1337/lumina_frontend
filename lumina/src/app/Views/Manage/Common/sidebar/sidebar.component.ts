import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from './../../../../Services/Auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input() isOpen = true;
  @Output() sidebarToggle = new EventEmitter<void>();
  constructor(private authService: AuthService) { }

  // Dữ liệu menu cho sidebar, tương thích với file HTML mới
  navGroups = [
    {
      title: 'Quản lý',
      items: [
        { path: 'dashboard', name: 'Bảng điều khiển', icon: 'fas fa-chart-pie' },
        { path: 'events', name: 'Sự kiện', icon: 'fas fa-calendar-alt' },
        { path: 'slides', name: 'Slide', icon: 'fas fa-images' },
        { path: 'manage-posts', name: 'Quản lý bài viết', icon: 'fas fa-edit' },
        { path: 'vocabulary', name: 'Quản lý từ vựng', icon: 'fas fa-book-open' },
        { path: 'user-reports', name: 'Báo cáo người dùng', icon: 'fas fa-user-clock' }
      ],
    },
  ];

  // Thêm methods để xử lý toggle
  toggleSidebar() {
    this.sidebarToggle.emit();
  }

  closeSidebar() {
    // Chỉ emit khi sidebar đang mở để đóng lại
    if (this.isOpen) {
      this.sidebarToggle.emit();
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
