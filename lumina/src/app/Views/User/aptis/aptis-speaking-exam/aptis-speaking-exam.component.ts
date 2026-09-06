import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export type ExamStep = 'preview' | 'instructions' | 'mic_check' | 'part1';

/**
 * AptisSpeakingExamComponent:
 * Tái hiện giao diện TestReach Candidate Preview & Exam Instructions.
 * Tích hợp hiệu ứng chuyển trang mượt mà (smooth transition) khi bấm "Start Assessment".
 */
@Component({
  selector: 'app-aptis-speaking-exam',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aptis-speaking-exam.component.html',
  styleUrls: ['./aptis-speaking-exam.component.scss']
})
export class AptisSpeakingExamComponent {
  private router = inject(Router);

  currentStep: ExamStep = 'preview';
  isTransitioning = false;
  isFullscreen = false;

  // Trạng thái kiểm tra Microphone
  isRecording = false;
  micTested = false;

  /**
   * Kích hoạt hiệu ứng chuyển trang siêu mượt từ Preview sang Instructions
   */
  startAssessment(): void {
    if (this.isTransitioning) return;

    this.isTransitioning = true;

    // Hiệu ứng mượt mà (fade-out nhẹ nhàng trước khi chuyển sang instructions)
    setTimeout(() => {
      this.currentStep = 'instructions';
      this.isTransitioning = false;
    }, 400);
  }

  /**
   * Chuyển từ Instructions sang kiểm tra Mic / Bắt đầu làm bài
   */
  nextStep(): void {
    if (this.currentStep === 'instructions') {
      this.isTransitioning = true;
      setTimeout(() => {
        this.currentStep = 'mic_check';
        this.isTransitioning = false;
      }, 350);
    } else if (this.currentStep === 'mic_check') {
      this.isTransitioning = true;
      setTimeout(() => {
        this.currentStep = 'part1';
        this.isTransitioning = false;
      }, 350);
    }
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      this.isFullscreen = false;
    }
  }

  backToPrepare(): void {
    this.router.navigate(['/aptis/prepare-general']);
  }
}
