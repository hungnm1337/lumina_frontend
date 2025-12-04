import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';
import { ExamAttemptDetailResponseDTO } from '../../../../Interfaces/ExamAttempt/ExamAttemptDetailResponseDTO.interface';
import { ToastService } from '../../../../Services/Toast/toast.service';
import { MockTestService } from '../../../../Services/MockTest/mocktest.service';
import { MocktestFeedbackDTO } from '../../../../Interfaces/mocktest.interface';

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.scss']
})
export class ResultComponent implements OnInit {
  attemptId: number | null = null;
  attemptDetails: ExamAttemptDetailResponseDTO | null = null;
  isLoading: boolean = true;

  // Feedback properties
  feedback: MocktestFeedbackDTO | null = null;
  isLoadingFeedback: boolean = false;
  feedbackError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examAttemptService: ExamAttemptService,
    private toastService: ToastService,
    private mockTestService: MockTestService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.attemptId = +params['attemptId'];
      if (this.attemptId) {
        this.loadAttemptDetails();
        this.loadFeedback();
      }
    });
  }

  private loadAttemptDetails(): void {
    if (!this.attemptId) return;

    this.isLoading = true;
    this.examAttemptService.getAttemptDetails(this.attemptId).subscribe({
      next: (response) => {
        this.attemptDetails = response;
        this.isLoading = false;
        console.log('✅ Attempt details loaded:', response);
      },
      error: (error) => {
        console.error('❌ Error loading attempt details:', error);
        this.isLoading = false;
        this.toastService.error('Failed to load exam results');
      }
    });
  }

  get examInfo() {
    return this.attemptDetails?.examAttemptInfo;
  }

  get totalScore(): number {
    return this.examInfo?.score || 0;
  }

  get totalQuestions(): number {
    let total = 0;
    if (this.attemptDetails?.listeningAnswers) total += this.attemptDetails.listeningAnswers.length;
    if (this.attemptDetails?.readingAnswers) total += this.attemptDetails.readingAnswers.length;
    if (this.attemptDetails?.writingAnswers) total += this.attemptDetails.writingAnswers.length;
    if (this.attemptDetails?.speakingAnswers) total += this.attemptDetails.speakingAnswers.length;
    return total;
  }

  get correctAnswers(): number {
    let correct = 0;
    if (this.attemptDetails?.listeningAnswers) {
      correct += this.attemptDetails.listeningAnswers.filter(a => a.isCorrect).length;
    }
    if (this.attemptDetails?.readingAnswers) {
      correct += this.attemptDetails.readingAnswers.filter(a => a.isCorrect).length;
    }
    // Note: Writing and Speaking might not have isCorrect field, they use scores
    return correct;
  }

  get percentCorrect(): number {
    if (this.totalQuestions === 0) return 0;
    return Math.round((this.correctAnswers / this.totalQuestions) * 100);
  }

  get duration(): string {
    if (!this.examInfo?.startTime || !this.examInfo?.endTime) {
      return 'N/A';
    }
    const start = new Date(this.examInfo.startTime).getTime();
    const end = new Date(this.examInfo.endTime).getTime();
    const diff = Math.floor((end - start) / 1000 / 60); // minutes
    return `${diff} phút`;
  }

  getSkillScore(skillType: string): number {
    const lowerSkill = skillType.toLowerCase();
    
    if (lowerSkill === 'listening' && this.attemptDetails?.listeningAnswers) {
      return this.attemptDetails.listeningAnswers.filter(a => a.isCorrect).length;
    }
    if (lowerSkill === 'reading' && this.attemptDetails?.readingAnswers) {
      return this.attemptDetails.readingAnswers.filter(a => a.isCorrect).length;
    }
    if (lowerSkill === 'writing' && this.attemptDetails?.writingAnswers) {
      return this.attemptDetails.writingAnswers.length;
    }
    if (lowerSkill === 'speaking' && this.attemptDetails?.speakingAnswers) {
      return this.attemptDetails.speakingAnswers.length;
    }
    return 0;
  }

  getSkillTotal(skillType: string): number {
    const lowerSkill = skillType.toLowerCase();
    
    if (lowerSkill === 'listening' && this.attemptDetails?.listeningAnswers) {
      return this.attemptDetails.listeningAnswers.length;
    }
    if (lowerSkill === 'reading' && this.attemptDetails?.readingAnswers) {
      return this.attemptDetails.readingAnswers.length;
    }
    if (lowerSkill === 'writing' && this.attemptDetails?.writingAnswers) {
      return this.attemptDetails.writingAnswers.length;
    }
    if (lowerSkill === 'speaking' && this.attemptDetails?.speakingAnswers) {
      return this.attemptDetails.speakingAnswers.length;
    }
    return 0;
  }

  retryExam(): void {
    // Navigate back to exam list to select a new mock test
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }

  goToExams(): void {
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }

  viewDetailedResults(): void {
    if (this.attemptId) {
      this.router.navigate(['/homepage/user-dashboard/exam-attempts', this.attemptId]);
    }
  }

  loadFeedback(): void {
    if (!this.attemptId) return;

    this.isLoadingFeedback = true;
    this.feedbackError = null;

    this.mockTestService.getMocktestFeedback(this.attemptId).subscribe({
      next: (response) => {
        this.feedback = response;
        this.isLoadingFeedback = false;
        console.log('✅ Feedback loaded:', response);
      },
      error: (error) => {
        console.error('❌ Error loading feedback:', error);
        this.isLoadingFeedback = false;
        this.feedbackError = error.error?.message || 'Không thể tải phản hồi từ AI. Vui lòng thử lại.';
        this.toastService.error('Không thể tải phản hồi từ AI');
      }
    });
  }

  retryFeedback(): void {
    this.loadFeedback();
  }

  getToeicLevel(score: number): string {
    if (score >= 900) return 'Cao cấp (Advanced)';
    if (score >= 800) return 'Trung cao cấp (Upper Intermediate)';
    if (score >= 700) return 'Trung cấp (Intermediate)';
    if (score >= 600) return 'Sơ trung cấp (Pre-Intermediate)';
    if (score >= 500) return 'Sơ cấp (Elementary)';
    return 'Bắt đầu (Beginner)';
  }

  formatActionPlan(text: string): string {
    if (!text) return '';

    // Replace **text** with <strong>text</strong>
    // Replace lines starting with * (bullet points) with indented version
    // Replace newlines with <br> tags to preserve line breaks
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\* (.+)$/gm, '<span style="display:block;margin-left:1.5rem;">• $1</span>')
      .replace(/\n/g, '<br>');
  }
}
