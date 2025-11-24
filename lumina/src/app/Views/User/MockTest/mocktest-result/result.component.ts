import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';
import { ExamAttemptDetailResponseDTO } from '../../../../Interfaces/ExamAttempt/ExamAttemptDetailResponseDTO.interface';
import { ToastService } from '../../../../Services/Toast/toast.service';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examAttemptService: ExamAttemptService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.attemptId = +params['attemptId'];
      if (this.attemptId) {
        this.loadAttemptDetails();
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
    if (this.attemptDetails?.readingAnswers) total += this.attemptDetails.readingAnswers.length;
    if (this.attemptDetails?.writingAnswers) total += this.attemptDetails.writingAnswers.length;
    if (this.attemptDetails?.speakingAnswers) total += this.attemptDetails.speakingAnswers.length;
    return total;
  }

  get correctAnswers(): number {
    let correct = 0;
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
    if (skillType === 'reading' && this.attemptDetails?.readingAnswers) {
      return this.attemptDetails.readingAnswers.filter(a => a.isCorrect).length;
    }
    if (skillType === 'writing' && this.attemptDetails?.writingAnswers) {
      return this.attemptDetails.writingAnswers.length; // Assuming submitted = scored
    }
    if (skillType === 'speaking' && this.attemptDetails?.speakingAnswers) {
      return this.attemptDetails.speakingAnswers.length; // Assuming submitted = scored
    }
    return 0;
  }

  getSkillTotal(skillType: string): number {
    if (skillType === 'reading' && this.attemptDetails?.readingAnswers) {
      return this.attemptDetails.readingAnswers.length;
    }
    if (skillType === 'writing' && this.attemptDetails?.writingAnswers) {
      return this.attemptDetails.writingAnswers.length;
    }
    if (skillType === 'speaking' && this.attemptDetails?.speakingAnswers) {
      return this.attemptDetails.speakingAnswers.length;
    }
    // For listening, we don't have separate data, return 0
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
}
