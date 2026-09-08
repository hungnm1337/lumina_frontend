import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BaseComponent } from '../../../core/components/base.component';
import { LMButtonComponent } from '../../../shared/components/lm-button/lm-button.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../core/services/translation.service';

/**
 * LandingPageComponent: Trang chủ Lumina thế hệ mới.
 * Khớp 100% Mockup giao diện mới (Tone sáng, Hero section, 4 kỹ năng test,
 * Banner giá trị 76%, Sự kiện 3D, Đánh giá học viên, Footer chuẩn).
 * Áp dụng triệt để i18n & Shared Component LMButton.
 */
@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, LMButtonComponent, TranslatePipe],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent extends BaseComponent {
  private router = inject(Router);
  public translationService = inject(TranslationService);

  // Danh sách các kỹ năng kiểm tra trình độ
  skills = [
    { key: 'listening', icon: 'fa-solid fa-headphones', color: 'text-sky-500', bg: 'bg-sky-50' },
    { key: 'reading', icon: 'fa-solid fa-book-open', color: 'text-amber-500', bg: 'bg-amber-50' },
    { key: 'writing', icon: 'fa-solid fa-pen-nib', color: 'text-rose-500', bg: 'bg-rose-50' },
    { key: 'speaking', icon: 'fa-solid fa-microphone', color: 'text-teal-500', bg: 'bg-teal-50' }
  ];

  // Danh sách các ưu điểm vượt trội
  features = [
    {
      key: 'personalized',
      icon: 'fa-solid fa-bullseye',
      color: 'text-rose-500',
      bg: 'bg-rose-50'
    },
    {
      key: 'ets',
      icon: 'fa-regular fa-file-lines',
      color: 'text-amber-500',
      bg: 'bg-amber-50'
    },
    {
      key: 'detailedExplanation',
      icon: 'fa-regular fa-lightbulb',
      color: 'text-yellow-500',
      bg: 'bg-yellow-50'
    },
    {
      key: 'progressTracking',
      icon: 'fa-solid fa-chart-line',
      color: 'text-blue-500',
      bg: 'bg-blue-50'
    }
  ];

  startLearning(): void {
    this.router.navigate(['/auth/login']);
  }

  startPlacementTest(): void {
    this.router.navigate(['/exam/placement-test']);
  }

  toggleLanguage(): void {
    const nextLang = this.translationService.currentLang === 'vi' ? 'en' : 'vi';
    this.translationService.setLanguage(nextLang).subscribe();
  }
}
