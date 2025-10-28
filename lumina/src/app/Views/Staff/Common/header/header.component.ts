import { Component, EventEmitter, Output, OnInit, Input } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { AuthService } from './../../../../Services/Auth/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit {
  @Output() sidebarToggle = new EventEmitter();
  @Input() sidebarOpen = true;

  pageTitle = 'Bài viết'; // Default title

  constructor(private router: Router, private activatedRoute: ActivatedRoute, private authService: AuthService) {}

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      }),
      mergeMap(route => route.data)
    ).subscribe(data => {
      // Set title from route data, or use default if not provided
      this.pageTitle = data['title'] || this.getPageTitleFromUrl();
    });
  }

  toggleSidebar() {
    this.sidebarToggle.emit();
  }

  private getPageTitleFromUrl(): string {
    const url = this.router.url;
    if (url.includes('dashboard')) return 'Bảng điều khiển';
    if (url.includes('articles')) return 'Bài viết';
    if (url.includes('questions')) return 'Câu hỏi';
    if (url.includes('tests')) return 'Bài thi';
    if (url.includes('vocabulary')) return 'Từ vựng';
    if (url.includes('seasons')) return 'Mùa thi đấu';
    return 'Staff Panel';
  }

   logout(): void {
    this.authService.logout();
  }
}
