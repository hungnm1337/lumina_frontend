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
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { QuestionState } from '../../../../Services/Exam/Speaking/speaking-question-state.service';
import { BaseQuestionService } from '../../../../Services/Question/base-question.service';
import { SpeakingQuestionStateService } from '../../../../Services/Exam/Speaking/speaking-question-state.service';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service'; // ✅ THÊM

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
  ],
  templateUrl: './speaking.component.html',
  styleUrl: './speaking.component.scss',
})
export class SpeakingComponent implements OnChanges, OnDestroy, OnInit {
  @Input() questions: QuestionDTO[] = [];
  @Input() partInfo: ExamPartDTO | null = null;
  @Output() speakingAnswered = new EventEmitter<boolean>();

  // Speaking-specific state
  showExplain = false;
  latestPictureCaption: string = '';
  speakingResults: Map<number, SpeakingScoringResult> = new Map();
  showSpeakingSummary = false;
  speakingQuestionResults: QuestionResult[] = [];
  isSpeakingSubmitting = false;
  private advanceTimer: any = null;
  attemptId: number = 0; // ✅ SỬA: Đổi từ number | null thành number, mặc định = 0

  // Speaking navigation and state management
  private stateSubscription: Subscription = new Subscription();
  scoringQueue: number[] = [];
  isProcessingQueue = false;
  resetCounter = 0; // Force trigger resetAt changes

  constructor(
    private router: Router,
    private baseQuestionService: BaseQuestionService,
    private speakingStateService: SpeakingQuestionStateService,
    private examAttemptService: ExamAttemptService
  ) {
    // Subscribe to state changes
    this.stateSubscription = this.speakingStateService
      .getStates()
      .subscribe((states) => {
        this.updateSpeakingResults(states);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions']) {
      console.log('SpeakingComponent - Questions changed:', this.questions);
      console.log(
        'SpeakingComponent - Questions length:',
        this.questions?.length || 0
      );

      // Initialize speaking question states
      if (this.hasSpeakingQuestions()) {
        this.questions.forEach((q) => {
          if (q.questionType && this.isSpeakingQuestion(q.questionType)) {
            this.speakingStateService.initializeQuestion(q.questionId);
          }
        });
      }

      // Initialize base service
      this.baseQuestionService.initializeQuestions(this.questions);
    }
  }

  ngOnInit(): void {
    this.loadAttemptId();
  }

  ngOnDestroy(): void {
    this.stateSubscription.unsubscribe();
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
    }
    this.saveProgressOnExit();
  }

  // ============= ATTEMPT MANAGEMENT (NEW) =============

