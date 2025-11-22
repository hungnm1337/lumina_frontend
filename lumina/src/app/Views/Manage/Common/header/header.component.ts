import { Component, EventEmitter, Output, OnInit, ElementRef, HostListener } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { AuthService } from './../../../../Services/Auth/auth.service';
import { UserService } from './../../../../Services/User/user.service';
import { Observable } from 'rxjs';
import { AuthUserResponse } from './../../../../Interfaces/auth.interfaces';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit {
  @Output() sidebarToggle = new EventEmitter<void>();
  pageTitle = 'Manager Panel';
  isDropdownOpen = false;
  currentUser$!: Observable<AuthUserResponse | null>;

  constructor(
    private router: Router, 
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private userService: UserService,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    this.currentUser$ = this.authService.currentUser$;
    this.loadUserProfile();
    
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
      this.pageTitle = data['title'] || 'Manager Panel';
    });
  }
  
  loadUserProfile(): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId || userId === 0) return;

    this.userService.getProfile().subscribe({
      next: (profile) => {
        if (profile.avatarUrl) {
          this.authService.updateCurrentUser({ 
            avatarUrl: profile.avatarUrl,
            name: profile.fullName
          });
        }
      },
      error: (err) => {
        console.error('Error loading profile:', err);
      }
    });
  }
  
  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }
  
  goToProfile(): void {
    this.isDropdownOpen = false;
    this.router.navigate(['/profile']);
  }
  
  logout(): void {
    this.isDropdownOpen = false;
    this.authService.logout();
  }
}