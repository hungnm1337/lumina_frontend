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
  @Output() toggleEvent = new EventEmitter<boolean>();

  // Dữ liệu menu cho sidebar
  navGroups = [
    {
      title: 'QUẢN LÝ NỘI DUNG',
      items: [
        { path: '/dashboard', name: 'Bảng điều khiển', icon: 'fas fa-tachometer-alt' },
        { path: '/questions', name: 'Câu hỏi', icon: 'fas fa-question-circle' },
        { path: '/tests', name: 'Bài thi', icon: 'fas fa-clipboard-list' },
        { path: '/articles', name: 'Bài viết', icon: 'fas fa-edit' },
      ],
    },
    {
      title: 'QUẢN LÝ TÀI NGUYÊN',
      items: [
        { path: '/vocabulary', name: 'Từ vựng', icon: 'fas fa-spell-check' },
        { path: '/seasons', name: 'Mùa thi đấu', icon: 'fas fa-trophy' },
      ],
    },
  ];

  toggleSidebar() {
    this.isOpen = !this.isOpen;
    this.toggleEvent.emit(this.isOpen);
  }

  closeSidebar() {
    this.isOpen = false;
    this.toggleEvent.emit(this.isOpen);
  }
}
