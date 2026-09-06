import { Component } from '@angular/core';
import { MenuComponent } from '../menu-user/menu.component';
import { Router, RouterOutlet } from '@angular/router';
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

  constructor(
    private sidebarService: SidebarService,
    private router: Router
  ) {
    this.sidebarVisible$ = this.sidebarService.sidebarVisible$;
  }

  get isExamMode(): boolean {
    const url = this.router.url;
    return url.includes('/homepage/user-dashboard/exam/') || url.includes('/homepage/user-dashboard/part/');
  }
}
