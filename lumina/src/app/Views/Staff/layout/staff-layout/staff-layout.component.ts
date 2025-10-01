import { Component } from '@angular/core';
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
export class StaffLayoutComponent {
  isSidebarOpen = true;

  constructor() {
    if (window.innerWidth < 612) {
      this.isSidebarOpen = false;
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}
