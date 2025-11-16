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
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../Services/Auth/auth.service';
import { WritingExamPartOneService } from '../../../../Services/Exam/Writing/writing-exam.service';
import { WritingRequestP1DTO } from '../../../../Interfaces/WrittingExam/WritingRequestP1DTO.interface';
import { WritingResponseDTO } from '../../../../Interfaces/WrittingExam/WritingResponseDTO.interface';
import { QuestionDTO } from '../../../../Interfaces/exam.interfaces';
import { Router } from '@angular/router';
import { WritingAnswerBoxComponent } from '../../writing-answer-box/writing-answer-box.component';
import { TimeComponent } from '../../time/time.component';
import { PictureCaptioningService } from '../../../../Services/PictureCaptioning/picture-captioning.service';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';
import { ExamAttemptRequestDTO } from '../../../../Interfaces/ExamAttempt/ExamAttemptRequestDTO.interface';
import { ToastService } from '../../../../Services/Toast/toast.service';
import { QuotaService } from '../../../../Services/Quota/quota.service';
import { QuotaLimitModalComponent } from '../../quota-limit-modal/quota-limit-modal.component';

@Component({
  selector: 'app-writing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    WritingAnswerBoxComponent,
    TimeComponent,
    QuotaLimitModalComponent,
  ],
  templateUrl: './writing.component.html',
  styleUrl: './writing.component.scss',
})
export class WritingComponent implements OnChanges, OnDestroy, OnInit {
  @Input() questions: QuestionDTO[] | null = null;
  @Output() finished = new EventEmitter<void>();

  isShowHint: boolean = false;
  currentIndex = 0;
  captions: { [questionId: number]: string } = {};
  captionLoading: { [questionId: number]: boolean } = {};
  showExplain = false;
  isFinished = false;
  isFetchingFeedback = false;
  feedbackTotal = 0;
  feedbackDone = 0;
  totalScore = 0;
  correctCount = 0;
  savedAnswers: { questionId: number; answer: string }[] = [];
  savedTimeRemaining: number = 0;
  private autoSaveInterval: any = null;
  private readonly AUTO_SAVE_INTERVAL = 10000; // 10 seconds
  attemptId: number | null = null;
  submittingQuestions: Set<number> = new Set();

  // Quota modal
  showQuotaModal = false;
  quotaMessage =
    'Kỹ năng Writing chỉ dành cho tài khoản Premium. Vui lòng nâng cấp để sử dụng tính năng này!';

  constructor(
    private router: Router,
    private authService: AuthService,
    private writingExamPartOneService: WritingExamPartOneService,
    private pictureCaptioningService: PictureCaptioningService,
    private examAttemptService: ExamAttemptService,
    private writingService: WritingExamPartOneService,
    private toastService: ToastService,
    private quotaService: QuotaService
  ) {
    this.startAutoSave();
  }

  showHint() {
    this.isShowHint = !this.isShowHint;
  }
  ngOnInit(): void {
    this.clearPreviousWritingAnswers();
    this.loadSavedData();
    this.loadAttemptId();
    this.checkQuotaAccess();
    if (this.questions && this.questions.length > 0) {
      this.preloadAllCaptions();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions'] && this.questions) {
      this.loadSavedData();
      this.preloadAllCaptions();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoSave();
    this.saveCurrentState();
    this.saveProgressOnExit();
  }

  // ============= ATTEMPT MANAGEMENT (NEW) =============

  private clearPreviousWritingAnswers(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.includes('Writing') || key.includes('Writting')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing previous writing answers:', error);
    }
  }

