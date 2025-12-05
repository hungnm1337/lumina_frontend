import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ViewContainerRef,
  ComponentRef,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MockTestService } from '../../../../Services/MockTest/mocktest.service';
import { AuthService } from '../../../../Services/Auth/auth.service';
import {
  MockTestPart,
  PartAnswer,
} from '../../../../Interfaces/mocktest.interface';
import { MocktestProgressComponent } from '../mocktest-progress/mocktest-progress.component';
import { SpeakingComponent } from '../../../User/question/speaking/speaking.component';
import { WritingComponent } from '../../../User/question/writing/writing.component';
import { ToastService } from '../../../../Services/Toast/toast.service';
import {
  ExamPartDTO,
  QuestionDTO,
} from '../../../../Interfaces/exam.interfaces';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';
import { ExamAttemptRequestDTO } from '../../../../Interfaces/ExamAttempt/ExamAttemptRequestDTO.interface';
import { TimeComponent } from '../../time/time.component';
import {
  QuestionNavigatorComponent,
  NavigatorLegendItem,
} from '../../question-navigator/question-navigator.component';
import { PromptComponent } from '../../prompt/prompt.component';
import { OptionsComponent } from '../../options/options.component';

@Component({
  selector: 'app-mock-exam',
  standalone: true,
  imports: [
    CommonModule,
    SpeakingComponent,
    WritingComponent,
    TimeComponent,
    QuestionNavigatorComponent,
    PromptComponent,
    OptionsComponent,
  ],
  templateUrl: './exam.component.html',
  styleUrls: ['./exam.component.scss'],
})
export class ExamComponent implements OnInit, OnDestroy {
  constructor(
    private mockTestService: MockTestService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private examAttemptService: ExamAttemptService
  ) {}

  exampartDetailsAndQustions: ExamPartDTO[] = [];
  currentPartIndex: number = 0;
  currentQuestionIndex: number = 0;
  selectedAnswers: { [questionId: number]: number } = {}; // questionId -> optionId (for Listening/Reading)
  showPartCompletionMessage: boolean = false;

  // Speaking tracking in MockTest
  speakingCompletedQuestions: { [partId: number]: number } = {}; // partId -> number of completed questions
  showSpeakingNextPartButton: boolean = false; // Hiển thị nút chuyển part cho Speaking

  // Attempt management
  attemptId: number | null = null;
  examId: number | null = null;
  isSubmitting: boolean = false;
  totalScore: number = 0;

  // Timer management - Part-based timer
  currentPartTime: number = 0; // Total time for current part
  timerResetTrigger: number = 0;
  hasShownWarning: boolean = false; // Track if 30s warning shown

  // Audio player for Listening
  @ViewChild('audioPlayer', { static: false })
  audioPlayer?: ElementRef<HTMLAudioElement>;
  audioPlayCounts = new Map<number, number>();
  maxPlays = 1;
  isAudioPlaying = false;
  audioCurrentTime = 0;
  audioDuration = 0;
  audioProgress = 0;

  // Navigator configuration
  navigatorLegendItems: NavigatorLegendItem[] = [
    { color: 'bg-gray-200', label: 'Chưa làm' },
    { color: 'bg-green-500', label: 'Đã làm' },
    { color: 'bg-blue-600', label: 'Đang làm' },
  ];

  getQuestionStatus = (questionId: number, index: number): string => {
    if (index === this.currentQuestionIndex) return 'current';
    if (this.isQuestionAnswered(questionId)) return 'answered';
    return 'unanswered';
  };

  get audioPlayCount(): number {
    const currentQuestionId = this.currentQuestion?.questionId;
    if (!currentQuestionId) return 0;
    return this.audioPlayCounts.get(currentQuestionId) || 0;
  }

  get currentPart(): ExamPartDTO | null {
    return this.exampartDetailsAndQustions[this.currentPartIndex] || null;
  }

