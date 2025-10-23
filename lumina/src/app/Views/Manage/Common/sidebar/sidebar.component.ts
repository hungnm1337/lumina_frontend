import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  @Input() isOpen = true;

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
      ],
    },
  ];
}
