import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../../Services/Auth/auth.service';
import { AuthUserResponse } from '../../../Interfaces/auth.interfaces';
import { QuotaService } from '../../../Services/Quota/quota.service';
import { UpgradeModalComponent } from '../../User/upgrade-modal/upgrade-modal.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, UpgradeModalComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  currentUser$!: Observable<AuthUserResponse | null>;
  isDropdownOpen = false;
  isPremium = false;
  showUpgradeModal = false;

  moveToExams() {
    this.router.navigate(['homepage/user-dashboard']);
  }
  constructor(
    private authService: AuthService,
    private elementRef: ElementRef,
    private router: Router,
    private quotaService: QuotaService
  ) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
    this.checkPremiumStatus();
  }

  checkPremiumStatus(): void {
    this.quotaService.isPremiumUser().subscribe({
      next: (isPremium) => {
        this.isPremium = isPremium;
        console.log('✅ Premium status checked:', isPremium);
      },
      error: (err) => {
        console.error('❌ Error checking premium status:', err);
        this.isPremium = false;
      },
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;
    }
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  logout(): void {
    this.isDropdownOpen = false;
    this.authService.logout();
  }

  // New:
  goToProfile(): void {
    this.isDropdownOpen = false;
    this.router.navigate(['/profile']);
  }

  openUpgradeModal(): void {
    this.showUpgradeModal = true;
  }

  closeUpgradeModal(): void {
    this.showUpgradeModal = false;
  }
}
