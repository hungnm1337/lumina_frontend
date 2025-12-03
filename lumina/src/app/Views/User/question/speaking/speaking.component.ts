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
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PromptComponent } from '../../prompt/prompt.component';
import { TimeComponent } from '../../time/time.component';
import { SpeakingAnswerBoxComponent } from '../../speaking-answer-box/speaking-answer-box.component';
import { SpeakingSummaryComponent } from '../../speaking-summary/speaking-summary.component';
import {
  QuestionDTO,
  ExamPartDTO,
  SpeakingScoringResult,
} from '../../../../Interfaces/exam.interfaces';
import { QuestionState, SpeakingQuestionTiming } from '../../../../Services/Exam/Speaking/speaking-question-state.service';
import { BaseQuestionService } from '../../../../Services/Question/base-question.service';
import { SpeakingQuestionStateService } from '../../../../Services/Exam/Speaking/speaking-question-state.service';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';
import { QuotaService } from '../../../../Services/Quota/quota.service';
import { QuotaLimitModalComponent } from '../../quota-limit-modal/quota-limit-modal.component';
import { ExamCoordinationService } from '../../../../Services/exam-coordination.service';
import { ToastService } from '../../../../Services/Toast/toast.service';

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
    TimeComponent,
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
  @Input() isInMockTest: boolean = false; // Để biết đang thi trong mock test hay standalone
  @Output() speakingAnswered = new EventEmitter<boolean>();
  @Output() speakingPartCompleted = new EventEmitter<void>(); // Phát sự kiện khi hoàn thành part

  // Speaking-specific state
  showExplain = false;
  latestPictureCaption: string = '';
  speakingResults: Map<number, SpeakingScoringResult> = new Map();
  showSpeakingSummary = false;
  speakingQuestionResults: QuestionResult[] = [];
  isSpeakingSubmitting = false;
  private advanceTimer: any = null;
  attemptId: number | null = null;

  // Quota modal
  showQuotaModal = false;
  quotaMessage =
    'Kỹ năng Speaking chỉ dành cho tài khoản Premium. Vui lòng nâng cấp để sử dụng tính năng này!';

  // Speaking navigation and state management
  private stateSubscription: Subscription = new Subscription();
  scoringQueue: number[] = [];
  isProcessingQueue = false;
  resetCounter = 0; // Force trigger resetAt changes
  private isRecordingInProgress = false; // ✅ Track recording status
  isAutoAdvancing = false; // ✅ NEW: Track if auto-advance is in progress

  // Auto-submit flag
  private isAutoSubmitting = false;
  
  // ✅ FIX: Flag to track if we're waiting for scoring to complete
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
    private toastService: ToastService
  ) {
    // Subscribe to state changes
    this.stateSubscription = this.speakingStateService
      .getStates()
      .subscribe((states) => {
        // console.log('[SpeakingComponent] State change detected');

        this.updateSpeakingResults(states);

        // ✅ CHỈ update UI khi KHÔNG đang recording
        // Để tránh ngắt quá trình ghi âm
        if (!this.isRecordingInProgress) {
          // Dùng setTimeout để thoát khỏi current change detection cycle
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        } else {
          console.log(
            '[SpeakingComponent] ⚠️ Skipping UI update - recording in progress'
          );
        }
        // ✅ FIX: Auto-submit ONLY when ALL questions are SCORED (not scoring/submitted)
        if (
          !this.isAutoSubmitting &&
          !this.showSpeakingSummary &&
          this.hasSpeakingQuestions()
        ) {
          // Check states of all questions
          const questionStates = this.questions.map((q) => {
            const s = this.speakingStateService.getQuestionState(q.questionId);
            return { questionId: q.questionId, state: s?.state || 'not_started' };
          });
          
          const allScored = questionStates.every((qs) => qs.state === 'scored');
          const hasScoringInProgress = questionStates.some(
            (qs) => qs.state === 'scoring' || qs.state === 'submitted'
          );
          
          // Log current states for debugging
          if (hasScoringInProgress && !this.isWaitingForAllScored) {
            console.log('[SpeakingComponent] ⏳ Waiting for scoring to complete...', questionStates);
            this.isWaitingForAllScored = true;
          }

          if (allScored) {
            console.log(
              '[SpeakingComponent] ✅ All questions SCORED - Auto-submitting exam...',
              questionStates
            );
            this.isAutoSubmitting = true;
            this.isWaitingForAllScored = false;
            
            // Add a small delay for better UX
            setTimeout(() => {
              this.finishSpeakingExam();
            }, 1000);
          }
        }
      });
  }

  // Handler for report popup close
  onReportPopupClose(): void {
    console.log('[SpeakingComponent] Report popup close received');
    this.showReportPopup = false;
    // Ensure UI updates (may be inside modal overlay)
    this.cdr.detectChanges();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions']) {
      // console.log('SpeakingComponent - Questions changed:', this.questions.length);

      // ✅ REMOVED: Không cần init lại questions ở đây
      // Mỗi speaking-answer-box component sẽ tự init questionId của nó trong ngOnInit
      // Việc init từ parent component có thể gây race conditions và side effects
      // if (this.hasSpeakingQuestions()) {
      //   this.questions.forEach((q) => {
      //     this.speakingStateService.initializeQuestion(q.questionId);
      //   });
      // }

      // Initialize base service
      this.baseQuestionService.initializeQuestions(this.questions);
    }
  }

  async ngOnInit(): Promise<void> {
    // ✅ FIX: Check if need to clear speaking states (from console script)
    const shouldClearStates = sessionStorage.getItem('clearSpeakingStates');
    if (shouldClearStates === 'true') {
      console.log(
        '[SpeakingComponent] 🧹 Clearing all speaking states as requested'
      );
      this.speakingStateService.resetAllStates();
      sessionStorage.removeItem('clearSpeakingStates');
      console.log('[SpeakingComponent] ✅ All speaking states cleared');
    }

    this.loadAttemptId();
    this.checkQuotaAccess();

    // ✅ FIX: Start exam coordination
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

      // Subscribe to conflict detection during exam
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
    this.stateSubscription.unsubscribe();
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
    }
    this.saveProgressOnExit();

    // ✅ FIX: End exam coordination
    this.examCoordination.endExamSession();
  }

  // ============= ATTEMPT MANAGEMENT (NEW) =============

  private loadAttemptId(): void {
    try {
      const stored = localStorage.getItem('currentExamAttempt');

      if (!stored) {
        console.warn('[Speaking] ⚠️ No currentExamAttempt in localStorage');

        // ✅ Nếu trong mock test, KHÔNG tạo attempt mới (mock test sẽ tạo)
        if (this.isInMockTest) {
          console.warn(
            '[Speaking] ⚠️ In mock test mode - waiting for mock test to create attempt'
          );
          return;
        }

        // ✅ Chỉ tạo attempt mới khi thi standalone
        this.createNewAttempt();
        return;
      }

      const parsed = JSON.parse(stored);
      this.attemptId = parsed.attemptID || parsed.attemptId || null;

      if (this.attemptId === null || this.attemptId <= 0) {
        console.error('[Speaking] ❌ Invalid attemptId:', this.attemptId);

        // ✅ Nếu trong mock test, KHÔNG tạo attempt mới
        if (this.isInMockTest) {
          console.warn(
            '[Speaking] ⚠️ In mock test mode - invalid attempt, waiting for mock test'
          );
          return;
        }

        // ✅ Chỉ tạo attempt mới khi thi standalone
        this.createNewAttempt();
      } else {
        console.log('[Speaking] ✅ Loaded attemptId:', this.attemptId);
      }
    } catch (error) {
      console.error('[Speaking] ❌ Error loading attemptId:', error);

      // ✅ Nếu trong mock test, KHÔNG tạo attempt mới
      if (!this.isInMockTest) {
        this.createNewAttempt();
      }
    }
  }

  // ✅ FIX Bug #12: Tạo attempt mới nếu không có trong localStorage
  private createNewAttempt(): void {
    console.log('[Speaking] 🆕 Creating new exam attempt...');

    if (!this.partInfo || !this.partInfo.examId || !this.partInfo.partId) {
      console.error('[Speaking] ❌ Cannot create attempt: Missing partInfo');
      alert('Lỗi: Không thể khởi tạo bài thi. Vui lòng quay lại và thử lại.');
      return;
    }

    // Get current user ID from localStorage
    const userStr = localStorage.getItem('lumina_user');
    if (!userStr) {
      console.error('[Speaking] ❌ No user found in localStorage');
      alert('Vui lòng đăng nhập lại.');
      this.router.navigate(['/auth/login']);
      return;
    }

    const currentUser = JSON.parse(userStr);

    const attemptRequest = {
      attemptID: 0, // ✅ FIX: Set to 0 for new attempt
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
        // Lưu vào localStorage
        localStorage.setItem('currentExamAttempt', JSON.stringify(response));

        this.attemptId = response.attemptID; // ✅ FIX: Chỉ dùng attemptID

        console.log('[Speaking] ✅ Created new attemptId:', this.attemptId);
      },
      error: (error) => {
        console.error('[Speaking] ❌ Failed to create attempt:', error);
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
        console.error('❌ Failed to check quota:', err);
      },
    });
  }

  closeQuotaModal(): void {
    this.showQuotaModal = false;
    this.router.navigate(['/homepage/user-dashboard/exams']);
  }

  // Getters for base service properties
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

  // Speaking-specific methods
  onSpeakingResult(event: {
    questionId: number;
    result: SpeakingScoringResult;
  }): void {
    const { questionId, result } = event;
    console.log('[SpeakingComponent] 📊 Received scoring result:', {
      questionId: questionId,
      currentIndex: this.currentIndex,
      result: result,
      overallScore: result?.overallScore,
    });

    // ✅ FIX: Tìm question theo questionId từ event, KHÔNG dùng currentIndex
    const q = this.questions.find((q) => q.questionId === questionId);

    if (!q) {
      console.error(
        '[SpeakingComponent] ❌ Question not found for questionId:',
        questionId
      );
      return;
    }

    if (result.overallScore !== null && result.overallScore !== undefined) {
      console.log(
        '[SpeakingComponent] ✅ Processing result for correct question:',
        {
          questionId: questionId,
          currentIndex: this.currentIndex,
          currentQuestionId: this.questions[this.currentIndex]?.questionId,
          resultBelongsToCurrentQuestion:
            questionId === this.questions[this.currentIndex]?.questionId,
        }
      );

      // Lưu kết quả cho câu hỏi (map theo questionId, không đẩy trùng vào mảng)
      this.speakingResults.set(q.questionId, result);

      // ✅ FIX: Tìm questionNumber dựa trên questionId, không dùng currentIndex
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

      console.log('[SpeakingComponent] ✅ Updated results:', {
        totalResults: this.speakingQuestionResults.length,
        mapSize: this.speakingResults.size,
      });

      // Tính điểm dựa trên overallScore (0-100) chuyển sang scoreWeight
      // Giả sử scoreWeight tối đa là 10, scale theo tỷ lệ
      const scoreRatio = result.overallScore / 100;
      const earnedScore = (q.scoreWeight ?? 0) * scoreRatio;

      // ✅ FIX: Round điểm để tránh floating-point errors (8.340000001 → 8.34)
      const roundedScore = Math.round(earnedScore * 100) / 100;
      this.baseQuestionService.addScore(roundedScore);

      console.log('[SpeakingComponent] 📈 Score calculated:', {
        overallScore: result.overallScore,
        scoreWeight: q.scoreWeight,
        earnedScore: earnedScore,
        roundedScore: roundedScore,
        totalScore: this.totalScore,
      });

      // Coi là đúng nếu điểm >= 60
      if (result.overallScore >= 60) {
        this.baseQuestionService.incrementCorrectCount();
      }
    } else {
      console.warn('[SpeakingComponent] ⚠️ Invalid result received:', {
        questionId: questionId,
        hasQuestion: !!q,
        overallScore: result?.overallScore,
      });
    }
  }

  onSpeakingSubmitting(isSubmitting: boolean): void {
    this.isSpeakingSubmitting = isSubmitting;
    // console.log('[SpeakingComponent] Speaking submitting:', isSubmitting);

    // For speaking: don't auto-advance after submission
    // User will manually navigate using Previous/Next buttons
    if (!isSubmitting) {
      // console.log('[SpeakingComponent] Speaking submission completed - staying on current question');
    }
  }

  /**
   * ✅ Handler để nhận trạng thái recording từ SpeakingAnswerBox
   * Khi đang recording, tạm dừng detectChanges để tránh ngắt quá trình ghi âm
   */
  onRecordingStatusChange(isRecording: boolean): void {
    this.isRecordingInProgress = isRecording;
    console.log(
      `[SpeakingComponent] 🎤 Recording status changed: ${
        isRecording ? 'STARTED' : 'STOPPED'
      }`
    );

    // ✅ Khi kết thúc recording, trigger change detection để cập nhật UI
    if (!isRecording) {
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 0);
    }
  }

  onTimeout(): void {
    // For speaking questions: only show warning, don't trigger any action
    if (this.isSpeakingPart()) {
      // console.log('[SpeakingComponent] Timer timeout for speaking question - no action taken');
      return;
    }
  }

  /**
   * ✅ NEW: Get timing configuration for current question
   */
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

    // Map questionId to question number (1-11 for full speaking test)
    const questionNumber = this.getQuestionNumber(currentQuestion.questionId);
    return this.speakingStateService.getQuestionTiming(questionNumber);
  }

  /**
   * ✅ NEW: Map questionId to question number (1-11)
   * This is a simple 1-based index for now
   */
  private getQuestionNumber(questionId: number): number {
    const index = this.questions.findIndex((q) => q.questionId === questionId);
    return index >= 0 ? index + 1 : 1;
  }

  /**
   * ✅ NEW: Handle auto-advance to next question
   */
  onAutoAdvanceNext(): void {
    // console.log('[SpeakingComponent] Auto-advancing to next question');
    this.isAutoAdvancing = true;

    // Small delay for UX
    setTimeout(() => {
      if (this.currentIndex < this.questions.length - 1) {
        const nextIndex = this.currentIndex + 1;
        this.baseQuestionService.navigateToQuestion(nextIndex);
        this.resetCounter++;
      } else {
        // Last question - finish exam
        // console.log('[SpeakingComponent] Last question completed, finishing exam');
        this.finishSpeakingExam();
      }
      
      this.isAutoAdvancing = false;
      this.cdr.markForCheck();
    }, 1500); // 1.5 second delay for better UX
  }


  onPictureCaption(caption: string): void {
    this.latestPictureCaption = caption || '';
  }

  // Speaking question type detection
  private hasSpeakingQuestions(): boolean {
    return this.isSpeakingPart();
  }

  // ✅ Kiểm tra theo partCode thay vì questionType
  private isSpeakingPart(): boolean {
    if (!this.partInfo || !this.partInfo.partCode) {
      return false;
    }
    const partCodeUpper = this.partInfo.partCode.toUpperCase();
    return partCodeUpper.includes('SPEAKING');
  }

  // ✅ DEPRECATED: Giữ lại cho backward compatibility nhưng dùng partCode
  isSpeakingQuestion(questionType?: string): boolean {
    return this.isSpeakingPart();
  }

  // Navigation methods for speaking questions
  previousQuestion(): void {
    if (this.currentIndex > 0) {
      this.navigateToQuestion(this.currentIndex - 1);
    }
  }

  nextQuestionManual(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.navigateToQuestion(this.currentIndex + 1);
    }
  }

  navigateToQuestion(index: number): void {
    if (index < 0 || index >= this.questions.length) return;

    const currentQuestion = this.questions[this.currentIndex];

    // For speaking questions: handle state preservation
    if (this.isSpeakingPart() && currentQuestion) {
      this.handleSpeakingNavigation(currentQuestion.questionId);
    }

    this.baseQuestionService.navigateToQuestion(index);
    this.showExplain = false;
    this.latestPictureCaption = '';

    // Force trigger resetAt change for speaking questions
    this.resetCounter++;
  }

  private handleSpeakingNavigation(questionId: number): void {
    // If current question was submitted, add to scoring queue
    const state = this.speakingStateService.getQuestionState(questionId);
    if (state?.state === 'submitted') {
      this.addToScoringQueue(questionId);
    }
  }

  private addToScoringQueue(questionId: number): void {
    if (!this.scoringQueue.includes(questionId)) {
      this.scoringQueue.push(questionId);
      this.speakingStateService.markAsScoring(questionId);
      this.processScoringQueue();
    }
  }

  private async processScoringQueue(): Promise<void> {
    if (this.isProcessingQueue || this.scoringQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.scoringQueue.length > 0) {
      const questionId = this.scoringQueue.shift()!;
      await this.scoreQuestion(questionId);
    }

    this.isProcessingQueue = false;
  }

  private async scoreQuestion(questionId: number): Promise<void> {
    try {
      console.log(
        `[SpeakingComponent] Processing score for question ${questionId}`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(
        `[SpeakingComponent] Error processing score for question ${questionId}:`,
        error
      );
      this.speakingStateService.setError(questionId, 'Lỗi khi chấm điểm');
    }
  }

  private updateSpeakingResults(states: Map<number, any>): void {
    // ✅ FIX: Build new results array
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

    // ✅ FIX: Only update if array content actually changed
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
      console.log(
        '[SpeakingComponent] 📊 Speaking results updated - changes detected'
      );
      this.speakingQuestionResults = newResults;
    } else {
      console.log(
        '[SpeakingComponent] ℹ️ Speaking results unchanged - skipping update'
      );
    }

    // ✅ Log state changes for debugging
    console.log('[SpeakingComponent] 🔄 States updated:', {
      totalQuestions: this.questions.length,
      statesCount: states.size,
      states: Array.from(states.entries()).map(([qId, state]) => ({
        questionId: qId,
        state: state.state,
        hasResult: !!state.result,
      })),
    });
  }

  // UI helper methods
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

  // Line 436-465: finishSpeakingExam()
  async finishSpeakingExam(): Promise<void> {
    // ✅ FIX: Guard against multiple calls - if already showing summary, don't proceed
    if (this.showSpeakingSummary) {
      console.log('[Speaking] ⚠️ Already showing summary, skipping finishSpeakingExam');
      return;
    }
    
    if (!this.hasSpeakingQuestions()) {
      return;
    }

    // ✅ Nếu đang trong mock test, chỉ phát sự kiện và KHÔNG hiển thị summary, KHÔNG check làm hết câu
    if (this.isInMockTest) {
      console.log(
        '[Speaking] ✅ Speaking part completed in mock test - emitting event'
      );
      this.baseQuestionService.finishQuiz();
      this.speakingPartCompleted.emit();
      return;
    }

    // ✅ FIX: Check if any question is still being scored - if so, don't proceed yet
    const questionStates = this.questions.map((q) => {
      const s = this.speakingStateService.getQuestionState(q.questionId);
      return { questionId: q.questionId, state: s?.state || 'not_started' };
    });
    
    const hasScoringInProgress = questionStates.some(
      (qs) => qs.state === 'scoring' || qs.state === 'submitted'
    );
    
    if (hasScoringInProgress) {
      console.log('[Speaking] ⏳ Scoring still in progress, waiting...', questionStates);
      // Don't show popup, just wait - the subscription will call this again when all scored
      this.isAutoSubmitting = false; // Reset flag so it can be triggered again
      return;
    }
    
    // ✅ Check if ALL questions are scored (not just submitted)
    const allScored = questionStates.every((qs) => qs.state === 'scored');

    if (!allScored) {
      // Show warning about incomplete questions (only those not started or has_recording)
      const incompleteQuestions = this.questions.filter((q) => {
        const state = this.speakingStateService.getQuestionState(q.questionId);
        // Only count as incomplete if not_started, in_progress, or has_recording
        return state?.state !== 'scored' && 
               state?.state !== 'scoring' && 
               state?.state !== 'submitted';
      });

      if (incompleteQuestions.length > 0) {
        alert(
          `Bạn còn ${incompleteQuestions.length} câu chưa hoàn thành. Vui lòng hoàn thành tất cả câu hỏi trước khi nộp bài.`
        );
        return;
      }
    }

    // ✅ FIX: Check attemptId BEFORE making API calls
    if (this.attemptId === null || this.attemptId <= 0) {
      // Try to reload from localStorage
      this.loadAttemptId();
      
      if (this.attemptId === null || this.attemptId <= 0) {
        console.error('[Speaking] ❌ Invalid attemptId:', this.attemptId);
        // Still show summary with local results even if API fails
        this.showSpeakingSummary = true;
        this.baseQuestionService.finishQuiz();
        return;
      }
    }
    
    // ✅ FIX: Set flag BEFORE API calls to prevent re-entry
    this.isAutoSubmitting = true;

    // ✅ Nếu thi standalone, gọi API và hiển thị summary như cũ
    this.callEndExamAPI();
    this.examAttemptService.finalizeAttempt(this.attemptId).subscribe({
      next: (summary) => {
        console.log('Speaking exam finalized:', summary);

        // Update scores from backend if available
        if (summary.totalScore !== undefined) {
          this.baseQuestionService.setTotalScore(summary.totalScore);
        }

        // Show summary
        this.showSpeakingSummary = true;
        this.baseQuestionService.finishQuiz();

        // End coordination
        this.examCoordination.endExamSession();

        // ✅ FIX Bug #14: KHÔNG xóa speakingQuestionResults ngay
        // Chỉ cleanup localStorage, để results hiển thị trong modal
        localStorage.removeItem('currentExamAttempt');
      },
      error: (error) => {
        console.error('Error finalizing speaking exam:', error);
        // Still show summary even if API fails
        this.showSpeakingSummary = true;
        this.baseQuestionService.finishQuiz();

        // End coordination
        this.examCoordination.endExamSession();

        // ✅ FIX Bug #14: Giữ results để hiển thị
        localStorage.removeItem('currentExamAttempt');
      },
    });
  }
  private callEndExamAPI(): void {
    try {
      const storedAttempt = localStorage.getItem('currentExamAttempt');
      if (!storedAttempt) {
        console.error(
          '[Speaking] ❌ No currentExamAttempt found in localStorage'
        );
        return;
      }

      const attemptData = JSON.parse(storedAttempt);
      console.log('[Speaking] 📦 Attempt data from localStorage:', attemptData);

      const endExamRequest = {
        attemptID: attemptData.attemptID || attemptData.attemptId,
        userID: attemptData.userID || attemptData.userId,
        examID: attemptData.examID || attemptData.examId,
        examPartId: attemptData.examPartId || null,
        startTime: attemptData.startTime,
        endTime: new Date().toISOString(),
        score: Math.round(this.totalScore), // Lấy điểm từ baseQuestionService
        status: 'Completed',
      };

      console.log(
        '[Speaking] 🚀 Calling endExam API with request:',
        endExamRequest
      );

      this.examAttemptService.endExam(endExamRequest).subscribe({
        next: (response) => {
          console.log(
            '[Speaking] ✅ Speaking exam ended successfully:',
            response
          );
        },
        error: (error) => {
          console.error('[Speaking] ❌ Error ending speaking exam:', error);
          console.error('[Speaking] ❌ Error details:', {
            status: error.status,
            message: error.message,
            error: error.error,
          });
        },
      });
    } catch (error) {
      console.error('[Speaking] ❌ Error parsing currentExamAttempt:', error);
    }
  }
  closeSpeakingSummary(): void {
    console.log('[Speaking] 🔒 Closing summary modal and cleaning up session');
    this.showSpeakingSummary = false;

    // ✅ FIX: Cleanup session để tránh cache khi quay lại
    this.cleanupSpeakingSession();
  }

  onRetrySpeakingTest(): void {
    console.log('[SpeakingComponent] Retry speaking test');
    this.cleanupSpeakingSession(); // ✅ Cleanup trước khi reset
    this.resetQuiz();
  }

  onTryOtherSpeakingTest(): void {
    console.log('[SpeakingComponent] Try other speaking test');
    this.cleanupSpeakingSession(); // ✅ Cleanup trước khi navigate
    this.goToExams();
  }

  goToExams(): void {
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

    // Reset speaking state management
    this.speakingStateService.resetAllStates();
    this.scoringQueue = [];
    this.isProcessingQueue = false;
  }

  onSpeakingAnswered(isCorrect: boolean): void {
    console.log('Speaking answer submitted:', isCorrect);
    this.speakingAnswered.emit(isCorrect);
  }

  // ============= EXIT HANDLING (NEW) =============

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
        next: () => console.log('Speaking progress saved'),
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
        console.log('Speaking progress saved successfully');

        // ✅ FIX Bug #10: Clean up toàn bộ state
        this.cleanupSpeakingSession();

        this.router.navigate(['homepage/user-dashboard/exams']);
      },
      error: (error) => {
        console.error('Error saving speaking progress:', error);

        // ✅ FIX Bug #10: Clean up ngay cả khi API fail
        this.cleanupSpeakingSession();

        this.router.navigate(['homepage/user-dashboard/exams']);
      },
    });
  }

  // ✅ FIX Bug #10: Centralized cleanup method
  private cleanupSpeakingSession(): void {
    console.log('[Speaking] 🧹 Cleaning up session...');

    // 1. Remove localStorage
    localStorage.removeItem('currentExamAttempt');

    // 2. Clear service state (includes audio blobs, results, etc.)
    this.speakingStateService.resetAllStates();

    // 3. Clear component-level caches
    this.speakingResults.clear();
    this.speakingQuestionResults = [];

    console.log('[Speaking] ✅ Cleanup completed');
  }
}
