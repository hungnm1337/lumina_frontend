import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule,NgClass,RouterLink],
  templateUrl: './sidebar.component.html',
  styles: [`
    .nav-item.active {
      @apply bg-blue-50 text-blue-600 font-semibold;
    }
  `]
})
export class SidebarComponent {
  @Input() isOpen = true;

  navGroups = [
    {
      title: 'User Management',
      items: [
        { path: '/admin/users-list', name: 'User List', icon: 'fas fa-users' }
        // { path: '/admin/user-details', name: 'User Details', icon: 'fas fa-user-edit' },
        // { path: '/admin/roles-permissions', name: 'Roles & Permissions', icon: 'fas fa-user-shield' },
      ],
    },
    {
      title: 'System Configuration',
      items: [
        { path: '/admin/system-plans', name: 'Plans & Limits', icon: 'fas fa-layer-group' },
        // { path: '/admin/system-integrations', name: 'AI/Email/Payment', icon: 'fas fa-plug' },
        // { path: '/admin/system-srs', name: 'SRS & Leaderboard', icon: 'fas fa-cogs' },
      ],
    },
    {
      title: 'Monitoring & Reports',
      items: [
        { path: '/admin/system-stats', name: 'Statistics & Charts', icon: 'fas fa-chart-bar' },
        { path: '/admin/user-reports', name: 'User Reports', icon: 'fas fa-user-clock' },
      ],
    }
  ];
}
