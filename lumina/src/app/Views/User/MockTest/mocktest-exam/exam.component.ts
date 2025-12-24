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
import { ConfirmExitModalComponent } from '../confirm-exit-modal/confirm-exit-modal.component';
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
    ConfirmExitModalComponent,
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
  selectedAnswers: { [questionId: number]: number } = {};
  showPartCompletionMessage: boolean = false;

  speakingCompletedQuestions: { [partId: number]: number } = {};
  showSpeakingNextPartButton: boolean = false;

  attemptId: number | null = null;
  examId: number | null = null;
  isSubmitting: boolean = false;
  examFinished: boolean = false; // Track if exam has been submitted
  showExitModal: boolean = false; // Control exit confirmation modal
  totalScore: number = 0;

  currentPartTime: number = 0;
  timerResetTrigger: number = 0;
  hasShownWarning: boolean = false;

  @ViewChild('audioPlayer', { static: false })
  audioPlayer?: ElementRef<HTMLAudioElement>;
  audioPlayCounts = new Map<number, number>();
  maxPlays = 1;
  isAudioPlaying = false;
  audioCurrentTime = 0;
  audioDuration = 0;
  audioProgress = 0;
  navigatorLegendItems: NavigatorLegendItem[] = [
    { color: 'bg-gray-200', label: 'Chưa làm' },
    { color: 'bg-green-500', label: 'Đã làm' },
    { color: 'bg-blue-600', label: 'Đang làm' },
  ];

  // Part 4 specific properties
  isPart4 = false;
  currentPromptIndex = 0;
  questionGroups: QuestionDTO[][] = [];

  getQuestionStatus = (questionId: number, index: number): string => {
    if (index === this.currentQuestionIndex) return 'current';
    if (this.isQuestionAnswered(questionId)) return 'answered';
    return 'unanswered';
  };

  get audioPlayCount(): number {
    if (this.isPart4) {
      // For Part 4, use the first question in the current group
      const firstQuestionId = this.getCurrentPromptQuestions()[0]?.questionId;
      return this.audioPlayCounts.get(firstQuestionId) || 0;
    }
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

  private sortPartsBySkillAndId(parts: ExamPartDTO[]): ExamPartDTO[] {
    const skillOrder = {
      listening: 1,
      reading: 2,
      speaking: 3,
      writing: 4,
      unknown: 5,
    };

    return parts.sort((a, b) => {
      const skillA = this.getSkillType(a);
      const skillB = this.getSkillType(b);

      const skillDiff = skillOrder[skillA] - skillOrder[skillB];
      if (skillDiff !== 0) return skillDiff;

      return (a.partId || 0) - (b.partId || 0);
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.examId = +params['examId'] || null;

      if (this.examId) {
        this.createExamAttempt();
      }
    });

    this.loadMocktestQuestions();
  }

  ngOnDestroy(): void {
    this.saveProgressOnExit();
  }

  getCurrentAudioUrl(): string {
    if (this.isPart4) {
      // For Part 4, use audio from first question in the prompt group
      const firstQuestion = this.getCurrentPromptQuestions()[0];
      return firstQuestion?.prompt?.referenceAudioUrl || '';
    }
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

    // For Part 4, use first question in group as the key
    const currentQuestionId = this.isPart4
      ? this.getCurrentPromptQuestions()[0]?.questionId
      : this.currentQuestion?.questionId;
    if (!currentQuestionId) return;

    const currentCount = this.audioPlayCounts.get(currentQuestionId) || 0;

    if (currentCount === 0) {
      // Delay 1 giây để người dùng có thể xem giao diện trước khi phát audio
      setTimeout(() => {
        this.playAudio();
      }, 1000);
    }
  }

  playAudio(): void {
    if (!this.audioPlayer) return;

    const audio = this.audioPlayer.nativeElement;
    // For Part 4, use first question in group as the key
    const currentQuestionId = this.isPart4
      ? this.getCurrentPromptQuestions()[0]?.questionId
      : this.currentQuestion?.questionId;
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
        .catch((error) => {});
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
      });
  }

  getSelectedOptionId(questionId: number): number | null {
    return this.selectedAnswers[questionId] ?? null;
  }

  navigateToQuestion(index: number): void {
    if (index >= 0 && index < (this.currentPart?.questions.length || 0)) {
      if (this.isPart4) {
        // For Part 4, find which prompt group contains this question
        const targetQuestion = this.currentPart?.questions[index];
        const promptIndex = this.questionGroups.findIndex((group) =>
          group.some((q) => q.questionId === targetQuestion?.questionId)
        );
        if (promptIndex !== -1) {
          this.currentPromptIndex = promptIndex;
          this.resetAudioState();
          this.autoPlayAudio();
        }
      } else {
        this.currentQuestionIndex = index;
        this.showPartCompletionMessage = false;

        this.resetAudioState();
        if (this.currentSkillType === 'listening') {
          this.autoPlayAudio();
        }
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
      this.toastService.error('Vui lòng đăng nhập để bắt đầu bài thi');
      this.router.navigate(['/auth/login']);
      return;
    }

    localStorage.removeItem('currentExamAttempt');

    if (!this.examId) {
      return;
    }

    const attemptRequest: ExamAttemptRequestDTO = {
      attemptID: 0,
      userID: Number(user.id),
      examID: this.examId,
      examPartId: null,
      startTime: new Date().toISOString(),
      endTime: null,
      score: null,
      status: 'Doing',
    };

    this.examAttemptService.startExam(attemptRequest).subscribe({
      next: (response) => {
        this.attemptId = response.attemptID;
        localStorage.setItem('currentExamAttempt', JSON.stringify(response));
      },
      error: (error) => {
        this.toastService.error('Không thể bắt đầu bài thi. Vui lòng thử lại.');
      },
    });
  }

  loadMocktestQuestions() {
    this.mockTestService.getMocktestQuestions().subscribe({
      next: (data: ExamPartDTO[]) => {
        this.exampartDetailsAndQustions = this.sortPartsBySkillAndId(data);

        if (!this.examId && data.length > 0) {
          this.examId = data[0].examId;

          this.createExamAttempt();
        }

        this.currentPartIndex = 0;
        this.currentQuestionIndex = 0;
        this.detectAndGroupPart4();
        this.initializePartTimer();

        if (this.currentSkillType === 'listening') {
          this.autoPlayAudio();
        }
      },
      error: (error) => {
        this.toastService.error(
          'Không thể tải câu hỏi bài thi. Vui lòng thử lại sau.'
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
    return String.fromCharCode(65 + index);
  }

  selectAnswer(optionId: number) {
    if (this.currentQuestion) {
      this.selectedAnswers[this.currentQuestion.questionId] = optionId;

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
        if (response.isCorrect) {
          this.totalScore += response.score;
        }
      },
      error: (error) => {},
    });
  }

  isQuestionAnswered(questionId: number): boolean {
    if (this.isMultipleChoicePart) {
      return this.selectedAnswers[questionId] !== undefined;
    }

    return false;
  }

  isCurrentPartComplete(): boolean {
    if (!this.isMultipleChoicePart) return true;

    const currentQuestions = this.currentPart?.questions || [];
    return currentQuestions.every((q) => this.isQuestionAnswered(q.questionId));
  }

  getUnansweredCount(): number {
    if (!this.isMultipleChoicePart) return 0;

    const currentQuestions = this.currentPart?.questions || [];
    return currentQuestions.filter(
      (q) => !this.isQuestionAnswered(q.questionId)
    ).length;
  }

  getAnsweredCountInPart(): number {
    if (!this.currentPart) return 0;
    return this.currentPart.questions.filter((q) =>
      this.isQuestionAnswered(q.questionId)
    ).length;
  }

  getTotalQuestionsInPart(): number {
    return this.currentPart?.questions.length || 0;
  }

  goToQuestion(questionIndex: number) {
    this.currentQuestionIndex = questionIndex;
    this.showPartCompletionMessage = false;

    this.resetAudioState();
    if (this.currentSkillType === 'listening') {
      this.autoPlayAudio();
    }
  }

  private calculatePartTotalTime(): number {
    if (!this.currentPart || !this.isMultipleChoicePart) return 0;

    return this.currentPart.questions.reduce((total, question) => {
      return total + (question.time || 0);
    }, 0);
  }

  private initializePartTimer(): void {
    if (this.isMultipleChoicePart) {
      this.currentPartTime = this.calculatePartTotalTime();
      this.timerResetTrigger = Date.now();
      this.hasShownWarning = false;
    }
  }

  onPartTimerTick(remainingTime: number): void {
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
      ' Hết thời gian! Tự động chuyển sang part tiếp theo'
    );

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

    if (this.isMultipleChoicePart) {
      if (!this.selectedAnswers[this.currentQuestion.questionId]) {
        this.toastService.warning('Vui lòng chọn đáp án trước khi tiếp tục');
        return;
      }
    }

    if (this.isLastQuestionInPart()) {
      if (this.isMultipleChoicePart && !this.isCurrentPartComplete()) {
        const unanswered = this.getUnansweredCount();
        this.toastService.warning(
          `Vui lòng hoàn thành ${unanswered} câu còn lại trước khi chuyển part`
        );
        return;
      }

      if (this.isLastQuestionInExam()) {
        this.finishExam();
      } else {
        this.showPartCompletionMessage = true;
      }
    } else {
      this.currentQuestionIndex++;
      this.resetAudioState();
      if (this.currentSkillType === 'listening') {
        this.autoPlayAudio();
      }
    }
  }

  onSpeakingAnswered(isCorrect: boolean): void {}

  onSpeakingPartCompleted(): void {
    if (this.currentPart) {
      this.speakingCompletedQuestions[this.currentPart.partId] =
        this.currentPart.questions.length;
    }

    if (this.isLastQuestionInExam()) {
      this.finishExam();
    } else {
      this.showSpeakingNextPartButton = true;
    }
  }

  onWritingPartCompleted(): void {
    if (this.isLastQuestionInExam()) {
      this.finishExam();
    } else {
      this.showPartCompletionMessage = true;
    }
  }

  onWritingFinished(): void {
    if (this.isLastQuestionInExam()) {
      this.finishExam();
    } else {
      this.showPartCompletionMessage = true;
    }
  }

  canProceedToNextPart(): boolean {
    if (this.isMultipleChoicePart) {
      return (
        this.currentPart?.questions.every(
          (q) => this.selectedAnswers[q.questionId] !== undefined
        ) || false
      );
    }

    return true;
  }

  previousQuestion() {
    if (this.currentQuestionIndex === 0 && this.currentPartIndex > 0) {
      this.toastService.warning('Không thể quay lại part trước');
      return;
    }

    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.showPartCompletionMessage = false;
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
      this.currentPromptIndex = 0; // Reset Part 4 prompt index
      this.showPartCompletionMessage = false;
      this.showSpeakingNextPartButton = false;
      this.detectAndGroupPart4(); // Detect if new part is Part 4
      this.toastService.success(`Bắt đầu ${this.currentPart?.title}`);
      this.updatePartCodeStorage();
      this.initializePartTimer();

      if (this.currentSkillType === 'listening') {
        this.autoPlayAudio();
      }
    }
  }

  // ============= PART 4 SPECIFIC METHODS =============

  /**
   * Detect if this is Part 4 and group questions by promptId
   */
  private detectAndGroupPart4(): void {
    const partCode = this.currentPart?.partCode?.toUpperCase();
    this.isPart4 = partCode === 'LISTENING_PART_4' || partCode === 'PART_4';

    if (this.isPart4) {
      this.groupQuestionsByPrompt();
      this.currentPromptIndex = 0;
      console.log(
        '📊 Mock Test Part 4 detected. Question groups:',
        this.questionGroups
      );
    } else {
      this.questionGroups = [];
    }
  }

  /**
   * Group questions by promptId (3 questions per group for Part 4)
   */
  private groupQuestionsByPrompt(): void {
    if (!this.currentPart) return;

    const groupMap = new Map<number, QuestionDTO[]>();

    this.currentPart.questions.forEach((question) => {
      const promptId = question.promptId || 0;
      if (!groupMap.has(promptId)) {
        groupMap.set(promptId, []);
      }
      groupMap.get(promptId)!.push(question);
    });

    this.questionGroups = Array.from(groupMap.values());
  }

  /**
   * Get the 3 questions in the current prompt group
   */
  getCurrentPromptQuestions(): QuestionDTO[] {
    if (!this.isPart4 || this.questionGroups.length === 0) {
      return this.currentQuestion ? [this.currentQuestion] : [];
    }
    return this.questionGroups[this.currentPromptIndex] || [];
  }

  /**
   * Navigate to next prompt group (Part 4)
   */
  nextPrompt(): void {
    // Validate all questions in current group are answered
    const currentGroupQuestions = this.getCurrentPromptQuestions();
    const unansweredInGroup = currentGroupQuestions.filter(
      (q) => !this.selectedAnswers[q.questionId]
    );

    if (unansweredInGroup.length > 0) {
      this.toastService.warning(
        `Vui lòng trả lời ${unansweredInGroup.length} câu còn lại trong nhóm này`
      );
      return;
    }

    if (this.currentPromptIndex < this.questionGroups.length - 1) {
      this.currentPromptIndex++;
      this.resetAudioState();
      this.autoPlayAudio();
    } else {
      // Last prompt group - check if we should move to next part or finish
      if (this.isLastPartInExam()) {
        this.finishExam();
      } else {
        this.showPartCompletionMessage = true;
      }
    }
  }

  /**
   * Navigate to previous prompt group (Part 4)
   */
  previousPrompt(): void {
    if (this.currentPromptIndex > 0) {
      this.currentPromptIndex--;
      this.resetAudioState();
      this.autoPlayAudio();
    } else {
      this.toastService.warning('Không thể quay lại part trước');
    }
  }

  /**
   * Check if current part is the last part in exam
   */
  isLastPartInExam(): boolean {
    return this.currentPartIndex === this.exampartDetailsAndQustions.length - 1;
  }

  /**
   * Check if current prompt group is the last one in Part 4
   */
  isLastPromptInPart(): boolean {
    if (!this.isPart4) return this.isLastQuestionInPart();
    return this.currentPromptIndex === this.questionGroups.length - 1;
  }

  /**
   * Handle answer selection for Part 4 questions
   */
  onOptionAnsweredPart4(questionId: number, optionId: number): void {
    this.selectedAnswers[questionId] = optionId;

    if (this.attemptId) {
      this.submitAnswerToBackend(questionId, optionId);
    }
  }

  // ============= END PART 4 METHODS =============

  isLastQuestionInPart(): boolean {
    if (!this.currentPart) return false;
    if (this.isPart4) {
      return this.currentPromptIndex === this.questionGroups.length - 1;
    }
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
    const multipleChoiceCount = Object.keys(this.selectedAnswers).length;

    const speakingCount = Object.values(this.speakingCompletedQuestions).reduce(
      (sum, count) => sum + count,
      0
    );

    return multipleChoiceCount + speakingCount;
  }

  finishExam() {
    if (!this.attemptId) {
      this.toastService.error('Không tìm thấy phiên thi');
      return;
    }

    const totalQuestions = this.getTotalQuestions();
    const answeredQuestions = this.getAnsweredCount();

    if (answeredQuestions < totalQuestions && this.isMultipleChoicePart) {
      const confirmed = confirm(
        `Bạn đã trả lời ${answeredQuestions}/${totalQuestions} câu hỏi. Bạn có muốn nộp bài không?`
      );
      if (!confirmed) return;
    }

    this.isSubmitting = true;
    this.examFinished = true; // Prevent saveProgress from running during ngOnDestroy

    const storedAttempt = localStorage.getItem('currentExamAttempt');
    if (!storedAttempt) {
      this.toastService.error('Không tìm thấy phiên thi');
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
          this.examAttemptService.finalizeAttempt(this.attemptId!).subscribe({
            next: (finalizeResponse) => {
              this.isSubmitting = false;

              localStorage.removeItem('currentExamAttempt');

              this.toastService.success(`Hoàn thành bài thi!`);

              setTimeout(() => {
                this.router.navigate([
                  '/homepage/user-dashboard/mocktest/result',
                  this.attemptId,
                ]);
              }, 1500);
            },
            error: (error) => {
              this.isSubmitting = false;

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
          this.isSubmitting = false;
          this.toastService.error('Không thể nộp bài. Vui lòng thử lại.');
        },
      });
    } catch (error) {
      this.isSubmitting = false;
      this.toastService.error('Lỗi khi nộp bài thi');
    }
  }

  private saveProgressOnExit(): void {
    // Don't save progress if exam is already finished or being submitted
    if (!this.attemptId || this.isSubmitting || this.examFinished) return;

    const model = {
      examAttemptId: this.attemptId,
      currentQuestionIndex: this.currentQuestionIndex,
    };

    this.examAttemptService.saveProgress(model).subscribe({
      next: () => {},
      error: (error) => {},
    });
  }

  confirmExit(): void {
    this.showExitModal = true;
  }

  onExitConfirmed(): void {
    this.showExitModal = false;
    this.endExamAndExit();
  }

  onExitCancelled(): void {
    this.showExitModal = false;
  }

  private endExamAndExit(): void {
    if (!this.attemptId) {
      this.router.navigate(['/homepage/user-dashboard/exams']);
      return;
    }

    const storedAttempt = localStorage.getItem('currentExamAttempt');
    if (!storedAttempt) {
      this.toastService.error('Không tìm thấy phiên thi');
      return;
    }

    this.isSubmitting = true;
    this.examFinished = true;

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
          this.examAttemptService.finalizeAttempt(this.attemptId!).subscribe({
            next: (finalizeResponse) => {
              this.isSubmitting = false;
              localStorage.removeItem('currentExamAttempt');

              this.toastService.success(
                `Đã kết thúc bài thi! Điểm: ${finalizeResponse.totalScore}/${finalizeResponse.totalQuestions}`
              );

              setTimeout(() => {
                this.router.navigate([
                  '/homepage/user-dashboard/mocktest/result',
                  this.attemptId,
                ]);
              }, 1500);
            },
            error: (error) => {
              this.isSubmitting = false;
              localStorage.removeItem('currentExamAttempt');

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
          this.isSubmitting = false;
          this.toastService.error(
            'Không thể kết thúc bài thi. Vui lòng thử lại.'
          );
        },
      });
    } catch (error) {
      this.isSubmitting = false;
      this.toastService.error('Lỗi khi kết thúc bài thi');
    }
  }
}
