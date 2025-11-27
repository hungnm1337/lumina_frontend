import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportPopupComponent } from '../../Report/report-popup/report-popup.component';
import { Router } from '@angular/router';
import { OptionsComponent } from '../../options/options.component';
import { PromptComponent } from '../../prompt/prompt.component';
import { AuthService } from '../../../../Services/Auth/auth.service';
import {
  OptionDTO,
  ExamPartDTO,
  QuestionDTO,
} from '../../../../Interfaces/exam.interfaces';
import { ExamAttemptDetailResponseDTO } from '../../../../Interfaces/ExamAttempt/ExamAttemptDetailResponseDTO.interface';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';
import { ExamAttemptDetailComponent } from '../../ExamAttempt/exam-attempt-detail/exam-attempt-detail.component';
import { QuotaService } from '../../../../Services/Quota/quota.service';
import { QuotaLimitModalComponent } from '../../quota-limit-modal/quota-limit-modal.component';
import { LeaderboardService } from '../../../../Services/Leaderboard/leaderboard.service';

@Component({
  selector: 'app-reading',
  standalone: true,
  imports: [
    CommonModule,
    OptionsComponent,
    PromptComponent,
    ExamAttemptDetailComponent,
    QuotaLimitModalComponent,
    ReportPopupComponent,
  ],
  templateUrl: './reading.component.html',
  styleUrls: ['./reading.component.scss'],
})
export class ReadingComponent implements OnChanges, OnInit, OnDestroy {
  showReportPopup = false;
  get examId(): number | null {
    return this.partInfo?.examId ?? null;
  }
  @Input() questions: QuestionDTO[] = [];
  @Input() partInfo: ExamPartDTO | null = null;
  @Output() readingAnswered = new EventEmitter<boolean>();

  // State
  currentIndex = 0;
  showExplain = false;
  totalScore = 0;
  correctCount = 0;
  finished = false;
  attemptId: number | null = null;
  isSubmitting = false;

  // Tracking time for leaderboard calculation
  examStartTime: Date | null = null;

  // Answer tracking (from backend responses)
  answeredQuestions: Map<
    number,
    { selectedOptionId: number; isCorrect: boolean; score: number }
  > = new Map();

  // Exam attempt details for history view
  examAttemptDetails: ExamAttemptDetailResponseDTO | null = null;
  showExamAttemptDetailsFlag = false;

