import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../Common/sidebar/sidebar.component'; 
import { HeaderComponent } from '../../Common/header/header.component'; 
import { RouterOutlet } from '@angular/router'; 

@Component({
  selector: 'app-staff-layout',
  standalone: true,
  imports: [
    CommonModule, 
    SidebarComponent, 
    HeaderComponent, 
    RouterOutlet 
  ],
  templateUrl: './staff-layout.component.html',
})
export class StaffLayoutComponent implements OnInit {
  isSidebarOpen = true;

  constructor() {}

  ngOnInit() {
    // Lấy trạng thái sidebar từ localStorage
    const savedState = localStorage.getItem('staff-sidebar-open');
    if (savedState !== null) {
      this.isSidebarOpen = savedState === 'true';
    } else {
      // Mặc định thu gọn trên mobile
      if (window.innerWidth < 768) {
        this.isSidebarOpen = false;
      }
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    // Lưu trạng thái vào localStorage
    localStorage.setItem('staff-sidebar-open', this.isSidebarOpen.toString());
  }

  // Phím tắt Ctrl+B để toggle sidebar
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 'b') {
      event.preventDefault();
      this.toggleSidebar();
    }
  }
}
