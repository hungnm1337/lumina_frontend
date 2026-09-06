import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReportPopupComponent } from '../../Report/report-popup/report-popup.component';
import { AuthService } from '../../../../Services/Auth/auth.service';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';
import { ExamAttemptDetailResponseDTO } from '../../../../Interfaces/ExamAttempt/ExamAttemptDetailResponseDTO.interface';
import { ExamAttemptDetailComponent } from '../../ExamAttempt/exam-attempt-detail/exam-attempt-detail.component';
import { QuotaService } from '../../../../Services/Quota/quota.service';
import { QuotaLimitModalComponent } from '../../quota-limit-modal/quota-limit-modal.component';
import { LeaderboardService } from '../../../../Services/Leaderboard/leaderboard.service';
import { PopupComponent } from '../../../Common/popup/popup.component';
import { SidebarService } from '../../../../Services/sidebar.service';
import {
  ExamPartDTO,
  QuestionDTO,
} from '../../../../Interfaces/exam.interfaces';
import {
  QuestionNavigatorComponent,
  NavigatorLegendItem,
} from '../../question-navigator/question-navigator.component';
import { TimeComponent } from '../../time/time.component';
import { ReadingInstructionsComponent } from './reading-instructions.component';
import { ReadingTestToolbarComponent } from './reading-test-toolbar.component';
import { ReadingQuestionViewComponent } from './reading-question-view.component';
import { createReadingQuestionViewModel } from './reading-question-adapter';
import {
  createEmptyReadingQuestionState,
  ReadingQuestionChange,
  ReadingQuestionState,
  ReadingQuestionViewModel,
  ReadingView,
} from './reading-question.models';

@Component({
  selector: 'app-reading',
  standalone: true,
  imports: [
    CommonModule,
    ExamAttemptDetailComponent,
    QuotaLimitModalComponent,
    ReportPopupComponent,
    PopupComponent,
    QuestionNavigatorComponent,
    TimeComponent,
    ReadingInstructionsComponent,
    ReadingTestToolbarComponent,
    ReadingQuestionViewComponent,
  ],
  templateUrl: './reading.component.html',
  styleUrls: ['./reading.component.scss'],
})
export class ReadingComponent implements OnChanges, OnInit, OnDestroy {
  showPopup = false;
  popupMessage = '';
  popupTitle = '';
  popupOkHandler: (() => void) | null = null;
  popupCancelHandler: (() => void) | null = null;
  showReportPopup = false;

  @Input() questions: QuestionDTO[] = [];
  @Input() partInfo: ExamPartDTO | null = null;
  @Output() readingAnswered = new EventEmitter<boolean>();

  currentIndex = 0;
  showExplain = false;
  totalScore = 0;
  correctCount = 0;
  finished = false;
  attemptId: number | null = null;
  isSubmitting = false;
  examStartTime: Date | null = null;

  answeredQuestions: Map<
    number,
    { selectedOptionId: number; isCorrect: boolean; score: number }
  > = new Map();

  examAttemptDetails: ExamAttemptDetailResponseDTO | null = null;
  showExamAttemptDetailsFlag = false;
  showQuotaModal = false;
  quotaMessage = '';

  partTotalTime = 0;
  timerResetTrigger = 0;
  hasShownTimeWarning = false;

  view: ReadingView = 'instructions';
  showQuestionNavigator = false;
  showAccessibilityPanel = false;
  bookmarkedQuestionIds = new Set<number>();
  questionViewModels: ReadingQuestionViewModel[] = [];
  questionStates = new Map<number, ReadingQuestionState>();

  navigatorLegendItems: NavigatorLegendItem[] = [
    { color: 'bg-gray-200', label: 'Chưa làm' },
    { color: 'bg-green-600', label: 'Đã làm' },
    { color: 'bg-blue-600', label: 'Đang làm' },
  ];

  get examId(): number | null {
    return this.partInfo?.examId ?? null;
  }

  get currentQuestion(): QuestionDTO | null {
    return this.questions[this.currentIndex] ?? null;
  }

  get currentViewModel(): ReadingQuestionViewModel | null {
    return this.questionViewModels[this.currentIndex] ?? null;
  }