  // Quota modal
  showQuotaModal = false;
  quotaMessage = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private examAttemptService: ExamAttemptService,
    private quotaService: QuotaService,
    private leaderboardService: LeaderboardService
  ) {}

  // Handler for report popup close
  onReportPopupClose(): void {
    console.log('[ReadingComponent] Report popup close received');
    this.showReportPopup = false;
  }

  ngOnInit(): void {
    this.loadAttemptId();
    this.incrementQuotaOnStart();
    this.examStartTime = new Date(); // Track start time for leaderboard
  }

  ngOnDestroy(): void {
    this.saveProgressOnExit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions'] && this.questions?.length > 0) {
      this.resetQuiz();
    }
  }

  // ============= ATTEMPT MANAGEMENT =============

  private loadAttemptId(): void {
    try {
      const stored = localStorage.getItem('currentExamAttempt');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.attemptId = parsed.attemptID || parsed.attemptId;
      }

      if (!this.attemptId) {
        console.error('No attemptId found');
        this.router.navigate(['homepage/user-dashboard/exams']);
      }
    } catch (error) {
      console.error('Error loading attemptId:', error);
      this.router.navigate(['homepage/user-dashboard/exams']);
    }
  }

  private incrementQuotaOnStart(): void {
    this.quotaService.incrementQuota('reading').subscribe({
      next: () => {
        console.log('✅ Reading quota incremented');
      },
      error: (err) => {
        console.error('❌ Failed to increment quota:', err);
        if (err.status === 400 || err.status === 403) {
          this.quotaMessage =
            'Bạn đã hết lượt thi Reading miễn phí (20 lượt/tháng). Vui lòng nâng cấp Premium để tiếp tục!';
          this.showQuotaModal = true;
        }
      },
    });
  }

  closeQuotaModal(): void {
    this.showQuotaModal = false;
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }

  // ============= ANSWER SUBMISSION =============

  markAnswered(selectedOptionId: number): void {
    if (this.isSubmitting || !this.attemptId) return;

    const currentQuestion = this.questions[this.currentIndex];

    // ✅ Check if this question was already answered
    const previousAnswer = this.answeredQuestions.get(currentQuestion.questionId);
    const isUpdatingAnswer = previousAnswer !== undefined;

    this.isSubmitting = true;
    const model = {
      examAttemptId: this.attemptId,
      questionId: currentQuestion.questionId,
      selectedOptionId: selectedOptionId,
    };

    console.log(isUpdatingAnswer ? 'Updating reading answer:' : 'Submitting reading answer:', model);

    this.examAttemptService.submitReadingAnswerNew(model).subscribe({
      next: (response) => {
        console.log('Reading answer submitted:', response);

        // ✅ If updating answer, adjust previous scores first
        if (isUpdatingAnswer) {
          if (previousAnswer.isCorrect) {
            this.correctCount--;
          }
          this.totalScore -= previousAnswer.score;
          console.log('Adjusted scores - removed previous answer contribution');
        }

        // Store new answer info
        this.answeredQuestions.set(currentQuestion.questionId, {
          selectedOptionId: selectedOptionId,
          isCorrect: response.isCorrect,
          score: response.score,
        });

        // Update totals with new answer
        if (response.isCorrect) {
          this.correctCount++;
        }
        this.totalScore += response.score;

        this.isSubmitting = false;
        this.showExplain = true;

        // Emit event
        this.readingAnswered.emit(response.isCorrect);
      },
      error: (error) => {
        console.error('Error submitting reading answer:', error);
        this.isSubmitting = false;
      },
    });
  }

  // ============= NAVIGATION =============

  previousQuestion(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateExplainState();
    }
  }

  nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.updateExplainState();
    } else {
      // Nếu là câu cuối, hỏi có muốn nộp bài không
      const confirmFinish = confirm(
        'Đây là câu cuối cùng. Bạn có muốn nộp bài ngay không?\n\n' +
          'Chọn "OK" để nộp bài\n' +
          'Chọn "Cancel" để xem lại các câu trước'
      );
      if (confirmFinish) {
        this.finishExam();
      }
    }
  }
  finishExamManual(): void {
    const answeredCount = this.answeredQuestions.size;
    const totalQuestions = this.questions.length;
    const unansweredCount = totalQuestions - answeredCount;

    let message = 'Bạn có chắc chắn muốn nộp bài thi Reading không?\n\n';
    message += `Số câu đã trả lời: ${answeredCount}/${totalQuestions}\n`;

    if (unansweredCount > 0) {
      message += `Số câu chưa trả lời: ${unansweredCount}\n`;
      message += `Các câu chưa trả lời sẽ không được tính điểm!\n\n`;
    }

    message += 'Chọn "OK" để nộp bài hoặc "Cancel" để tiếp tục làm bài.';

    const confirmResult = confirm(message);

    if (confirmResult) {
      this.finishExam();
    }
  }
  navigateToQuestion(index: number): void {
    if (index >= 0 && index < this.questions.length) {
      this.currentIndex = index;
      this.updateExplainState();
    }
  }

  private updateExplainState(): void {
    const currentQuestionId = this.questions[this.currentIndex]?.questionId;
    this.showExplain = this.answeredQuestions.has(currentQuestionId);
  }

  // ============= QUIZ COMPLETION =============

  private finishExam(): void {
    if (!this.attemptId) {
      console.error('No attemptId, cannot finalize');
      this.finished = true;
      return;
    }

    console.log('🏁 Finalizing reading exam...');

    this.examAttemptService.finalizeAttempt(this.attemptId).subscribe({
      next: (summary) => {
        console.log('Reading exam finalized:', summary);

        // Use backend scores
        if (summary.success !== false) {
          this.totalScore = summary.totalScore ?? this.totalScore;
          this.correctCount = summary.correctAnswers ?? this.correctCount;
        }

        this.finished = true;
        localStorage.removeItem('currentExamAttempt');

        // 🎯 CALCULATE LEADERBOARD SCORE (CHỈ READING)
        this.calculateLeaderboardScore();
      },
      error: (error) => {
        console.error('Error finalizing reading exam:', error);
        this.finished = true;
      },
    });
  }

  // ============= LEADERBOARD INTEGRATION =============

  private calculateLeaderboardScore(): void {
    if (!this.attemptId || !this.partInfo) {
      console.log('⚠️ Missing attemptId or partInfo for leaderboard calculation');
      return;
    }

    // Chỉ tính điểm cho Reading (ExamPartId = 2)
    // Sử dụng partId từ partInfo
    const examPartId = 2; // Reading

    const timeSpentSeconds = this.calculateTimeSpent();
    const expectedTimeSeconds = 60 * 60; // 60 phút cho Reading

    const request = {
      examAttemptId: this.attemptId,
      examPartId: examPartId,
      correctAnswers: this.correctCount,
      totalQuestions: this.questions.length,
      timeSpentSeconds: timeSpentSeconds,
      expectedTimeSeconds: expectedTimeSeconds
    };

    console.log('📊 Calculating leaderboard score for Reading:', request);

    this.leaderboardService.calculateScore(request).subscribe({
      next: (response) => {
        console.log('✅ Leaderboard score calculated:', response);

        // Hiển thị thông báo TOEIC
        if (response.toeicMessage) {
          this.showTOEICNotification(response);
        }

        // Thông báo nếu làm lần đầu
        if (response.isFirstAttempt) {
          console.log('🎯 Lần đầu làm đề này! TOEIC đã được cập nhật:', response.estimatedTOEIC);
        } else {
          console.log('🔄 Làm lại đề cũ. Điểm tích lũy tăng, TOEIC giữ nguyên');
        }
      },
      error: (error) => {
        console.error('❌ Error calculating leaderboard score:', error);
        // Không block user flow nếu API lỗi
      }
    });
  }

  private calculateTimeSpent(): number {
    if (!this.examStartTime) return 0;
    const now = new Date();
    return Math.floor((now.getTime() - this.examStartTime.getTime()) / 1000);
  }

  private showTOEICNotification(response: any): void {
    const message = `
${response.toeicMessage}

📊 Thông tin chi tiết:
• Điểm lần này: ${response.seasonScore}
• Tổng điểm tích lũy: ${response.totalAccumulatedScore}
• TOEIC ước tính: ${response.estimatedTOEIC}
• Trình độ: ${response.toeicLevel}
${response.isFirstAttempt ? '\n🎯 Lần đầu làm đề này!' : '\n🔄 Làm lại đề - TOEIC giữ nguyên'}
    `.trim();

    alert(message);
  }

  private showLevelUpNotification(newLevel: string, previousLevel?: string): void {
    const levelText = this.leaderboardService.getTOEICLevelText(newLevel);
    const icon = this.leaderboardService.getTOEICLevelIcon(newLevel);
    
    alert(`${icon} CHÚC MỪNG!\n\nBạn đã lên cấp độ: ${levelText}\n${previousLevel ? `Từ: ${this.leaderboardService.getTOEICLevelText(previousLevel)}` : ''}\n\nHãy tiếp tục phát huy!`);
  }

  private showMilestoneNotification(milestone: number): void {
    alert(`🎯 THÀNH TÍCH MỚI!\n\nBạn đã đạt mốc ${milestone} điểm TOEIC ước tính!\n\nChúc mừng bạn!`);
  }

  // ============= EXAM HISTORY =============

  showExamAttemptDetails(): void {
    if (!this.attemptId) return;

    this.examAttemptService.getAttemptDetails(this.attemptId).subscribe({
      next: (details) => {
        this.examAttemptDetails = details;
        this.showExamAttemptDetailsFlag = true;
        console.log('Fetched exam attempt details:', details);
      },
      error: (error) => {
        console.error('Error fetching exam attempt details:', error);
      },
    });
  }

  closeExamAttemptDetails(): void {
    this.showExamAttemptDetailsFlag = false;
  }

  // ============= HELPERS =============

  getSelectedOptionId(questionId: number): number | null {
    return this.answeredQuestions.get(questionId)?.selectedOptionId ?? null;
  }

  isQuestionAnswered(questionId: number): boolean {
    return this.answeredQuestions.has(questionId);
  }

  get percentCorrect(): number {
    const total = this.questions?.length || 0;
    return total > 0 ? Math.round((this.correctCount / total) * 100) : 0;
  }

  get feedbackText(): string {
    const p = this.percentCorrect;
    if (p < 30) return 'Bạn cần cố gắng nhiều hơn';
    if (p < 60) return 'Lần sau bạn chắc chắn sẽ làm tốt hơn';
    return 'Bạn hãy tiếp tục phát huy nhé';
  }

  // ============= EXIT HANDLING =============

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (!this.finished && this.attemptId) {
      $event.returnValue = 'Bạn có muốn lưu tiến trình và thoát không?';
    }
  }

  private saveProgressOnExit(): void {
    if (!this.finished && this.attemptId) {
      const model = {
        examAttemptId: this.attemptId,
        currentQuestionIndex: this.currentIndex,
      };

      this.examAttemptService.saveProgress(model).subscribe({
        next: () => console.log('Reading progress saved'),
        error: (error) => console.error('Error saving progress:', error),
      });
    }
  }

  confirmExit(): void {
    const confirmResult = confirm(
      'Bạn có muốn lưu tiến trình và thoát không?\n\n' +
        '- Chọn "OK" để lưu và thoát\n' +
        '- Chọn "Cancel" để tiếp tục làm bài'
    );

    if (confirmResult) {
      this.saveProgressAndExit();
    }
  }

  private saveProgressAndExit(): void {
    if (!this.attemptId) {
      this.router.navigate(['homepage/user-dashboard/exams']);
      return;
    }

    const model = {
      examAttemptId: this.attemptId,
      currentQuestionIndex: this.currentIndex,
    };

    this.examAttemptService.saveProgress(model).subscribe({
      next: () => {
        console.log('Reading progress saved successfully');
        localStorage.removeItem('currentExamAttempt');
        this.router.navigate(['homepage/user-dashboard/exams']);
      },
      error: (error) => {
        console.error('Error saving reading progress:', error);
        this.router.navigate(['homepage/user-dashboard/exams']);
      },
    });
  }

  resetQuiz(): void {
    this.currentIndex = 0;
    this.showExplain = false;
    this.totalScore = 0;
    this.correctCount = 0;
    this.finished = false;
    this.answeredQuestions.clear();
  }

  goToExams(): void {
    this.router.navigate(['homepage/user-dashboard/exams']);
  }
}
