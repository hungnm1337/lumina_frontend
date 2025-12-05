import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../Common/sidebar/sidebar.component'; 
import { HeaderComponent } from '../../Common/header/header.component'; 
import { RouterOutlet } from '@angular/router'; 

@Component({
  selector: 'app-manager-layout',
  standalone: true,
  imports: [
    CommonModule, 
    SidebarComponent, 
    HeaderComponent, 
    RouterOutlet 
  ],
  templateUrl: './manager-layout.component.html',
})
export class ManagerLayoutComponent {
  isSidebarOpen = true;

  constructor() {
    if (window.innerWidth < 612) {
      this.isSidebarOpen = false;
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
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
