import {
  Component,
  Input,
  input,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OptionsComponent } from '../options/options.component';
import { PromptComponent } from '../prompt/prompt.component';
import { TimeComponent } from '../time/time.component';
import {
  QuestionDTO,
  OptionDTO,
  SpeakingScoringResult,
} from '../../../Interfaces/exam.interfaces';
import { Router } from '@angular/router';
import { AuthService } from '../../../Services/Auth/auth.service';
import { WritingAnswerBoxComponent } from '../writing-answer-box/writing-answer-box.component';
import { SpeakingAnswerBoxComponent } from '../speaking-answer-box/speaking-answer-box.component';
import { SpeakingSummaryComponent } from '../speaking-summary/speaking-summary.component';
import {
  SpeakingQuestionStateService,
  QuestionState,
} from '../../../Services/Speaking/speaking-question-state.service';
import { Subscription } from 'rxjs';

interface QuestionResult {
  questionNumber: number;
  questionText: string;
  result: SpeakingScoringResult;
}

@Component({
  selector: 'app-question',
  standalone: true,
  imports: [
    CommonModule,
    OptionsComponent,
    PromptComponent,
    TimeComponent,
    WritingAnswerBoxComponent,
    SpeakingAnswerBoxComponent,
    SpeakingSummaryComponent,
  ],
  templateUrl: './question.component.html',
})
export class QuestionComponent implements OnChanges, OnDestroy {
  @Input() questions: QuestionDTO[] = [];
  currentIndex = 0;
  showExplain = false;
  totalScore = 0;
  correctCount = 0;
  finished = false;
  savedAnswers: { questionId: number; optionId: number }[] = [];
  latestPictureCaption: string = '';
  speakingResults: Map<number, SpeakingScoringResult> = new Map();
  showSpeakingSummary = false;
  speakingQuestionResults: QuestionResult[] = [];
  isSpeakingSubmitting = false; // New: Track speaking submission status
  private advanceTimer: any = null;

  // New: Speaking navigation and state management
  private stateSubscription: Subscription = new Subscription();
  scoringQueue: number[] = [];
  isProcessingQueue = false;
  resetCounter = 0; // Force trigger resetAt changes

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions']) {
      console.log('QuestionComponent - Questions changed:', this.questions);
      console.log(
        'QuestionComponent - Questions length:',
        this.questions?.length || 0
      );

