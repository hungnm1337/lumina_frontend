import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../Common/header/header.component';
import { SidebarComponent } from '../../Common/sidebar/sidebar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true, 
  imports: [
    CommonModule,      
    RouterModule,      
    HeaderComponent,   
    SidebarComponent  
  ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
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