  private loadAttemptId(): void {
    try {
      const stored = localStorage.getItem('currentExamAttempt');
      console.log('[Speaking] localStorage currentExamAttempt:', stored);

      if (stored) {
        const parsed = JSON.parse(stored);
        this.attemptId = parsed.attemptID || parsed.attemptId;
        console.log(
          '[Speaking] ✅ Loaded attemptId:',
          this.attemptId,
          'from:',
          parsed
        );
      }

      if (!this.attemptId) {
        console.error('[Speaking] ❌ No attemptId found for Speaking');
      } else {
        console.log(
          '[Speaking] 🎯 Will use attemptId:',
          this.attemptId,
          'for all speaking answers'
        );
      }
    } catch (error) {
      console.error('[Speaking] ❌ Error loading attemptId:', error);
    }
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
  onSpeakingResult(result: SpeakingScoringResult): void {
    const q = this.questions[this.currentIndex];
    if (
      q &&
      result.overallScore !== null &&
      result.overallScore !== undefined
    ) {
      // Lưu kết quả cho câu hỏi (map theo questionId, không đẩy trùng vào mảng)
      this.speakingResults.set(q.questionId, result);

      // Cập nhật mảng summary không bị trùng: thay thế nếu đã tồn tại
      const existingIndex = this.speakingQuestionResults.findIndex(
        (x) => x.questionNumber === this.currentIndex + 1
      );
      const item = {
        questionNumber: this.currentIndex + 1,
        questionText: q.stemText,
        result: result,
      };
      if (existingIndex >= 0) {
        this.speakingQuestionResults[existingIndex] = item;
      } else {
        this.speakingQuestionResults.push(item);
      }

      // Tính điểm dựa trên overallScore (0-100) chuyển sang scoreWeight
      // Giả sử scoreWeight tối đa là 10, scale theo tỷ lệ
      const scoreRatio = result.overallScore / 100;
      const earnedScore = (q.scoreWeight ?? 0) * scoreRatio;
      this.baseQuestionService.addScore(earnedScore);

      // Coi là đúng nếu điểm >= 60
      if (result.overallScore >= 60) {
        this.baseQuestionService.incrementCorrectCount();
      }
    }
  }

  onSpeakingSubmitting(isSubmitting: boolean): void {
    this.isSpeakingSubmitting = isSubmitting;
    console.log('[SpeakingComponent] Speaking submitting:', isSubmitting);

    // For speaking: don't auto-advance after submission
    // User will manually navigate using Previous/Next buttons
    if (!isSubmitting) {
      console.log(
        '[SpeakingComponent] Speaking submission completed - staying on current question'
      );
    }
  }

  onTimeout(): void {
    const currentQuestion = this.questions[this.currentIndex];

    // For speaking questions: only show warning, don't trigger any action
    if (
      currentQuestion &&
      currentQuestion.questionType &&
      this.isSpeakingQuestion(currentQuestion.questionType)
    ) {
      console.log(
        '[SpeakingComponent] Timer timeout for speaking question - no action taken'
      );
      return;
    }
  }

  onPictureCaption(caption: string): void {
    this.latestPictureCaption = caption || '';
  }

  // Speaking question type detection
  private hasSpeakingQuestions(): boolean {
    return this.questions.some(
      (q) => q.questionType && this.isSpeakingQuestion(q.questionType)
    );
  }

  isSpeakingQuestion(questionType: string): boolean {
    const speakingTypes = [
      'READ_ALOUD',
      'DESCRIBE_PICTURE',
      'RESPOND_QUESTIONS',
      'RESPOND_WITH_INFO',
      'EXPRESS_OPINION',
      'SPEAKING',
    ];
    return speakingTypes.includes(questionType);
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
    const targetQuestion = this.questions[index];

    // For speaking questions: handle state preservation
    if (
      currentQuestion &&
      currentQuestion.questionType &&
      this.isSpeakingQuestion(currentQuestion.questionType)
    ) {
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
    // Update speakingQuestionResults when states change
    this.speakingQuestionResults = [];
    states.forEach((state, questionId) => {
      if (state.result) {
        const question = this.questions.find(
          (q) => q.questionId === questionId
        );
        if (question) {
          this.speakingQuestionResults.push({
            questionNumber: this.questions.indexOf(question) + 1,
            questionText: question.stemText,
            result: state.result,
          });
        }
      }
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
  finishSpeakingExam(): void {
    if (!this.hasSpeakingQuestions()) {
      return;
    }

    // Check if all questions are completed
    const allCompleted = this.speakingStateService.areAllQuestionsCompleted();

    if (!allCompleted) {
      // Show warning about incomplete questions
      const incompleteQuestions = this.questions.filter((q) => {
        if (!q.questionType || !this.isSpeakingQuestion(q.questionType))
          return false;
        const state = this.speakingStateService.getQuestionState(q.questionId);
        return state?.state !== 'scored' && state?.state !== 'submitted';
      });

      if (incompleteQuestions.length > 0) {
        alert(
          `Bạn còn ${incompleteQuestions.length} câu chưa hoàn thành. Vui lòng hoàn thành tất cả câu hỏi trước khi nộp bài.`
        );
        return;
      }
    }

    if (!this.attemptId) {
      console.error('No attemptId found for speaking exam');
      this.showSpeakingSummary = true;
      this.baseQuestionService.finishQuiz();
      return;
    }
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

        // Clean up
        localStorage.removeItem('currentExamAttempt');
      },
      error: (error) => {
        console.error('Error finalizing speaking exam:', error);
        // Still show summary even if API fails
        this.showSpeakingSummary = true;
        this.baseQuestionService.finishQuiz();
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
    this.showSpeakingSummary = false;
  }

  onRetrySpeakingTest(): void {
    console.log('[SpeakingComponent] Retry speaking test');
    this.resetQuiz();
  }

  onTryOtherSpeakingTest(): void {
    console.log('[SpeakingComponent] Try other speaking test');
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
        localStorage.removeItem('currentExamAttempt');
        this.router.navigate(['homepage/user-dashboard/exams']);
      },
      error: (error) => {
        console.error('Error saving speaking progress:', error);
        this.router.navigate(['homepage/user-dashboard/exams']);
      },
    });
  }
}
