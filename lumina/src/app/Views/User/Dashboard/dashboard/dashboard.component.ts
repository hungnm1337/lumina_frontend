import { Component } from '@angular/core';
import { MenuComponent } from '../menu-user/menu.component';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarService } from '../../../../Services/sidebar.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MenuComponent, RouterOutlet, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class UserDashboardComponent {
  sidebarVisible$: Observable<boolean>;

  constructor(private sidebarService: SidebarService) {
    this.sidebarVisible$ = this.sidebarService.sidebarVisible$;
  }
}
