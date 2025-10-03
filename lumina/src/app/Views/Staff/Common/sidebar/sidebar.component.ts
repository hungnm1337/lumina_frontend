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
      title: 'Quản lý Nội dung',
      items: [
        { path: 'dashboard', name: 'Bảng điều khiển', icon: 'fas fa-tachometer-alt' },
        { path: 'questions', name: 'Câu hỏi', icon: 'fas fa-question-circle' },
        { path: 'tests', name: 'Bài thi', icon: 'fas fa-clipboard-list' },
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
}
