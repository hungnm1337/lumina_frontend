import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  @Output() sidebarToggle = new EventEmitter<void>();

  // Dữ liệu menu cho sidebar, giữ nguyên logic cũ
  navGroups = [
    {
      title: 'Quản lý Nội dung',
      items: [
        { path: 'dashboard', name: 'Bảng điều khiển', icon: 'fas fa-tachometer-alt' },
        { path: 'questions', name: 'Câu hỏi', icon: 'fas fa-question-circle' },
        { path: 'exams', name: 'Bài thi', icon: 'fas fa-clipboard-list' },
        { path: 'articles', name: 'Bài viết', icon: 'fas fa-edit' },
      ],
    },
    {
      title: 'Quản lý Tài nguyên', 
      items: [
        { path: 'vocabulary', name: 'Từ vựng', icon: 'fas fa-spell-check' },
        { path: 'seasons', name: 'Mùa thi đấu', icon: 'fas fa-trophy' },
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
}