  get currentQuestion() {
    return this.currentPart?.questions[this.currentQuestionIndex] || null;
  }

  // Skill type detection
  get currentSkillType():
    | 'listening'
    | 'reading'
    | 'speaking'
    | 'writing'
    | 'unknown' {
    if (!this.currentPart?.partCode) return 'unknown';
    const partCode = this.currentPart.partCode.toUpperCase();

    if (partCode.includes('LISTENING')) return 'listening';
    if (partCode.includes('READING')) return 'reading';
    if (partCode.includes('SPEAKING')) return 'speaking';
    if (partCode.includes('WRITING') || partCode.includes('WRITTING'))
      return 'writing';

    return 'unknown';
  }

  get isMultipleChoicePart(): boolean {
    return (
      this.currentSkillType === 'listening' ||
      this.currentSkillType === 'reading'
    );
  }

  get isSpeakingPart(): boolean {
    return this.currentSkillType === 'speaking';
  }

  get isWritingPart(): boolean {
    return this.currentSkillType === 'writing';
  }

  // Helper method to get skill type from part
  private getSkillType(
    part: ExamPartDTO
  ): 'listening' | 'reading' | 'speaking' | 'writing' | 'unknown' {
    if (!part?.partCode) return 'unknown';
    const partCode = part.partCode.toUpperCase();

    if (partCode.includes('LISTENING')) return 'listening';
    if (partCode.includes('READING')) return 'reading';
    if (partCode.includes('SPEAKING')) return 'speaking';
    if (partCode.includes('WRITING') || partCode.includes('WRITTING'))
      return 'writing';

    return 'unknown';
  }

  // Sort parts by skill type order and partId
  private sortPartsBySkillAndId(parts: ExamPartDTO[]): ExamPartDTO[] {
    // Define skill order priority
    const skillOrder = {
      listening: 1,
      reading: 2,
      speaking: 3,
      writing: 4,
      unknown: 5,
    };

    // Sort by skill type first, then by partId
    return parts.sort((a, b) => {
      const skillA = this.getSkillType(a);
      const skillB = this.getSkillType(b);

      // Compare skill type priority
      const skillDiff = skillOrder[skillA] - skillOrder[skillB];
      if (skillDiff !== 0) return skillDiff;

      // If same skill type, sort by partId
      return (a.partId || 0) - (b.partId || 0);
    });
  }

  ngOnInit(): void {
    // Get examId from route params
    this.route.params.subscribe((params) => {
      this.examId = +params['examId'] || null;
      console.log('📋 ExamId from route:', this.examId);

      // Create attempt after getting examId
      if (this.examId) {
        this.createExamAttempt();
      }
    });

    this.loadMocktestQuestions();
  }

  ngOnDestroy(): void {
    this.saveProgressOnExit();
  }

  // ============ AUDIO PLAYER METHODS ============
  getCurrentAudioUrl(): string {
    return this.currentQuestion?.prompt?.referenceAudioUrl || '';
  }

  onAudioPlay(): void {
    this.isAudioPlaying = true;
  }

  onAudioEnded(): void {
    this.isAudioPlaying = false;
    this.audioProgress = 100;
  }

  onTimeUpdate(): void {
    if (this.audioPlayer?.nativeElement) {
      const audio = this.audioPlayer.nativeElement;
      this.audioCurrentTime = audio.currentTime;
      this.audioDuration = audio.duration || 0;
      if (this.audioDuration > 0) {
        this.audioProgress = (this.audioCurrentTime / this.audioDuration) * 100;
      }
    }
  }

  onLoadedMetadata(): void {
    if (this.audioPlayer?.nativeElement) {
      this.audioDuration = this.audioPlayer.nativeElement.duration;
    }
  }

  formatAudioTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private resetAudioState(): void {
    this.isAudioPlaying = false;
    this.audioCurrentTime = 0;
    this.audioDuration = 0;
    this.audioProgress = 0;

    if (this.audioPlayer?.nativeElement) {
      const audio = this.audioPlayer.nativeElement;
      audio.pause();
      audio.currentTime = 0;
      audio.load();
    }
  }

  private autoPlayAudio(): void {
    if (!this.currentSkillType || this.currentSkillType !== 'listening') return;

    const currentQuestionId = this.currentQuestion?.questionId;
    if (!currentQuestionId) return;

    const currentCount = this.audioPlayCounts.get(currentQuestionId) || 0;

    if (currentCount === 0) {
      setTimeout(() => {
        this.playAudio();
      }, 300);
    }
  }

  playAudio(): void {
    if (!this.audioPlayer) return;

    const audio = this.audioPlayer.nativeElement;
    const currentQuestionId = this.currentQuestion?.questionId;
    if (!currentQuestionId) return;

    const currentCount = this.audioPlayCounts.get(currentQuestionId) || 0;

    if (!audio.paused && this.isAudioPlaying) {
      audio.pause();
      this.isAudioPlaying = false;
      return;
    }

    if (
      audio.paused &&
      audio.currentTime > 0 &&
      audio.currentTime < audio.duration
    ) {
      audio
        .play()
        .then(() => {
          this.isAudioPlaying = true;
        })
        .catch((error) => {
          console.error('Cannot resume audio:', error);
        });
      return;
    }

    if (currentCount >= this.maxPlays) {
      this.toastService.warning(
        `Bạn chỉ được nghe tối đa ${this.maxPlays} lần!`
      );
      return;
    }

    audio.currentTime = 0;
    this.audioPlayCounts.set(currentQuestionId, currentCount + 1);
    this.isAudioPlaying = true;

    audio
      .play()
      .then(() => {})
      .catch((error) => {
        this.audioPlayCounts.set(currentQuestionId, currentCount);
        this.isAudioPlaying = false;
        console.error('Cannot play audio:', error);
      });
  }

  // ============ NAVIGATOR HELPER METHODS ============
  getSelectedOptionId(questionId: number): number | null {
    return this.selectedAnswers[questionId] ?? null;
  }

  navigateToQuestion(index: number): void {
    if (index >= 0 && index < (this.currentPart?.questions.length || 0)) {
      this.currentQuestionIndex = index;
      this.showPartCompletionMessage = false;
      // Don't reset timer when navigating within same part
      this.resetAudioState();
      if (this.currentSkillType === 'listening') {
        this.autoPlayAudio();
      }
    }
  }