  get currentQuestionState(): ReadingQuestionState {
    const questionId = this.currentQuestion?.questionId;
    return questionId
      ? this.questionStates.get(questionId) ?? createEmptyReadingQuestionState()
      : createEmptyReadingQuestionState();
  }

  get isCurrentQuestionBookmarked(): boolean {
    const questionId = this.currentQuestion?.questionId;
    return questionId ? this.bookmarkedQuestionIds.has(questionId) : false;
  }

  getQuestionStatus = (questionId: number, index: number): string => {
    if (index === this.currentIndex) return 'current';
    if (this.isQuestionAnswered(questionId)) return 'answered-green-600';
    return 'unanswered';
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private examAttemptService: ExamAttemptService,
    private quotaService: QuotaService,
    private leaderboardService: LeaderboardService,
    private sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    this.loadAttemptId();
    this.incrementQuotaOnStart();
    this.examStartTime = new Date();
    this.sidebarService.hideSidebar();
    this.refreshQuestionModels();
    this.initializePartTimer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions']) {
      this.refreshQuestionModels();
      if (this.questions?.length > 0) {
        this.resetQuiz();
        this.initializePartTimer();
      }
    }
  }

  ngOnDestroy(): void {
    this.saveProgressOnExit();
    this.sidebarService.showSidebar();
  }

  private refreshQuestionModels(): void {
    this.questionViewModels = (this.questions ?? []).map((question) =>
      createReadingQuestionViewModel(question)
    );
    this.questionViewModels.forEach((viewModel) => {
      if (!this.questionStates.has(viewModel.question.questionId)) {
        this.questionStates.set(
          viewModel.question.questionId,
          createEmptyReadingQuestionState()
        );
      }
    });
  }

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
      error: (err) => {
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

  private calculatePartTotalTime(): number {
    if (!this.questions?.length) return 0;
    return this.questions.reduce((total, question) => total + (question.time || 0), 0);
  }

  private initializePartTimer(): void {
    this.partTotalTime = this.calculatePartTotalTime();
    this.timerResetTrigger = Date.now();
    this.hasShownTimeWarning = false;
  }

  onPartTimerTick(remainingTime: number): void {
    if (remainingTime <= 30 && !this.hasShownTimeWarning) {
      this.hasShownTimeWarning = true;
    }
  }

  onPartTimeout(): void {
    this.popupTitle = 'Hết thời gian!';
    this.popupMessage = 'Thời gian làm bài đã hết. Bài thi sẽ được nộp tự động.';
    this.popupOkHandler = () => {
      this.showPopup = false;
      this.finishExamByTimeout();
    };
    this.popupCancelHandler = null;
    this.showPopup = true;
  }

  private finishExamByTimeout(): void {
    this.finishExam();
  }

  onPopupOk(): void {
    this.popupOkHandler?.();
  }

  onPopupCancel(): void {
    this.popupCancelHandler?.();
  }

  beginReading(): void {
    this.view = 'question';
    this.examStartTime = new Date();
    this.timerResetTrigger = Date.now();
  }

  handleNext(): void {
    if (this.view === 'instructions') {
      this.beginReading();
      return;
    }
    this.nextQuestion();
  }

  toggleBookmark(): void {
    const questionId = this.currentQuestion?.questionId;
    if (!questionId) return;

    if (this.bookmarkedQuestionIds.has(questionId)) {
      this.bookmarkedQuestionIds.delete(questionId);
    } else {
      this.bookmarkedQuestionIds.add(questionId);
    }
  }

  toggleQuestionNavigator(): void {
    this.showQuestionNavigator = !this.showQuestionNavigator;
    this.showAccessibilityPanel = false;
  }

  closeQuestionNavigator(): void {
    this.showQuestionNavigator = false;
  }

  toggleAccessibilityPanel(): void {
    this.showAccessibilityPanel = !this.showAccessibilityPanel;
    this.showQuestionNavigator = false;
  }

  onNavigateFromToolbar(index: number): void {
    this.navigateToQuestion(index);
    this.closeQuestionNavigator();
  }

  markAnswered(selectedOptionId: number): void {
    if (this.isSubmitting || !this.attemptId || !this.currentQuestion) return;

    const currentQuestion = this.currentQuestion;
    const previousAnswer = this.answeredQuestions.get(currentQuestion.questionId);
    const isUpdatingAnswer = previousAnswer !== undefined;
    this.isSubmitting = true;

    this.examAttemptService
      .submitReadingAnswerNew({
        examAttemptId: this.attemptId,
        questionId: currentQuestion.questionId,
        selectedOptionId,
      })
      .subscribe({
        next: (response) => {
          if (isUpdatingAnswer && previousAnswer) {
            if (previousAnswer.isCorrect) this.correctCount--;
            this.totalScore -= previousAnswer.score;
          }

          this.answeredQuestions.set(currentQuestion.questionId, {
            selectedOptionId,
            isCorrect: response.isCorrect,
            score: response.score,
          });

          if (response.isCorrect) this.correctCount++;
          this.totalScore += response.score;
          this.isSubmitting = false;
          this.showExplain = true;
          this.readingAnswered.emit(response.isCorrect);
        },
        error: () => {
          this.isSubmitting = false;
        },
      });
  }

  onQuestionChanged(change: ReadingQuestionChange): void {
    const questionId = this.currentQuestion?.questionId;
    if (!questionId) return;

    const previous = this.questionStates.get(questionId) ?? createEmptyReadingQuestionState();
    if (change.type === 'choice') {
      this.questionStates.set(questionId, {
        ...previous,
        selectedOptionId: change.selectedOptionId,
        isComplete: true,
      });
      this.markAnswered(change.selectedOptionId);
      return;
    }

    if (change.type === 'gaps') {
      this.questionStates.set(questionId, {
        ...previous,
        gapSelections: change.gapSelections,
        isComplete: change.isComplete,
      });
      return;
    }

    if (change.type === 'ordering') {
      this.questionStates.set(questionId, {
        ...previous,
        orderedOptionIds: change.orderedOptionIds,
        isComplete: change.isComplete,
      });
      return;
    }

    this.questionStates.set(questionId, {
      ...previous,
      matchingSelections: change.matchingSelections,
      isComplete: change.isComplete,
    });
  }

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
      return;
    }

    this.showPopup = true;
    this.popupTitle = 'Xác nhận nộp bài';
    this.popupMessage =
      'Đây là câu cuối cùng. Bạn có muốn nộp bài ngay không?\n\nChọn "OK" để nộp bài\nChọn "Cancel" để xem lại các câu trước';
    this.popupOkHandler = () => {
      this.showPopup = false;
      this.finishExam();
    };
    this.popupCancelHandler = () => {
      this.showPopup = false;
    };
  }

  finishExamManual(): void {
    const answeredCount = this.questions.filter((question) =>
      this.isQuestionAnswered(question.questionId)
    ).length;
    const totalQuestions = this.questions.length;
    const unansweredCount = totalQuestions - answeredCount;

    let message = `Bạn có chắc chắn muốn nộp bài thi ${this.partInfo?.partCode || 'Reading'} không?\nSố câu đã trả lời: ${answeredCount}/${totalQuestions}`;
    if (unansweredCount > 0) {
      message += `\nSố câu chưa trả lời: ${unansweredCount}\nCác câu chưa trả lời sẽ không được tính điểm!`;
    }

    this.showPopup = true;
    this.popupTitle = 'Xác nhận nộp bài';
    this.popupMessage = message;
    this.popupOkHandler = () => {
      this.showPopup = false;
      this.finishExam();
    };
    this.popupCancelHandler = () => {
      this.showPopup = false;
    };
  }

  navigateToQuestion(index: number): void {
    if (index >= 0 && index < this.questions.length) {
      this.currentIndex = index;
      this.updateExplainState();
    }
  }

  private updateExplainState(): void {
    const questionId = this.currentQuestion?.questionId;
    this.showExplain = questionId ? this.isQuestionAnswered(questionId) : false;
  }

  private finishExam(): void {
    if (!this.attemptId) {
      this.finished = true;
      return;
    }

    this.examAttemptService.finalizeAttempt(this.attemptId).subscribe({
      next: (summary) => {
        if (summary.success !== false) {
          this.totalScore = summary.totalScore ?? this.totalScore;
          this.correctCount = summary.correctAnswers ?? this.correctCount;
        }
        this.finished = true;
        localStorage.removeItem('currentExamAttempt');
        this.calculateLeaderboardScore();
      },
      error: () => {
        this.finished = true;
      },
    });
  }

  private calculateLeaderboardScore(): void {
    if (!this.attemptId || !this.partInfo) return;

    this.leaderboardService
      .calculateScore({
        examAttemptId: this.attemptId,
        examPartId: 2,
        correctAnswers: this.correctCount,
        totalQuestions: this.questions.length,
        timeSpentSeconds: this.calculateTimeSpent(),
        expectedTimeSeconds: 60 * 60,
      })
      .subscribe({ error: () => undefined });
  }

  private calculateTimeSpent(): number {
    if (!this.examStartTime) return 0;
    return Math.floor((Date.now() - this.examStartTime.getTime()) / 1000);
  }

  showExamAttemptDetails(): void {
    if (!this.attemptId) return;
    this.examAttemptService.getAttemptDetails(this.attemptId).subscribe({
      next: (details) => {
        this.examAttemptDetails = details;
        this.showExamAttemptDetailsFlag = true;
      },
    });
  }

  closeExamAttemptDetails(): void {
    this.showExamAttemptDetailsFlag = false;
  }

  getSelectedOptionId(questionId: number): number | null {
    return this.answeredQuestions.get(questionId)?.selectedOptionId ?? this.questionStates.get(questionId)?.selectedOptionId ?? null;
  }

  isQuestionAnswered(questionId: number): boolean {
    return Boolean(
      this.answeredQuestions.has(questionId) ||
      this.questionStates.get(questionId)?.isComplete
    );
  }

  get percentCorrect(): number {
    const total = this.questions?.length || 0;
    return total > 0 ? Math.round((this.correctCount / total) * 100) : 0;
  }

  get feedbackText(): string {
    if (this.percentCorrect < 30) return 'Bạn cần cố gắng nhiều hơn';
    if (this.percentCorrect < 60) return 'Lần sau bạn chắc chắn sẽ làm tốt hơn';
    return 'Bạn hãy tiếp tục phát huy nhé';
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: BeforeUnloadEvent): void {
    if (!this.finished && this.attemptId) {
      $event.returnValue = 'Bạn có muốn lưu tiến trình và thoát không?';
    }
  }

  private saveProgressOnExit(): void {
    if (!this.finished && this.attemptId) {
      this.examAttemptService.saveProgress({
        examAttemptId: this.attemptId,
        currentQuestionIndex: this.currentIndex,
      }).subscribe({ error: () => undefined });
    }
  }

  confirmExit(): void {
    this.showPopup = true;
    this.popupTitle = 'Xác nhận thoát';
    this.popupMessage =
      'Bạn có muốn lưu tiến trình và thoát không?\n\n- Chọn "OK" để lưu và thoát\n- Chọn "Cancel" để tiếp tục làm bài';
    this.popupOkHandler = () => {
      this.showPopup = false;
      this.saveProgressAndExit();
    };
    this.popupCancelHandler = () => {
      this.showPopup = false;
    };
  }

  private saveProgressAndExit(): void {
    if (!this.attemptId) {
      this.router.navigate(['homepage/user-dashboard/exams']);
      return;
    }

    this.examAttemptService.saveProgress({
      examAttemptId: this.attemptId,
      currentQuestionIndex: this.currentIndex,
    }).subscribe({
      next: () => {
        localStorage.removeItem('currentExamAttempt');
        this.router.navigate(['homepage/user-dashboard/exams']);
      },
      error: () => this.router.navigate(['homepage/user-dashboard/exams']),
    });
  }

  resetQuiz(): void {
    this.currentIndex = 0;
    this.showExplain = false;
    this.totalScore = 0;
    this.correctCount = 0;
    this.finished = false;
    this.view = 'instructions';
    this.showQuestionNavigator = false;
    this.showAccessibilityPanel = false;
    this.answeredQuestions.clear();
    this.questionStates.clear();
    this.refreshQuestionModels();
  }

  onReportPopupClose(): void {
    this.showReportPopup = false;
  }

  goToExams(): void {
    this.sidebarService.showSidebar();
    this.router.navigate(['homepage/user-dashboard/exams']);
  }
}
