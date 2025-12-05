import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  OnInit,
  HostListener,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportPopupComponent } from '../../Report/report-popup/report-popup.component';
import { Router, NavigationStart } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PromptComponent } from '../../prompt/prompt.component';
import { TimeComponent } from '../../time/time.component';
import { SpeakingAnswerBoxComponent } from '../../speaking-answer-box/speaking-answer-box.component';
import { SpeakingSummaryComponent } from '../../speaking-summary/speaking-summary.component';
import {
  QuestionDTO,
  ExamPartDTO,
  SpeakingScoringResult,
} from '../../../../Interfaces/exam.interfaces';
import {
  QuestionState,
  SpeakingQuestionTiming,
} from '../../../../Services/Exam/Speaking/speaking-question-state.service';
import { BaseQuestionService } from '../../../../Services/Question/base-question.service';
import { SpeakingQuestionStateService } from '../../../../Services/Exam/Speaking/speaking-question-state.service';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';
import { QuotaService } from '../../../../Services/Quota/quota.service';
import { QuotaLimitModalComponent } from '../../quota-limit-modal/quota-limit-modal.component';
import { ExamCoordinationService } from '../../../../Services/exam-coordination.service';
import { ToastService } from '../../../../Services/Toast/toast.service';
import { SidebarService } from '../../../../Services/sidebar.service';

interface QuestionResult {
  questionNumber: number;
  questionText: string;
  result: SpeakingScoringResult;
}

@Component({
  selector: 'app-speaking',
  standalone: true,
  imports: [
    CommonModule,
    PromptComponent,

    SpeakingAnswerBoxComponent,
    SpeakingSummaryComponent,
    QuotaLimitModalComponent,
    ReportPopupComponent,
  ],
  templateUrl: './speaking.component.html',
  styleUrl: './speaking.component.scss',
})
export class SpeakingComponent implements OnChanges, OnDestroy, OnInit {
  showReportPopup = false;
  get examId(): number | null {
    return this.partInfo?.examId ?? null;
  }
  @Input() questions: QuestionDTO[] = [];
  @Input() partInfo: ExamPartDTO | null = null;
  @Input() isInMockTest: boolean = false;
  @Input() mockTestAttemptId: number | null = null; // AttemptId passed from MockTest parent
  @Output() speakingAnswered = new EventEmitter<boolean>();
  @Output() speakingPartCompleted = new EventEmitter<void>();

  showExplain = false;
  latestPictureCaption: string = '';
  speakingResults: Map<number, SpeakingScoringResult> = new Map();
  showSpeakingSummary = false;
  speakingQuestionResults: QuestionResult[] = [];
  isSpeakingSubmitting = false;
  private advanceTimer: any = null;
  attemptId: number | null = null;

  showQuotaModal = false;
  quotaMessage =
    'Kỹ năng Speaking chỉ dành cho tài khoản Premium. Vui lòng nâng cấp để sử dụng tính năng này!';

  private stateSubscription: Subscription = new Subscription();
  private routerSubscription: Subscription | null = null;
  scoringQueue: number[] = [];
  isProcessingQueue = false;
  resetCounter = 0;
  private isRecordingInProgress = false;
  isAutoAdvancing = false;

  private isAutoSubmitting = false;

  private isWaitingForAllScored = false;

  constructor(
    private router: Router,
    private baseQuestionService: BaseQuestionService,
    private speakingStateService: SpeakingQuestionStateService,
    private examAttemptService: ExamAttemptService,
    private quotaService: QuotaService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private examCoordination: ExamCoordinationService,
    private toastService: ToastService,
    private sidebarService: SidebarService
  ) {
    this.stateSubscription = this.speakingStateService
      .getStates()
      .subscribe((states) => {
        this.updateSpeakingResults(states);

        if (!this.isRecordingInProgress) {
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        }

        if (
          !this.isAutoSubmitting &&
          !this.showSpeakingSummary &&
          this.hasSpeakingQuestions()
        ) {
          const questionStates = this.questions.map((q) => {
            const s = this.speakingStateService.getQuestionState(q.questionId);
            return {
              questionId: q.questionId,
              state: s?.state || 'not_started',
            };
          });

          const allScored = questionStates.every((qs) => qs.state === 'scored');
          const hasScoringInProgress = questionStates.some(
            (qs) => qs.state === 'scoring' || qs.state === 'submitted'
          );

          if (hasScoringInProgress && !this.isWaitingForAllScored) {
            this.isWaitingForAllScored = true;
          }

          if (allScored) {
            this.isAutoSubmitting = true;
            this.isWaitingForAllScored = false;

            setTimeout(() => {
              this.finishSpeakingExam();
            }, 1000);
          }
        }
      });
  }