  onOptionAnswered(optionId: number): void {
    this.selectAnswer(optionId);
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.attemptId && !this.isSubmitting) {
      $event.returnValue =
        'Bạn có chắc muốn thoát? Tiến trình sẽ được lưu lại.';
    }
  }

  private createExamAttempt(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.toastService.error('Please login to start exam');
      this.router.navigate(['/auth/login']);
      return;
    }

    // Clear any existing attempt - always create new for mock test
    localStorage.removeItem('currentExamAttempt');
    console.log('🗑️ Cleared old exam attempt - creating new mock test attempt');

    // Create new attempt
    if (!this.examId) {
      console.error('No examId available for creating attempt');
      return;
    }

    const attemptRequest: ExamAttemptRequestDTO = {
      attemptID: 0,
      userID: Number(user.id),
      examID: this.examId,
      examPartId: null, // Mock test covers all parts
      startTime: new Date().toISOString(),
      endTime: null,
      score: null,
      status: 'Doing',
    };

    this.examAttemptService.startExam(attemptRequest).subscribe({
      next: (response) => {
        this.attemptId = response.attemptID;
        // Save to localStorage
        localStorage.setItem('currentExamAttempt', JSON.stringify(response));
        console.log(
          '✅ Created new mock test attemptId and saved to localStorage:',
          this.attemptId
        );
      },
      error: (error) => {
        console.error('❌ Failed to create exam attempt:', error);
        this.toastService.error('Failed to start exam. Please try again.');
      },
    });
  }

  loadMocktestQuestions() {
    this.mockTestService.getMocktestQuestions().subscribe({
      next: (data: ExamPartDTO[]) => {
        // Sort parts by skill type and partId
        this.exampartDetailsAndQustions = this.sortPartsBySkillAndId(data);
        console.log(
          'Mocktest questions loaded and sorted:',
          this.exampartDetailsAndQustions
        );

        // Set examId from first part if not set from route
        if (!this.examId && data.length > 0) {
          this.examId = data[0].examId;
          console.log('📋 ExamId from mocktest data:', this.examId);

          // Create attempt after getting examId from data
          this.createExamAttempt();
        }

        // Initialize at first part and first question
        this.currentPartIndex = 0;
        this.currentQuestionIndex = 0;
        this.initializePartTimer();
      },
      error: (error) => {
        console.error('Error loading mocktest questions:', error);
        this.toastService.error(
          'Failed to load mocktest questions. Please try again later.'
        );
      },
    });
  }

  getTotalQuestions(): number {
    return this.exampartDetailsAndQustions.reduce(
      (total, part) => total + part.questions.length,
      0
    );
  }

  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D, etc.
  }

  selectAnswer(optionId: number) {
    if (this.currentQuestion) {
      this.selectedAnswers[this.currentQuestion.questionId] = optionId;
      console.log('Answer selected:', {
        questionId: this.currentQuestion.questionId,
        optionId,
      });

      // Auto-submit answer to backend for Listening/Reading
      if (this.attemptId && this.isMultipleChoicePart) {
        this.submitAnswerToBackend(this.currentQuestion.questionId, optionId);
      }
    }
  }

  updatePartCodeStorage() {
    if (this.currentPart && this.currentPart.partCode) {
      localStorage.setItem(
        'PartCodeStorage',
        this.currentPart.partCode[this.currentPart.partCode.length - 1]
      );
    }
  }

  private submitAnswerToBackend(
    questionId: number,
    selectedOptionId: number
  ): void {
    if (!this.attemptId) return;

    const model = {
      examAttemptId: this.attemptId,
      questionId: questionId,
      selectedOptionId: selectedOptionId,
    };

    const submitService =
      this.currentSkillType === 'listening'
        ? this.examAttemptService.submitListeningAnswer(model)
        : this.examAttemptService.submitReadingAnswerNew(model);

    submitService.subscribe({
      next: (response) => {
        console.log('✅ Answer submitted:', response);
        if (response.isCorrect) {
          this.totalScore += response.score;
        }
      },
      error: (error) => {
        console.error('❌ Failed to submit answer:', error);
      },
    });
  }

  isQuestionAnswered(questionId: number): boolean {
    // For Listening/Reading: check selectedAnswers
    if (this.isMultipleChoicePart) {
      return this.selectedAnswers[questionId] !== undefined;
    }

    // For Speaking/Writing: always show as not answered in pills
    // (they don't use the pills navigation)
    return false;
  }

  // Check if current part has all questions answered (for MC only)
  isCurrentPartComplete(): boolean {
    if (!this.isMultipleChoicePart) return true; // Speaking/Writing always passable

    const currentQuestions = this.currentPart?.questions || [];
    return currentQuestions.every((q) => this.isQuestionAnswered(q.questionId));
  }

  // Get count of unanswered questions in current part (for MC only)
  getUnansweredCount(): number {
    if (!this.isMultipleChoicePart) return 0;

    const currentQuestions = this.currentPart?.questions || [];
    return currentQuestions.filter(
      (q) => !this.isQuestionAnswered(q.questionId)
    ).length;
  }

  // Get count of answered questions in current part
  getAnsweredCountInPart(): number {
    if (!this.currentPart) return 0;
    return this.currentPart.questions.filter((q) =>
      this.isQuestionAnswered(q.questionId)
    ).length;
  }

  // Get total questions in current part
  getTotalQuestionsInPart(): number {
    return this.currentPart?.questions.length || 0;
  }

  goToQuestion(questionIndex: number) {
    this.currentQuestionIndex = questionIndex;
    this.showPartCompletionMessage = false;
    // Don't reset timer when navigating within same part
    this.resetAudioState();
    if (this.currentSkillType === 'listening') {
      this.autoPlayAudio();
    }
  }

  // Calculate total time for current part (sum of all question times)
  private calculatePartTotalTime(): number {
    if (!this.currentPart || !this.isMultipleChoicePart) return 0;

    return this.currentPart.questions.reduce((total, question) => {
      return total + (question.time || 0);
    }, 0);
  }

  // Initialize timer when starting a new part
  private initializePartTimer(): void {
    if (this.isMultipleChoicePart) {
      this.currentPartTime = this.calculatePartTotalTime();
      this.timerResetTrigger = Date.now(); // Force timer reset
      this.hasShownWarning = false; // Reset warning flag
      console.log(
        `🕐 Part ${this.currentPartIndex + 1} timer initialized: ${
          this.currentPartTime
        }s`
      );
    }
  }

  // Handle timer events from time component
  onPartTimerTick(remainingTime: number): void {
    // Show warning at 30 seconds
    if (
      remainingTime <= 30 &&
      !this.hasShownWarning &&
      this.isMultipleChoicePart
    ) {
      this.hasShownWarning = true;
      this.toastService.warning('⚠️ Còn 30 giây để hoàn thành part này!');
    }
  }

  onPartTimeout(): void {
    if (!this.isMultipleChoicePart) return;

    this.toastService.warning(
      '⏰ Hết thời gian! Tự động chuyển sang part tiếp theo'
    );

    // Auto-move to next part or finish exam
    setTimeout(() => {
      if (this.isLastQuestionInExam()) {
        this.finishExam();
      } else {
        this.showPartCompletionMessage = true;
      }
    }, 1500);
  }

  nextQuestion() {
    if (!this.currentPart || !this.currentQuestion) return;

    // For Speaking/Writing parts, don't validate answer selection (handled by their own components)
    if (this.isMultipleChoicePart) {
      // Check if answer is selected for current question
      if (!this.selectedAnswers[this.currentQuestion.questionId]) {
        this.toastService.warning('Vui lòng chọn đáp án trước khi tiếp tục');
        return;
      }
    }

    // Check if this is the last question in the part
    if (this.isLastQuestionInPart()) {
      // For MC parts, validate all questions are answered before proceeding
      if (this.isMultipleChoicePart && !this.isCurrentPartComplete()) {
        const unanswered = this.getUnansweredCount();
        this.toastService.warning(
          `Vui lòng hoàn thành ${unanswered} câu còn lại trước khi chuyển part`
        );
        return;
      }

      if (this.isLastQuestionInExam()) {
        // Finish exam
        this.finishExam();
      } else {
        // Show part completion message (Option B)
        this.showPartCompletionMessage = true;
      }
    } else {
      // Move to next question in current part
      this.currentQuestionIndex++;
      // Don't reset timer when moving to next question in same part
      this.resetAudioState();
      if (this.currentSkillType === 'listening') {
        this.autoPlayAudio();
      }
    }
  }

  // Speaking/Writing event handlers
  onSpeakingAnswered(isCorrect: boolean): void {
    console.log('[ExamComponent] Speaking answer submitted:', isCorrect);
    // Speaking component handles its own scoring and navigation
  }

  onSpeakingPartCompleted(): void {
    console.log('[ExamComponent] onSpeakingPartCompleted called:', {
      currentPartIndex: this.currentPartIndex,
      currentPartTitle: this.currentPart?.title,
      currentPartId: this.currentPart?.partId,
      totalParts: this.exampartDetailsAndQustions.length,
      isLastQuestionInExam: this.isLastQuestionInExam(),
      showPartCompletionMessage: this.showPartCompletionMessage,
    });

    // ✅ FIX: Lưu số câu Speaking đã hoàn thành cho part hiện tại
    if (this.currentPart) {
      this.speakingCompletedQuestions[this.currentPart.partId] =
        this.currentPart.questions.length;
      console.log(
        '[ExamComponent] Speaking completed questions updated:',
        this.speakingCompletedQuestions
      );
    }

    // Speaking finished all questions in mock test
    if (this.isLastQuestionInExam()) {
      console.log(
        '[ExamComponent] onSpeakingPartCompleted: Last question in exam, finishing exam'
      );
      this.finishExam();
    } else {
      console.log(
        '[ExamComponent] onSpeakingPartCompleted: Showing next part button for Speaking'
      );
      // ✅ FIX: Hiển thị nút chuyển part thay vì tự động chuyển
      this.showSpeakingNextPartButton = true;
    }
  }

  onWritingPartCompleted(): void {
    console.log('[ExamComponent] Writing part completed in mock test');
    // Writing finished all questions in mock test
    // Auto-advance to next part or finish exam
    if (this.isLastQuestionInExam()) {
      this.finishExam();
    } else {
      this.showPartCompletionMessage = true;
    }
  }

  onWritingFinished(): void {
    console.log('[ExamComponent] Writing part finished');
    // Writing finished all questions
    // Auto-advance to next part or finish exam
    if (this.isLastQuestionInExam()) {
      this.finishExam();
    } else {
      this.showPartCompletionMessage = true;
    }
  }

  // Check if current part needs validation before moving to next
  canProceedToNextPart(): boolean {
    if (this.isMultipleChoicePart) {
      // For Listening/Reading: check all questions answered
      return (
        this.currentPart?.questions.every(
          (q) => this.selectedAnswers[q.questionId] !== undefined
        ) || false
      );
    }

    // For Speaking/Writing: they handle their own completion
    // Always return true since they control their own flow
    return true;
  }

  previousQuestion() {
    // Block going back to previous part
    if (this.currentQuestionIndex === 0 && this.currentPartIndex > 0) {
      this.toastService.warning('Không thể quay lại part trước');
      return;
    }

    if (this.currentQuestionIndex > 0) {
      // Go to previous question in current part
      this.currentQuestionIndex--;
      this.showPartCompletionMessage = false;
      // Don't reset timer when moving to previous question in same part
      this.resetAudioState();
      if (this.currentSkillType === 'listening') {
        this.autoPlayAudio();
      }
    }
  }

  moveToNextPart() {
    if (this.currentPartIndex < this.exampartDetailsAndQustions.length - 1) {
      this.currentPartIndex++;
      this.currentQuestionIndex = 0;
      this.showPartCompletionMessage = false;
      this.showSpeakingNextPartButton = false; // Reset nút chuyển part Speaking
      this.toastService.success(`Starting ${this.currentPart?.title}`);
      this.updatePartCodeStorage();
      // Initialize timer for new part
      this.initializePartTimer();
    }
  }

  isLastQuestionInPart(): boolean {
    if (!this.currentPart) return false;
    return this.currentQuestionIndex === this.currentPart.questions.length - 1;
  }

  isLastQuestionInExam(): boolean {
    return (
      this.isLastQuestionInPart() &&
      this.currentPartIndex === this.exampartDetailsAndQustions.length - 1
    );
  }

  getPartProgress(): number {
    if (!this.currentPart) return 0;
    return (
      ((this.currentQuestionIndex + 1) / this.currentPart.questions.length) *
      100
    );
  }

  getAnsweredCount(): number {
    // Đếm câu trả lời multiple choice (Listening/Reading)
    const multipleChoiceCount = Object.keys(this.selectedAnswers).length;

    // Đếm câu Speaking đã hoàn thành
    const speakingCount = Object.values(this.speakingCompletedQuestions).reduce(
      (sum, count) => sum + count,
      0
    );

    return multipleChoiceCount + speakingCount;
  }

  finishExam() {
    if (!this.attemptId) {
      this.toastService.error('No exam attempt found');
      return;
    }

    const totalQuestions = this.getTotalQuestions();
    const answeredQuestions = this.getAnsweredCount();

    if (answeredQuestions < totalQuestions && this.isMultipleChoicePart) {
      const confirmed = confirm(
        `You have answered ${answeredQuestions} out of ${totalQuestions} questions. Do you want to submit anyway?`
      );
      if (!confirmed) return;
    }

    this.isSubmitting = true;

    // Call endExam API
    const storedAttempt = localStorage.getItem('currentExamAttempt');
    if (!storedAttempt) {
      this.toastService.error('Exam session not found');
      return;
    }

    try {
      const attemptData = JSON.parse(storedAttempt);
      const endExamRequest: ExamAttemptRequestDTO = {
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
        next: (response) => {
          console.log('✅ Exam ended successfully:', response);

          // Finalize to calculate final score
          this.examAttemptService.finalizeAttempt(this.attemptId!).subscribe({
            next: (finalizeResponse) => {
              console.log('✅ Exam finalized:', finalizeResponse);
              this.isSubmitting = false;

              // Clean up
              localStorage.removeItem('currentExamAttempt');

              this.toastService.success(
                `Exam completed! Score: ${finalizeResponse.totalScore}/${finalizeResponse.totalQuestions}`
              );

              // Navigate to mocktest results page
              setTimeout(() => {
                this.router.navigate([
                  '/homepage/user-dashboard/mocktest/result',
                  this.attemptId,
                ]);
              }, 1500);
            },
            error: (error) => {
              console.error('❌ Error finalizing exam:', error);
              this.isSubmitting = false;
              this.toastService.warning(
                'Exam submitted but failed to calculate final score'
              );

              // Still navigate to result page to show feedback
              setTimeout(() => {
                this.router.navigate([
                  '/homepage/user-dashboard/mocktest/result',
                  this.attemptId,
                ]);
              }, 1500);
            },
          });
        },
        error: (error) => {
          console.error('❌ Error ending exam:', error);
          this.isSubmitting = false;
          this.toastService.error('Failed to submit exam. Please try again.');
        },
      });
    } catch (error) {
      console.error('❌ Error parsing exam attempt:', error);
      this.isSubmitting = false;
      this.toastService.error('Error submitting exam');
    }
  }

  private saveProgressOnExit(): void {
    if (!this.attemptId || this.isSubmitting) return;

    const model = {
      examAttemptId: this.attemptId,
      currentQuestionIndex: this.currentQuestionIndex,
    };

    this.examAttemptService.saveProgress(model).subscribe({
      next: () => console.log('✅ Progress saved'),
      error: (error) => console.error('❌ Error saving progress:', error),
    });
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
      this.router.navigate(['/homepage/user-dashboard/exams']);
      return;
    }

    const model = {
      examAttemptId: this.attemptId,
      currentQuestionIndex: this.currentQuestionIndex,
    };

    this.examAttemptService.saveProgress(model).subscribe({
      next: () => {
        console.log('✅ Progress saved successfully');
        localStorage.removeItem('currentExamAttempt');
        // Navigate to result page to show feedback
        this.router.navigate([
          '/homepage/user-dashboard/mocktest/result',
          this.attemptId,
        ]);
      },
      error: (error) => {
        console.error('❌ Error saving progress:', error);
        // Still navigate to result page even if save fails
        this.router.navigate([
          '/homepage/user-dashboard/mocktest/result',
          this.attemptId,
        ]);
      },
    });
  }
}