      // Initialize speaking question states
      if (this.hasSpeakingQuestions()) {
        this.questions.forEach((q) => {
          if (this.isSpeakingQuestion(q.questionType)) {
            this.speakingStateService.initializeQuestion(q.questionId);
          }
        });
      }
    }
  }

  ngOnDestroy(): void {
    this.stateSubscription.unsubscribe();
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
    }
  }

  markAnswered(isCorrect: boolean): void {
    if (isCorrect) {
      const q = this.questions[this.currentIndex];
      this.totalScore += q?.scoreWeight ?? 0;
      this.correctCount += 1;
    }
    this.revealExplainAndQueueNext();
  }

  onSpeakingResult(result: SpeakingScoringResult): void {
    const q = this.questions[this.currentIndex];
    if (
      q &&
      result.overallScore !== null &&
      result.overallScore !== undefined
    ) {
      // Lưu kết quả speaking cho câu hỏi này
      this.speakingResults.set(q.questionId, result);

      // Lưu vào array để hiển thị summary
      this.speakingQuestionResults.push({
        questionNumber: this.currentIndex + 1,
        questionText: q.stemText,
        result: result,
      });

      // Tính điểm dựa trên overallScore (0-100) chuyển sang scoreWeight
      // Giả sử scoreWeight tối đa là 10, scale theo tỷ lệ
      const scoreRatio = result.overallScore / 100;
      const earnedScore = (q.scoreWeight ?? 0) * scoreRatio;
      this.totalScore += earnedScore;

      // Coi là đúng nếu điểm >= 60
      if (result.overallScore >= 60) {
        this.correctCount += 1;
      }

      // Check if all questions are completed
      this.checkSpeakingCompletion();
    }
  }

  onSpeakingSubmitting(isSubmitting: boolean): void {
    this.isSpeakingSubmitting = isSubmitting;
    console.log('[QuestionComponent] Speaking submitting:', isSubmitting);

    // For speaking: don't auto-advance after submission
    // User will manually navigate using Previous/Next buttons
    if (!isSubmitting) {
      console.log(
        '[QuestionComponent] Speaking submission completed - staying on current question'
      );

      // Note: State is managed entirely by the speaking-answer-box component
      // No need to call markAsSubmitted() here as it's handled in submitRecording()
    }
  }

  onTimeout(): void {
    const currentQuestion = this.questions[this.currentIndex];

    // For speaking questions: only show warning, don't trigger any action
    if (
      currentQuestion &&
      this.isSpeakingQuestion(currentQuestion.questionType)
    ) {
      console.log(
        '[QuestionComponent] Timer timeout for speaking question - no action taken'
      );
      return;
    }

    // For non-speaking questions: show explanation as before
    this.showExplain = true;
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
    }
  }

  private revealExplainAndQueueNext(): void {
    if (this.showExplain) return;
    this.showExplain = true;
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
    }
    this.advanceTimer = setTimeout(() => {
      this.nextQuestion();
    }, 300000);
  }

  private nextQuestion(): void {
    // BLOCK navigation nếu đang submit speaking answer
    if (this.isSpeakingSubmitting) {
      console.log(
        '[QuestionComponent] Blocking next question - speaking answer is being submitted'
      );
      console.log(
        '[QuestionComponent] Will auto-proceed when submission completes'
      );
      // Không next, đợi submit xong sẽ tự động next trong onSpeakingSubmitting()
      return;
    }

    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex += 1;
      this.showExplain = false;
      this.latestPictureCaption = '';
    } else {
      // Bài thi kết thúc
      this.showExplain = true;
      this.loadSavedAnswers();

      // SPEAKING TEST: Luôn hiển thị summary, KHÔNG hiển thị màn "Hoàn thành"
      if (this.hasSpeakingQuestions()) {
        console.log(
          '[QuestionComponent] Speaking test detected, showing summary only'
        );
        this.showSpeakingSummary = true;
        this.finished = false; // KHÔNG set finished = true cho Speaking test
      } else {
        // Non-speaking test → hiển thị màn "Hoàn thành" bình thường
        this.finished = true;
      }
    }
  }

  // New method: Check if test has speaking questions
  private hasSpeakingQuestions(): boolean {
    return this.questions.some((q) => this.isSpeakingQuestion(q.questionType));
  }

  // New method: Check if a question type is a speaking question
  isSpeakingQuestion(questionType: string): boolean {
    const speakingTypes = [
      'READ_ALOUD',
      'DESCRIBE_PICTURE',
      'RESPOND_QUESTIONS',
      'RESPOND_WITH_INFO',
      'EXPRESS_OPINION',
    ];
    return speakingTypes.includes(questionType);
  }

  // New method: Check if all speaking questions are completed
  private checkSpeakingCompletion(): void {
    if (!this.hasSpeakingQuestions()) {
      return;
    }

    const allCompleted = this.speakingStateService.areAllQuestionsCompleted();
    console.log(
      '[QuestionComponent] All speaking questions completed:',
      allCompleted
    );

    if (allCompleted) {
      this.showSpeakingSummary = true;
      this.finished = false; // Don't show completion screen for speaking tests
    }
  }

  next(): void {
    if (this.finished) return;
    if (this.currentIndex >= this.questions.length - 1) {
      this.finished = true;
      this.showExplain = true;
      this.loadSavedAnswers();
      return;
    }
    this.nextQuestion();
  }

  // New: Navigation methods for speaking questions
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
      this.isSpeakingQuestion(currentQuestion.questionType)
    ) {
      this.handleSpeakingNavigation(currentQuestion.questionId);
    }

    this.currentIndex = index;
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
    // Note: If user was recording, the recording will be auto-stopped and saved as draft
    // when the speaking-answer-box component receives the resetAt change
  }

  private restoreSpeakingState(questionId: number): void {
    // State will be restored by the SpeakingAnswerBoxComponent
    // when it receives the new resetAt value
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

    // Check if all questions are completed
    if (
      this.hasSpeakingQuestions() &&
      this.speakingStateService.areAllQuestionsCompleted()
    ) {
      this.showSpeakingSummary = true;
    }
  }

  private async scoreQuestion(questionId: number): Promise<void> {
    try {
      // The actual scoring is handled by the backend when the user submits
      // This method just updates the UI state
      console.log(
        `[QuestionComponent] Processing score for question ${questionId}`
      );

      // Wait a bit to simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // The actual result will come through onSpeakingResult()
      // This is just for UI feedback
    } catch (error) {
      console.error(
        `[QuestionComponent] Error processing score for question ${questionId}:`,
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
  constructor(
    private router: Router,
    private authService: AuthService,
    private speakingStateService: SpeakingQuestionStateService
  ) {
    console.log('Questions:', this.questions);

    // Subscribe to state changes
    this.stateSubscription = this.speakingStateService
      .getStates()
      .subscribe((states) => {
        this.updateSpeakingResults(states);
      });
  }

  onPictureCaption(caption: string): void {
    this.latestPictureCaption = caption || '';
  }

  get percentCorrect(): number {
    const total = this.questions?.length ?? 0;
    if (total === 0) return 0;
    return Math.round((this.correctCount / total) * 100);
  }

  get feedbackText(): string {
    const p = this.percentCorrect;
    if (p < 30) return 'Bạn cần cố gắng nhiều hơn';
    if (p < 60) return 'Lần sau bạn chắc chắn sẽ làm tốt hơn';
    return 'Bạn hãy tiếp tục phát huy nhé';
  }

  resetQuiz(): void {
    this.currentIndex = 0;
    this.showExplain = false;
    this.totalScore = 0;
    this.correctCount = 0;
    this.finished = false;
    this.latestPictureCaption = '';
    this.speakingResults.clear();
    this.speakingQuestionResults = [];
    this.showSpeakingSummary = false;
    this.isSpeakingSubmitting = false; // Reset speaking submission flag

    // Reset speaking state management
    this.speakingStateService.resetAllStates();
    this.scoringQueue = [];
    this.isProcessingQueue = false;
  }

  closeSpeakingSummary(): void {
    this.showSpeakingSummary = false;
    // SPEAKING TEST: KHÔNG hiển thị màn "Hoàn thành", chỉ đóng summary
    if (!this.hasSpeakingQuestions()) {
      this.finished = true;
    }
  }

  onRetrySpeakingTest(): void {
    console.log('[QuestionComponent] Retry speaking test');
    this.resetQuiz();
  }

  onTryOtherSpeakingTest(): void {
    console.log('[QuestionComponent] Try other speaking test');
    this.goToExams();
  }

  goToExams() {
    this.router.navigate(['homepage/user-dashboard/exams']);
  }

  private getStorageKey(): string | null {
    const userId = this.authService.getCurrentUser()?.id;
    if (userId === undefined || userId === null) return null;
    return `Answer_Reading_${userId}`;
  }

  private loadSavedAnswers(): void {
    try {
      const key = this.getStorageKey() || 'Answer_Reading_undefined';
      if (!key) {
        this.savedAnswers = [];
        return;
      }
      const raw = localStorage.getItem(key);
      if (!raw) {
        this.savedAnswers = [];
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.savedAnswers = parsed
          .map((x: any) => ({
            questionId: Number(x?.questionId),
            optionId: Number(x?.optionId),
          }))
          .filter(
            (x: any) =>
              Number.isFinite(x.questionId) && Number.isFinite(x.optionId)
          );
      } else {
        this.savedAnswers = [];
      }
    } catch {
      this.savedAnswers = [];
    }
  }

  clearSavedAnswers(): void {
    try {
      const key = this.getStorageKey() || 'Answer_Reading_undefined';
      if (!key) return;
      localStorage.removeItem(key);
      this.savedAnswers = [];
    } catch {
      // ignore
    }
  }

  isAnswerOptionCorrect(questionId: number, optionId: number): boolean | null {
    const q = this.questions.find((x) => x.questionId === questionId);
    if (!q) return null;
    const opt = q.options?.find((o) => o.optionId === optionId);
    if (!opt || typeof opt.isCorrect !== 'boolean') return null;
    return opt.isCorrect === true;
  }

  // New: Helper methods for UI
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

  // New: Finish speaking exam
  finishSpeakingExam(): void {
    if (!this.hasSpeakingQuestions()) {
      return;
    }

    // Check if all questions are completed
    const allCompleted = this.speakingStateService.areAllQuestionsCompleted();

    if (allCompleted) {
      this.showSpeakingSummary = true;
      this.finished = false;
    } else {
      // Show warning about incomplete questions
      const incompleteQuestions = this.questions.filter((q) => {
        if (!this.isSpeakingQuestion(q.questionType)) return false;
        const state = this.speakingStateService.getQuestionState(q.questionId);
        return state?.state !== 'scored' && state?.state !== 'submitted';
      });

      if (incompleteQuestions.length > 0) {
        alert(
          `Bạn còn ${incompleteQuestions.length} câu chưa hoàn thành. Vui lòng hoàn thành tất cả câu hỏi trước khi nộp bài.`
        );
      } else {
        this.showSpeakingSummary = true;
        this.finished = false;
      }
    }
  }
}
