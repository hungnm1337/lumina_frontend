import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SlideService } from '../../../Services/Slide/slide.service';
import { SlideDTO } from '../../../Interfaces/slide.interface';

@Component({
  selector: 'app-user-slide-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboardslide.component.html',
  styleUrls: ['./dashboardslide.component.scss']
})
export class UserSlideDashboardComponent implements OnInit, OnDestroy {
  slides: SlideDTO[] = [];
  activeSlides: SlideDTO[] = [];

  currentIndex = 0;
  autoplayIntervalMs = 2000;
  isAutoplay = true;
  isHovered = false;
  timer: any = null;

  // touch/swipe
  private touchStartX = 0;
  private touchEndX = 0;

  isLoading = false;
  errorMessage = '';

  constructor(private slideService: SlideService) {}

  ngOnInit(): void {
    this.fetchSlides();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private fetchSlides(): void {
    this.isLoading = true;
    this.slideService.getAllSlides(undefined, true).subscribe({
      next: (data) => {
        this.slides = data || [];
        this.activeSlides = this.slides.filter(s => s.isActive);
        if (this.activeSlides.length > 0) {
          this.currentIndex = 0;
          this.startAutoplay();
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Không thể tải slide. Vui lòng thử lại sau.';
        this.isLoading = false;
      }
    });
  }

  private startAutoplay(): void {
    if (!this.isAutoplay || this.timer || this.activeSlides.length <= 1) return;
    this.timer = setInterval(() => {
      if (!this.isHovered) this.next();
    }, this.autoplayIntervalMs);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  pauseAutoplay(): void {
    this.isHovered = true;
  }

  resumeAutoplay(): void {
    this.isHovered = false;
  }

  toggleAutoplay(): void {
    this.isAutoplay = !this.isAutoplay;
    this.clearTimer();
    if (this.isAutoplay) this.startAutoplay();
  }

  next(): void {
    if (this.activeSlides.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.activeSlides.length;
  }

  prev(): void {
    if (this.activeSlides.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.activeSlides.length) % this.activeSlides.length;
  }

  goTo(index: number): void {
    if (index < 0 || index >= this.activeSlides.length) return;
    this.currentIndex = index;
  }

  trackById(_: number, slide: SlideDTO): number | undefined {
    return slide.slideId;
  }

  // keyboard control
  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') this.next();
    if (event.key === 'ArrowLeft') this.prev();
  }

  // touch/swipe support
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    const delta = this.touchEndX - this.touchStartX;
    if (Math.abs(delta) > 40) {
      if (delta < 0) this.next();
      else this.prev();
    }
  }

  // helpers
  get isEmpty(): boolean {
    return !this.isLoading && this.activeSlides.length === 0;
  }
}