  onReportPopupClose(): void {
    this.showReportPopup = false;
    this.cdr.detectChanges();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mockTestAttemptId'] && this.isInMockTest) {
      const newAttemptId = changes['mockTestAttemptId'].currentValue;
      if (newAttemptId && newAttemptId > 0) {
        this.attemptId = newAttemptId;
        console.log(
          '[SpeakingComponent] mockTestAttemptId updated:',
          this.attemptId
        );
      }
    }

    if (changes['questions']) {
      const previousQuestions = changes['questions'].previousValue;
      const currentQuestions = changes['questions'].currentValue;

      console.log('[SpeakingComponent] ngOnChanges - questions changed:', {
        previousCount: previousQuestions?.length || 0,
        currentCount: currentQuestions?.length || 0,
        previousIds:
          previousQuestions?.map((q: QuestionDTO) => q.questionId) || [],
        currentIds:
          currentQuestions?.map((q: QuestionDTO) => q.questionId) || [],
        isInMockTest: this.isInMockTest,
        speakingResultsSize: this.speakingResults.size,
        speakingResultsKeys: Array.from(this.speakingResults.keys()),
      });

      // FIX: Reset speaking results when questions change (different part)
      // Check if this is a different set of questions (different part)
      const previousIds = new Set(
        previousQuestions?.map((q: QuestionDTO) => q.questionId) || []
      );
      const currentIds = new Set(
        currentQuestions?.map((q: QuestionDTO) => q.questionId) || []
      );
      const isDifferentPart =
        previousIds.size > 0 &&
        !Array.from(currentIds).some((id) => previousIds.has(id));

      if (isDifferentPart && this.isInMockTest) {
        console.log(
          '[SpeakingComponent] Detected part change in MockTest - clearing speakingResults'
        );
        this.speakingResults.clear();
        this.speakingQuestionResults = [];
        this.speakingStateService.resetAllStates();
        this.isAutoSubmitting = false;
        this.isWaitingForAllScored = false;
      }

      this.baseQuestionService.initializeQuestions(this.questions);
    }
  }

  async ngOnInit(): Promise<void> {
    const shouldClearStates = sessionStorage.getItem('clearSpeakingStates');
    if (shouldClearStates === 'true') {
      this.speakingStateService.resetAllStates();
      sessionStorage.removeItem('clearSpeakingStates');
    }

    this.loadAttemptId();
    this.checkQuotaAccess();
    this.sidebarService.hideSidebar(); // Ẩn sidebar khi bắt đầu làm bài

    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe((event: NavigationStart) => {
        if (!this.showSpeakingSummary && !this.finished) {
          this.cleanupSpeakingSessionOnExit();
        }
      });

    if (this.attemptId && this.attemptId > 0) {
      const canProceed = await this.examCoordination.startExamSession(
        this.partInfo?.examId || 0,
        this.attemptId,
        this.partInfo?.partId
      );

      if (!canProceed) {
        const conflicting = this.examCoordination.getConflictingSession();
        const confirmTakeover = confirm(
          `Bài thi này đang được mở ở tab khác (bắt đầu lúc ${new Date(
            conflicting!.startTime
          ).toLocaleString()}).\n\n` +
            `Tiếp tục có thể gây xung đột dữ liệu. Bạn có chắc chắn muốn tiếp tục?`
        );

        if (confirmTakeover) {
          this.examCoordination.forceTakeOver();
        } else {
          this.router.navigate(['/']);
          return;
        }
      }

      this.examCoordination.conflictDetected$.subscribe((hasConflict) => {
        if (hasConflict) {
          this.toastService.warning(
            'Cảnh báo: Bài thi này đang được mở ở tab khác. Có thể xảy ra xung đột dữ liệu!'
          );
        }
      });
    }
  }

  ngOnDestroy(): void {
    // Stop all timers and clear toasts first
    this.toastService.clear(); // Clear all toast messages

    // Unsubscribe from observables
    this.stateSubscription.unsubscribe();

    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }

    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
      this.advanceTimer = null;
    }

    // Cleanup speaking session
    if (!this.finished && !this.showSpeakingSummary) {
      this.cleanupSpeakingSessionOnExit();
    }

    // End exam session
    this.examCoordination.endExamSession();

    // Show sidebar after everything is cleaned up
    this.sidebarService.showSidebar();
  }

  private loadAttemptId(): void {
    try {
      if (
        this.isInMockTest &&
        this.mockTestAttemptId &&
        this.mockTestAttemptId > 0
      ) {
        this.attemptId = this.mockTestAttemptId;
        console.log(
          '[Speaking] Using mockTestAttemptId from parent:',
          this.attemptId
        );
        return;
      }

      const stored = localStorage.getItem('currentExamAttempt');

      if (!stored) {
        if (this.isInMockTest) {
          console.warn(
            '[Speaking]  In mock test mode - waiting for mock test to create attempt'
          );
          return;
        }

        this.createNewAttempt();
        return;
      }

      const parsed = JSON.parse(stored);
      this.attemptId = parsed.attemptID || parsed.attemptId || null;

      if (this.attemptId === null || this.attemptId <= 0) {
        console.error('[Speaking]  Invalid attemptId:', this.attemptId);

        if (this.isInMockTest) {
          console.warn(
            '[Speaking]  In mock test mode - invalid attempt, waiting for mock test'
          );
          return;
        }

        this.createNewAttempt();
      }
    } catch (error) {
      console.error('[Speaking]  Error loading attemptId:', error);

      if (!this.isInMockTest) {
        this.createNewAttempt();
      }
    }
  }

  private createNewAttempt(): void {
    if (!this.partInfo || !this.partInfo.examId || !this.partInfo.partId) {
      console.error('[Speaking]  Cannot create attempt: Missing partInfo');
      alert('Lỗi: Không thể khởi tạo bài thi. Vui lòng quay lại và thử lại.');
      return;
    }

    const userStr = localStorage.getItem('lumina_user');
    if (!userStr) {
      console.error('[Speaking]  No user found in localStorage');
      alert('Vui lòng đăng nhập lại.');
      this.router.navigate(['/auth/login']);
      return;
    }

    const currentUser = JSON.parse(userStr);

    const attemptRequest = {
      attemptID: 0,
      userID: Number(currentUser.id),
      examID: this.partInfo.examId,
      examPartId: this.partInfo.partId,
      startTime: new Date().toISOString(),
      endTime: null,
      score: null,
      status: 'Doing',
    };

    this.examAttemptService.startExam(attemptRequest).subscribe({
      next: (response) => {
        localStorage.setItem('currentExamAttempt', JSON.stringify(response));
        this.attemptId = response.attemptID;
      },
      error: (error) => {
        console.error('[Speaking]  Failed to create attempt:', error);
        alert('Lỗi khi khởi tạo bài thi. Vui lòng thử lại.');
      },
    });
  }

  private checkQuotaAccess(): void {
    this.quotaService.checkQuota('speaking').subscribe({
      next: (result) => {
        if (!result.isPremium) {
          this.showQuotaModal = true;
        }
      },
      error: (err) => {
        console.error(' Failed to check quota:', err);
      },
    });
  }

  closeQuotaModal(): void {
    this.showQuotaModal = false;
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }

  get currentIndex(): number {
    return this.baseQuestionService.currentIndex;
  }

  get totalScore(): number {
    return this.baseQuestionService.totalScore;
  }

  get correctCount(): number {
    return this.baseQuestionService.correctCount;
  }

  get finished(): boolean {
    return this.baseQuestionService.finished;
  }

  get percentCorrect(): number {
    return this.baseQuestionService.percentCorrect;
  }

  get feedbackText(): string {
    return this.baseQuestionService.feedbackText;
  }

  onSpeakingResult(event: {
    questionId: number;
    result: SpeakingScoringResult;
  }): void {
    const { questionId, result } = event;

    console.log('[SpeakingComponent] onSpeakingResult received:', {
      questionId: questionId,
      overallScore: result?.overallScore,
      currentQuestionsIds: this.questions.map((q) => q.questionId),
      isInMockTest: this.isInMockTest,
      speakingResultsBeforeUpdate: Array.from(this.speakingResults.keys()),
    });

    const q = this.questions.find((q) => q.questionId === questionId);

    if (!q) {
      console.error(
        '[SpeakingComponent]  Question not found for questionId:',
        questionId,
        'Available questions:',
        this.questions.map((q) => q.questionId)
      );
      return;
    }

    if (result.overallScore !== null && result.overallScore !== undefined) {
      this.speakingResults.set(q.questionId, result);

      console.log(
        '[SpeakingComponent] Result stored for questionId:',
        q.questionId,
        {
          speakingResultsAfterUpdate: Array.from(this.speakingResults.keys()),
          areAllQuestionsNowScored: this.questions.every((q) =>
            this.speakingResults.has(q.questionId)
          ),
        }
      );

      const questionIndex = this.questions.findIndex(
        (q) => q.questionId === questionId
      );
      const existingIndex = this.speakingQuestionResults.findIndex(
        (x) => x.questionNumber === questionIndex + 1
      );
      const item = {
        questionNumber: questionIndex + 1,
        questionText: q.stemText,
        result: result,
      };
      if (existingIndex >= 0) {
        this.speakingQuestionResults[existingIndex] = item;
      } else {
        this.speakingQuestionResults.push(item);
      }

      const scoreRatio = result.overallScore / 100;
      const earnedScore = (q.scoreWeight ?? 0) * scoreRatio;

      const roundedScore = Math.round(earnedScore * 100) / 100;
      this.baseQuestionService.addScore(roundedScore);

      if (result.overallScore >= 60) {
        this.baseQuestionService.incrementCorrectCount();
      }
    } else {
      console.warn('[SpeakingComponent]  Invalid result received:', {
        questionId: questionId,
        hasQuestion: !!q,
        overallScore: result?.overallScore,
      });
    }
  }

  onSpeakingSubmitting(isSubmitting: boolean): void {
    this.isSpeakingSubmitting = isSubmitting;
    if (!isSubmitting) {
    }
  }

  // Mock test helper methods
  areAllQuestionsScored(): boolean {
    if (!this.questions || this.questions.length === 0) {
      console.log(
        '[SpeakingComponent] areAllQuestionsScored: No questions, returning false'
      );
      return false;
    }

    const allScored = this.questions.every((q) =>
      this.speakingResults.has(q.questionId)
    );

    console.log('[SpeakingComponent] areAllQuestionsScored check:', {
      questionIds: this.questions.map((q) => q.questionId),
      speakingResultsKeys: Array.from(this.speakingResults.keys()),
      speakingResultsSize: this.speakingResults.size,
      questionsLength: this.questions.length,
      allScored: allScored,
      eachQuestionStatus: this.questions.map((q) => ({
        questionId: q.questionId,
        hasResult: this.speakingResults.has(q.questionId),
      })),
    });

    return allScored;
  }

  getScoredCount(): number {
    // Only count results for current questions
    const count = this.questions.filter((q) =>
      this.speakingResults.has(q.questionId)
    ).length;
    console.log('[SpeakingComponent] getScoredCount:', {
      totalQuestions: this.questions.length,
      scoredCount: count,
      speakingResultsSize: this.speakingResults.size,
    });
    return count;
  }

  onNextPartClicked(): void {
    console.log('[SpeakingComponent] onNextPartClicked called:', {
      areAllQuestionsScored: this.areAllQuestionsScored(),
      isInMockTest: this.isInMockTest,
    });

    if (this.isInMockTest) {
      if (this.areAllQuestionsScored()) {
        console.log(
          '[SpeakingComponent] onNextPartClicked: All scored in MockTest, emitting speakingPartCompleted'
        );
        this.baseQuestionService.finishQuiz();
        this.speakingPartCompleted.emit();
      } else {
        console.log(
          '[SpeakingComponent] onNextPartClicked: Not all scored yet, waiting...'
        );
      }
    } else {
      // Ngoài MockTest, gọi finishSpeakingExam bình thường
      if (this.areAllQuestionsScored()) {
        this.finishSpeakingExam();
      }
    }
  }

  onRecordingStatusChange(isRecording: boolean): void {
    this.isRecordingInProgress = isRecording;

    if (!isRecording) {
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 0);
    }
  }

  onTimeout(): void {
    if (this.isSpeakingPart()) {
      return;
    }
  }

  getCurrentQuestionTiming(): SpeakingQuestionTiming {
    const currentQuestion = this.questions[this.currentIndex];
    if (!currentQuestion) {
      return {
        questionNumber: 0,
        partNumber: 0,
        preparationTime: 0,
        recordingTime: 0,
      };
    }

    const questionNumber = this.getQuestionNumber(currentQuestion.questionId);
    return this.speakingStateService.getQuestionTiming(questionNumber);
  }

  private getQuestionNumber(questionId: number): number {
    const index = this.questions.findIndex((q) => q.questionId === questionId);
    return index >= 0 ? index + 1 : 1;
  }

  onAutoAdvanceNext(): void {
    this.isAutoAdvancing = true;

    setTimeout(() => {
      if (this.currentIndex < this.questions.length - 1) {
        const nextIndex = this.currentIndex + 1;
        this.baseQuestionService.navigateToQuestion(nextIndex);
        this.resetCounter++;
      } else {
        if (this.isInMockTest && this.areAllQuestionsScored()) {
          console.log(
            '[SpeakingComponent] onAutoAdvanceNext: Last question scored in MockTest, auto-finishing'
          );
          this.finishSpeakingExam();
        } else if (!this.isInMockTest) {
          this.finishSpeakingExam();
        }
        // Nếu trong MockTest nhưng chưa chấm xong, không làm gì - chờ scoring hoàn tất
      }

      this.isAutoAdvancing = false;
      this.cdr.markForCheck();
    }, 1500);
  }

  onPictureCaption(caption: string): void {
    this.latestPictureCaption = caption || '';
  }

  private hasSpeakingQuestions(): boolean {
    return this.isSpeakingPart();
  }

  private isSpeakingPart(): boolean {
    if (!this.partInfo || !this.partInfo.partCode) {
      return false;
    }
    const partCodeUpper = this.partInfo.partCode.toUpperCase();
    return partCodeUpper.includes('SPEAKING');
  }

  isSpeakingQuestion(questionType?: string): boolean {
    return this.isSpeakingPart();
  }

  navigateToQuestion(index: number): void {
    if (index < 0 || index >= this.questions.length) return;

    this.baseQuestionService.navigateToQuestion(index);
    this.showExplain = false;
    this.latestPictureCaption = '';

    this.resetCounter++;
  }

  private updateSpeakingResults(states: Map<number, any>): void {
    const newResults: QuestionResult[] = [];
    states.forEach((state, questionId) => {
      if (state.result) {
        const question = this.questions.find(
          (q) => q.questionId === questionId
        );
        if (question) {
          newResults.push({
            questionNumber: this.questions.indexOf(question) + 1,
            questionText: question.stemText,
            result: state.result,
          });
        }
      }
    });

    const hasChanges =
      newResults.length !== this.speakingQuestionResults.length ||
      newResults.some((nr, idx) => {
        const existing = this.speakingQuestionResults[idx];
        return (
          !existing ||
          nr.questionNumber !== existing.questionNumber ||
          nr.result.overallScore !== existing.result.overallScore
        );
      });

    if (hasChanges) {
      this.speakingQuestionResults = newResults;
    }
  }

  getQuestionState(questionId: number): QuestionState {
    const state = this.speakingStateService.getQuestionState(questionId);
    return state?.state || 'not_started';
  }

  getQuestionStateIcon(questionId: number): string {
    const state = this.getQuestionState(questionId);
    switch (state) {
      case 'not_started':
        return '🔵';
      case 'in_progress':
        return '🟡';
      case 'has_recording':
        return '🟡';
      case 'submitted':
        return '⏳';
      case 'scoring':
        return '⏱️';
      case 'scored':
        return '✅';
      default:
        return '🔵';
    }
  }

  getQuestionStateText(questionId: number): string {
    const state = this.getQuestionState(questionId);
    switch (state) {
      case 'not_started':
        return 'Chưa làm';
      case 'in_progress':
        return 'Đang làm';
      case 'has_recording':
        return 'Có ghi âm';
      case 'submitted':
        return 'Đã nộp';
      case 'scoring':
        return 'Đang chấm';
      case 'scored':
        return 'Đã có điểm';
      default:
        return 'Chưa làm';
    }
  }

  canNavigateToQuestion(index: number): boolean {
    return index >= 0 && index < this.questions.length;
  }

  isCurrentQuestion(index: number): boolean {
    return index === this.currentIndex;
  }

  async finishSpeakingExam(): Promise<void> {
    console.log('[SpeakingComponent] finishSpeakingExam called:', {
      showSpeakingSummary: this.showSpeakingSummary,
      hasSpeakingQuestions: this.hasSpeakingQuestions(),
      isInMockTest: this.isInMockTest,
      questionsCount: this.questions.length,
      speakingResultsSize: this.speakingResults.size,
      questionIds: this.questions.map((q) => q.questionId),
      speakingResultsKeys: Array.from(this.speakingResults.keys()),
    });

    if (this.isInMockTest) {
      console.log(
        '[SpeakingComponent] finishSpeakingExam: In MockTest mode, skipping summary and emitting speakingPartCompleted'
      );

      // Chỉ finish quiz và emit event để ExamComponent xử lý chuyển part
      this.baseQuestionService.finishQuiz();
      this.speakingPartCompleted.emit();

      console.log(
        '[SpeakingComponent] finishSpeakingExam: speakingPartCompleted emitted successfully'
      );
      return;
    }

    // Phần code dưới đây chỉ chạy khi KHÔNG phải MockTest mode
    if (this.showSpeakingSummary) {
      console.log(
        '[SpeakingComponent] finishSpeakingExam: Already showing summary, returning'
      );
      return;
    }

    if (!this.hasSpeakingQuestions()) {
      console.log(
        '[SpeakingComponent] finishSpeakingExam: No speaking questions, returning'
      );
      return;
    }

    const questionStates = this.questions.map((q) => {
      const s = this.speakingStateService.getQuestionState(q.questionId);
      return { questionId: q.questionId, state: s?.state || 'not_started' };
    });

    const hasScoringInProgress = questionStates.some(
      (qs) => qs.state === 'scoring' || qs.state === 'submitted'
    );

    if (hasScoringInProgress) {
      this.isAutoSubmitting = false;
      return;
    }

    const allScored = questionStates.every((qs) => qs.state === 'scored');

    if (!allScored) {
      const incompleteQuestions = this.questions.filter((q) => {
        const state = this.speakingStateService.getQuestionState(q.questionId);
        return (
          state?.state !== 'scored' &&
          state?.state !== 'scoring' &&
          state?.state !== 'submitted'
        );
      });

      if (incompleteQuestions.length > 0) {
        alert(
          `Bạn còn ${incompleteQuestions.length} câu chưa hoàn thành. Vui lòng hoàn thành tất cả câu hỏi trước khi nộp bài.`
        );
        return;
      }
    }

    if (this.attemptId === null || this.attemptId <= 0) {
      this.loadAttemptId();

      if (this.attemptId === null || this.attemptId <= 0) {
        console.error('[Speaking]  Invalid attemptId:', this.attemptId);
        this.showSpeakingSummary = true;
        this.baseQuestionService.finishQuiz();
        return;
      }
    }

    this.isAutoSubmitting = true;

    this.callEndExamAPI();
    this.examAttemptService.finalizeAttempt(this.attemptId).subscribe({
      next: (summary) => {
        if (summary.totalScore !== undefined) {
          this.baseQuestionService.setTotalScore(summary.totalScore);
        }

        this.showSpeakingSummary = true;
        this.baseQuestionService.finishQuiz();

        this.examCoordination.endExamSession();

        localStorage.removeItem('currentExamAttempt');
      },
      error: (error) => {
        console.error('Error finalizing speaking exam:', error);
        this.showSpeakingSummary = true;
        this.baseQuestionService.finishQuiz();

        this.examCoordination.endExamSession();

        localStorage.removeItem('currentExamAttempt');
      },
    });
  }
  private callEndExamAPI(): void {
    try {
      const storedAttempt = localStorage.getItem('currentExamAttempt');
      if (!storedAttempt) {
        console.error(
          '[Speaking]  No currentExamAttempt found in localStorage'
        );
        return;
      }

      const attemptData = JSON.parse(storedAttempt);

      const endExamRequest = {
        attemptID: attemptData.attemptID || attemptData.attemptId,
        userID: attemptData.userID || attemptData.userId,
        examID: attemptData.examID || attemptData.examId,
        examPartId: attemptData.examPartId || null,
        startTime: attemptData.startTime,
        endTime: new Date().toISOString(),
        score: Math.round(this.totalScore),
        status: 'Completed',
      };

      this.examAttemptService.endExam(endExamRequest).subscribe({
        next: (response) => {},
        error: (error) => {
          console.error('[Speaking]  Error ending speaking exam:', error);
          console.error('[Speaking]  Error details:', {
            status: error.status,
            message: error.message,
            error: error.error,
          });
        },
      });
    } catch (error) {
      console.error('[Speaking]  Error parsing currentExamAttempt:', error);
    }
  }
  closeSpeakingSummary(): void {
    this.showSpeakingSummary = false;

    this.cleanupSpeakingSession();
  }

  onRetrySpeakingTest(): void {
    this.cleanupSpeakingSession();
    this.resetQuiz();
  }

  onTryOtherSpeakingTest(): void {
    this.cleanupSpeakingSession();
    this.goToExams();
  }

  goToExams(): void {
    this.sidebarService.showSidebar(); // Hiển thị lại sidebar
    this.router.navigate(['homepage/user-dashboard/exams']);
  }

  resetQuiz(): void {
    this.baseQuestionService.resetQuiz();
    this.showExplain = false;
    this.latestPictureCaption = '';
    this.speakingResults.clear();
    this.speakingQuestionResults = [];
    this.showSpeakingSummary = false;
    this.isSpeakingSubmitting = false;

    this.speakingStateService.resetAllStates();
    this.scoringQueue = [];
    this.isProcessingQueue = false;
  }

  onSpeakingAnswered(isCorrect: boolean): void {
    this.speakingAnswered.emit(isCorrect);
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (!this.finished && !this.showSpeakingSummary && this.attemptId) {
      this.cleanupSpeakingSessionOnExit();

      $event.returnValue = 'Bạn có chắc muốn thoát? Dữ liệu bài thi sẽ bị xóa.';
    }
  }

  private saveProgressOnExit(): void {
    if (!this.finished && this.attemptId) {
      const model = {
        examAttemptId: this.attemptId,
        currentQuestionIndex: this.currentIndex,
      };

      this.examAttemptService.saveProgress(model).subscribe({
        next: () => {},
        error: (error) =>
          console.error('Error saving speaking progress:', error),
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
        this.cleanupSpeakingSession();

        this.router.navigate(['homepage/user-dashboard/exams']);
      },
      error: (error) => {
        console.error('Error saving speaking progress:', error);

        this.cleanupSpeakingSession();

        this.router.navigate(['homepage/user-dashboard/exams']);
      },
    });
  }

  private cleanupSpeakingSession(): void {
    localStorage.removeItem('currentExamAttempt');

    this.speakingStateService.resetAllStates();

    this.speakingResults.clear();
    this.speakingQuestionResults = [];
  }

  private cleanupSpeakingSessionOnExit(): void {
    localStorage.removeItem('currentExamAttempt');

    this.speakingStateService.resetAllStates();

    this.speakingResults.clear();
    this.speakingQuestionResults = [];

    if (this.attemptId) {
      this.questions.forEach((q) => {
        const submissionKey = `speaking_submitting_${q.questionId}_${this.attemptId}`;
        sessionStorage.removeItem(submissionKey);
      });
    }
  }
}