  private loadAttemptId(): void {
    try {
      const stored = localStorage.getItem('currentExamAttempt');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.attemptId = parsed.attemptID || parsed.attemptId;
      }

      if (!this.attemptId) {
        console.error('No attemptId found for Writing');
      }
    } catch (error) {
      console.error('Error loading attemptId:', error);
    }
  }

  private checkQuotaAccess(): void {
    this.quotaService.checkQuota('writing').subscribe({
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

  private getStorageKey(): string | null {
    const attemptId = this.attemptId;
    if (attemptId === undefined || attemptId === null) return null;
    return `Writing_Exam_${attemptId}`;
  }

  private getFeedbackStorageKey(): string | null {
    const attemptId = this.attemptId;
    if (attemptId === undefined || attemptId === null) return null;
    return `Writing_Feedback_${attemptId}`;
  }

  private loadFeedbackMap(): Record<string, WritingResponseDTO> {
    try {
      const key = this.getFeedbackStorageKey();
      if (!key) return {};
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return {};

      // Convert new format {questionId, feedback} to old format for backward compatibility
      const result: Record<string, WritingResponseDTO> = {};
      for (const key in parsed) {
        const data = parsed[key];
        if (data && typeof data === 'object' && data.feedback) {
          // New format: {questionId, feedback, savedAt}
          result[key] = data.feedback;
        } else {
          // Old format: direct feedback object
          result[key] = data;
        }
      }
      return result;
    } catch {
      return {};
    }
  }

  private saveFeedbackMap(map: Record<string, WritingResponseDTO>): void {
    try {
      const key = this.getFeedbackStorageKey();
      if (!key) return;

      // Save in new format with questionId
      const newFormat: Record<string, any> = {};
      for (const qId in map) {
        newFormat[qId] = {
          questionId: Number(qId),
          feedback: map[qId],
          savedAt: new Date().toISOString(),
        };
      }
      localStorage.setItem(key, JSON.stringify(newFormat));
    } catch {
      // ignore
    }
  }

  private loadSavedData(): void {
    this.loadSavedAnswers();
  }

  private loadSavedAnswers(): void {
    try {
      const key = this.getStorageKey();
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

      // Handle both old array format and new object format
      if (Array.isArray(parsed)) {
        // Old format: [{questionId, answer}]
        this.savedAnswers = parsed
          .map((x: any) => ({
            questionId: Number(x?.questionId),
            answer: String(x?.answer || ''),
          }))
          .filter((x: any) => Number.isFinite(x.questionId));
      } else if (parsed && typeof parsed === 'object') {
        // New format: {questionId: {questionId, answer, savedAt}}
        this.savedAnswers = [];
        for (const qId in parsed) {
          const data = parsed[qId];
          if (data && typeof data === 'object' && data.questionId) {
            this.savedAnswers.push({
              questionId: Number(data.questionId),
              answer: String(data.answer || ''),
            });
          }
        }
      } else {
        this.savedAnswers = [];
      }
    } catch {
      this.savedAnswers = [];
    }
  }

  private saveCurrentState(): void {
    this.saveAnswers();
  }

  private saveAnswers(): void {
    try {
      const key = this.getStorageKey();
      if (!key) return;
      localStorage.setItem(key, JSON.stringify(this.savedAnswers));
    } catch {
      // Best-effort only; ignore storage errors
    }
  }

  private startAutoSave(): void {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(() => {
      this.saveCurrentState();
    }, this.AUTO_SAVE_INTERVAL);
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  onTimeout(): void {
    this.showExplain = true;
    this.finishExam();
  }

  onTimeUpdate(remainingTime: number): void {
    this.savedTimeRemaining = remainingTime;
  }

  onAnswerChange(questionId: number, answer: string): void {
    const existingIndex = this.savedAnswers.findIndex(
      (x) => x.questionId === questionId
    );
    if (existingIndex >= 0) {
      this.savedAnswers[existingIndex].answer = answer;
    } else {
      this.savedAnswers.push({ questionId, answer });
    }
  }

  onAnswerSubmitted(questionId: number, isCorrect: boolean): void {
    if (isCorrect) {
      const question = this.questions?.find((q) => q.questionId === questionId);
      if (question) {
        this.totalScore += question.scoreWeight ?? 0;
        this.correctCount += 1;
      }
    }
  }

  generateCaption(questionIndex: number): void {
    if (!this.questions || questionIndex >= this.questions.length) return;

    const question = this.questions[questionIndex];
    if (!question.prompt?.referenceImageUrl) {
      this.captions[question.questionId] = 'Can not generate caption';
      this.captionLoading[question.questionId] = false;
      return;
    }

    this.captionLoading[question.questionId] = true;
    this.pictureCaptioningService
      .GetCaptionOfPicture(question.prompt.referenceImageUrl)
      .subscribe({
        next: (response) => {
          this.captions[question.questionId] =
            response.caption || 'Can not generate caption';
          this.captionLoading[question.questionId] = false;
        },
        error: (error) => {
          this.captions[question.questionId] = 'Can not generate caption';
          this.captionLoading[question.questionId] = false;
        },
      });
  }

  preloadAllCaptions(): void {
    if (!this.questions) return;
    for (const q of this.questions) {
      if (q.prompt?.referenceImageUrl) {
        if (!(q.questionId in this.captions)) {
          this.captionLoading[q.questionId] = true;
          this.pictureCaptioningService
            .GetCaptionOfPicture(q.prompt.referenceImageUrl)
            .subscribe({
              next: (response) => {
                this.captions[q.questionId] =
                  response.caption || 'Can not generate caption';
                this.captionLoading[q.questionId] = false;
              },
              error: (error) => {
                this.captions[q.questionId] = 'Can not generate caption';
                this.captionLoading[q.questionId] = false;
              },
            });
        }
      } else {
        this.captions[q.questionId] = 'Can not generate caption';
        this.captionLoading[q.questionId] = false;
      }
    }
  }

  nextQuestion(): void {
    // Chặn không cho chuyển câu khi đang nộp
    if (this.isAnyQuestionSubmitting()) {
      return;
    }

    if (this.questions && this.currentIndex < this.questions.length - 1) {
      this.currentIndex += 1;
      this.showExplain = false;
      this.isShowHint = false;
    } else {
      this.finishExam();
    }
  }

  previousQuestion(): void {
    // Chặn không cho chuyển câu khi đang nộp
    if (this.isAnyQuestionSubmitting()) {
      return;
    }

    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
      this.showExplain = false;
      this.isShowHint = false;
    }
  }

  navigateToQuestion(index: number): void {
    // Chặn không cho chuyển câu khi đang nộp
    if (this.isAnyQuestionSubmitting()) {
      return;
    }

    if (this.questions && index >= 0 && index < this.questions.length) {
      this.currentIndex = index;
      this.showExplain = false;
      this.isShowHint = false;
    }
  }

  finishExam(): void {
    this.showExplain = true;
    this.saveCurrentState();

    this.callEndExamAPI();

    // After submit, fetch feedback for all questions and save to localStorage
    this.fetchAllFeedbackAndFinalize();
  }

  private callEndExamAPI(): void {
    try {
      const storedAttempt = localStorage.getItem('currentExamAttempt');
      if (!storedAttempt) {
        console.error('No currentExamAttempt found in localStorage');
        return;
      }

      const attemptData = JSON.parse(storedAttempt);

      const endExamRequest: ExamAttemptRequestDTO = {
        attemptID: attemptData.attemptID || attemptData.attemptId,
        userID: attemptData.userID || attemptData.userId,
        examID: attemptData.examID || attemptData.examId,
        examPartId: attemptData.examPartId || null,
        startTime: attemptData.startTime,
        endTime: new Date().toISOString(),
        score: 0,
        status: 'Completed',
      };

      this.examAttemptService.endExam(endExamRequest).subscribe({
        next: (response) => {
          // Exam ended successfully
        },
        error: (error) => {
          console.error('Error ending writing exam:', error);
        },
      });
    } catch (error) {
      console.error('Error parsing currentExamAttempt:', error);
    }
  }

  private fetchAllFeedbackAndFinalize(): void {
    if (!this.questions || this.questions.length === 0) {
      this.isFinished = true;
      this.finished.emit();
      return;
    }

    const feedbackMap = this.loadFeedbackMap();
    const answersMap: Record<number, string> = this.savedAnswers.reduce(
      (acc, a) => {
        acc[a.questionId] = a.answer;
        return acc;
      },
      {} as Record<number, string>
    );

    let pending = 0;
    let started = 0;

    const maybeComplete = () => {
      if (started > 0 && pending === 0) {
        this.saveFeedbackMap(feedbackMap);
        this.isFetchingFeedback = false;
        this.isFinished = true;
        this.finished.emit();
      }
    };

    // Determine how many to fetch
    const toFetch = this.questions.filter((q) => {
      const qid = q.questionId;
      if (feedbackMap[String(qid)]) return false;
      const userAnswer = answersMap[qid] || '';
      const vocabReq = q.prompt?.contentText || '';
      const caption = this.captions[qid] || '';
      return userAnswer.trim() || vocabReq.trim() || caption.trim();
    });

    this.feedbackTotal = toFetch.length;
    this.feedbackDone = 0;
    this.isFetchingFeedback = this.feedbackTotal > 0;

    for (const q of this.questions) {
      const qid = q.questionId;
      // Only fetch if user has an answer (optional: or always fetch)
      const userAnswer = answersMap[qid] || '';
      const vocabReq = q.prompt?.contentText || '';
      const caption = this.captions[qid] || '';

      // Skip if already have feedback stored
      if (feedbackMap[String(qid)]) {
        continue;
      }

      // If no useful inputs, skip
      if (!userAnswer.trim() && !vocabReq.trim() && !caption.trim()) {
        continue;
      }

      const req: WritingRequestP1DTO = {
        pictureCaption: caption,
        vocabularyRequest: vocabReq,
        userAnswer: userAnswer,
      };

      started++;
      pending++;
      this.writingService.GetFeedbackOfWritingPartOne(req).subscribe({
        next: (resp: WritingResponseDTO) => {
          feedbackMap[String(qid)] = resp;
          this.feedbackDone++;
          pending--;
          maybeComplete();
        },
        error: (error) => {
          this.feedbackDone++;
          pending--;
          maybeComplete();
        },
      });
    }

    // If nothing to fetch, finalize immediately
    if (started === 0) {
      this.isFetchingFeedback = false;
      this.feedbackTotal = 0;
      this.feedbackDone = 0;
      this.isFinished = true;
      this.finished.emit();
    }
  }

  getCurrentQuestion(): QuestionDTO | null {
    if (!this.questions || this.currentIndex >= this.questions.length)
      return null;
    return this.questions[this.currentIndex];
  }

  getSavedAnswer(questionId: number): string {
    const saved = this.savedAnswers.find((x) => x.questionId === questionId);
    return saved?.answer || '';
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

  resetExam(): void {
    this.currentIndex = 0;
    this.showExplain = false;
    this.isShowHint = false;
    this.isFinished = false;
    this.totalScore = 0;
    this.correctCount = 0;
    this.savedAnswers = [];
    this.savedTimeRemaining = 0;
    this.captions = {};
    this.captionLoading = {};
    this.clearSavedData();
  }

  viewHistory(): void {
    // Điều hướng đến trang lịch sử làm bài với attemptId hiện tại
    if (this.attemptId) {
      this.router.navigate([
        '/homepage/user-dashboard/exam-attempts',
        this.attemptId,
      ]);
    } else {
      console.error('No attemptId found for viewing history');
    }
  }

  clearSavedData(): void {
    try {
      const answersKey = this.getStorageKey();
      const feedbackKey = this.getFeedbackStorageKey();
      const submittedKey = this.getSubmittedStorageKey();

      if (answersKey) localStorage.removeItem(answersKey);
      if (feedbackKey) localStorage.removeItem(feedbackKey);
      if (submittedKey) localStorage.removeItem(submittedKey);
    } catch {
      // ignore
    }
  }

  private getSubmittedStorageKey(): string | null {
    const attemptId = this.attemptId;
    if (attemptId === undefined || attemptId === null) return null;
    return `Submitted_Writting_${attemptId}`;
  }

  canNavigateToQuestion(index: number): boolean {
    return this.questions ? index >= 0 && index < this.questions.length : false;
  }

  isCurrentQuestion(index: number): boolean {
    return index === this.currentIndex;
  }

  hasAnswer(questionId: number): boolean {
    return this.savedAnswers.some(
      (ans) => ans.questionId === questionId && ans.answer.trim().length > 0
    );
  }

  isQuestionSubmitted(questionId: number): boolean {
    try {
      const key = this.getSubmittedStorageKey();
      if (!key) return false;

      const raw = localStorage.getItem(key);
      if (!raw) return false;

      const submittedQuestions = JSON.parse(raw);
      if (submittedQuestions && typeof submittedQuestions === 'object') {
        return submittedQuestions[String(questionId)] === true;
      }
      return false;
    } catch {
      return false;
    }
  }

  isQuestionSubmitting(questionId: number): boolean {
    return this.submittingQuestions.has(questionId);
  }

  isAnyQuestionSubmitting(): boolean {
    return this.submittingQuestions.size > 0;
  }

  onSubmitStart(questionId: number): void {
    this.submittingQuestions.add(questionId);
  }

  onSubmitEnd(questionId: number): void {
    this.submittingQuestions.delete(questionId);
  }

  finishWritingExam(): void {
    const totalQuestions = this.questions?.length || 0;

    const questionsInProgress =
      this.questions?.filter((q) => {
        const hasAnswer = this.hasAnswer(q.questionId);
        const isSubmitted = this.isQuestionSubmitted(q.questionId);
        return hasAnswer && !isSubmitted;
      }) || [];

    if (questionsInProgress.length > 0) {
      const questionNumbers = questionsInProgress
        .map((q, idx) => `Câu ${this.questions?.indexOf(q)! + 1}`)
        .join(', ');

      this.toastService.warning(
        `Bạn có ${questionsInProgress.length} câu đang làm dở chưa nộp: ${questionNumbers}. ` +
          'Vui lòng nộp các câu này trước khi nộp bài.'
      );
      return;
    }

    const submittedCount =
      this.questions?.filter((q) => this.isQuestionSubmitted(q.questionId))
        .length || 0;

    const confirmFinish = confirm(
      'Bạn có chắc chắn muốn nộp bài thi Writing không?\n\n' +
        `Số câu đã nộp: ${submittedCount}/${totalQuestions}`
    );

    if (confirmFinish) {
      this.finishExam();
    }
  }

  // ============= EXIT HANDLING (NEW) =============

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (!this.isFinished && this.attemptId) {
      $event.returnValue = 'Bạn có muốn lưu tiến trình và thoát không?';
    }
  }

  private saveProgressOnExit(): void {
    if (!this.isFinished && this.attemptId) {
      const model = {
        examAttemptId: this.attemptId,
        currentQuestionIndex: this.currentIndex,
      };

      this.examAttemptService.saveProgress(model).subscribe({
        next: () => {},
        error: (error) =>
          console.error('Error saving writing progress:', error),
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
        localStorage.removeItem('currentExamAttempt');
        this.router.navigate(['homepage/user-dashboard/exams']);
      },
      error: (error) => {
        console.error('Error saving writing progress:', error);
        this.router.navigate(['homepage/user-dashboard/exams']);
      },
    });
  }

  getCurrentCaption(): string {
    const q = this.getCurrentQuestion();
    return q && this.captions[q.questionId] !== undefined
      ? this.captions[q.questionId]
      : '';
  }
  isCurrentCaptionLoading(): boolean {
    const q = this.getCurrentQuestion();
    return q ? !!this.captionLoading[q.questionId] : false;
  }
}
