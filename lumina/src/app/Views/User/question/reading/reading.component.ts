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

@Component({
  selector: 'app-reading',
  standalone: true,
  imports: [
    CommonModule,
    OptionsComponent,
    PromptComponent,
    ExamAttemptDetailComponent,
  ],
  templateUrl: './reading.component.html',
  styleUrl: './reading.component.scss',
})
export class ReadingComponent implements OnChanges, OnInit, OnDestroy {
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

  // Answer tracking (from backend responses)
  answeredQuestions: Map<
    number,
    { selectedOptionId: number; isCorrect: boolean; score: number }
  > = new Map();

  // Exam attempt details for history view
  examAttemptDetails: ExamAttemptDetailResponseDTO | null = null;
  showExamAttemptDetailsFlag = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private examAttemptService: ExamAttemptService
  ) {}

  ngOnInit(): void {
    this.loadAttemptId();
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
        console.error('❌ No attemptId found');
        this.router.navigate(['homepage/user-dashboard/exams']);
      }
    } catch (error) {
      console.error('❌ Error loading attemptId:', error);
      this.router.navigate(['homepage/user-dashboard/exams']);
    }
  }

  // ============= ANSWER SUBMISSION =============

  markAnswered(selectedOptionId: number): void {
    if (this.isSubmitting || !this.attemptId) return;

    const currentQuestion = this.questions[this.currentIndex];

    this.isSubmitting = true;
    const model = {
      examAttemptId: this.attemptId,
      questionId: currentQuestion.questionId,
      selectedOptionId: selectedOptionId, // ✅ Sử dụng optionId từ event
    };

    console.log('📤 Submitting reading answer:', model);

    this.examAttemptService.submitReadingAnswerNew(model).subscribe({
      next: (response) => {
        console.log('✅ Reading answer submitted:', response);

        // Store answer info
        this.answeredQuestions.set(currentQuestion.questionId, {
          selectedOptionId: selectedOptionId,
          isCorrect: response.isCorrect,
          score: response.score,
        });

        // Update totals
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
        console.error('❌ Error submitting reading answer:', error);
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
    // ✅ Cho phép next kể cả chưa trả lời
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
    message += `✅ Số câu đã trả lời: ${answeredCount}/${totalQuestions}\n`;

    if (unansweredCount > 0) {
      message += `⚠️ Số câu chưa trả lời: ${unansweredCount}\n`;
      message += `❗ Các câu chưa trả lời sẽ không được tính điểm!\n\n`;
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
      console.error('❌ No attemptId, cannot finalize');
      this.finished = true;
      return;
    }

    console.log('🏁 Finalizing reading exam...');

    this.examAttemptService.finalizeAttempt(this.attemptId).subscribe({
      next: (summary) => {
        console.log('✅ Reading exam finalized:', summary);

        // Use backend scores
        if (summary.success !== false) {
          this.totalScore = summary.totalScore ?? this.totalScore;
          this.correctCount = summary.correctAnswers ?? this.correctCount;
        }

        this.finished = true;
        localStorage.removeItem('currentExamAttempt');
      },
      error: (error) => {
        console.error('❌ Error finalizing reading exam:', error);
        this.finished = true;
      },
    });
  }

  // ============= EXAM HISTORY =============

  showExamAttemptDetails(): void {
    if (!this.attemptId) return;

    this.examAttemptService.getAttemptDetails(this.attemptId).subscribe({
      next: (details) => {
        this.examAttemptDetails = details;
        this.showExamAttemptDetailsFlag = true;
        console.log('✅ Fetched exam attempt details:', details);
      },
      error: (error) => {
        console.error('❌ Error fetching exam attempt details:', error);
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
        next: () => console.log('✅ Reading progress saved'),
        error: (error) => console.error('❌ Error saving progress:', error),
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
        console.log('✅ Reading progress saved successfully');
        localStorage.removeItem('currentExamAttempt');
        this.router.navigate(['homepage/user-dashboard/exams']);
      },
      error: (error) => {
        console.error('❌ Error saving reading progress:', error);
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
