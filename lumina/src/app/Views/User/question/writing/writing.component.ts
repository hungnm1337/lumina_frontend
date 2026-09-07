import { PopupComponent } from '../../../Common/popup/popup.component';
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
import { ReportPopupComponent } from '../../Report/report-popup/report-popup.component';
import {
  WritingQuestionStateService,
  WritingQuestionStateData,
} from '../../../../Services/Exam/Writing/writing-question-state.service';
import { SidebarService } from '../../../../Services/sidebar.service';
import {
  QuestionNavigatorComponent,
  NavigatorLegendItem,
} from '../../question-navigator/question-navigator.component';
import { TeacherContactModalComponent } from '../../teacher-contact-modal/teacher-contact-modal.component';

@Component({
  selector: 'app-writing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    WritingAnswerBoxComponent,
    TimeComponent,
    QuotaLimitModalComponent,
    ReportPopupComponent,
    PopupComponent,
    QuestionNavigatorComponent,
    TeacherContactModalComponent,
  ],
  templateUrl: './writing.component.html',
  styleUrl: './writing.component.scss',
})
export class WritingComponent implements OnChanges, OnDestroy, OnInit {
  showPopup = false;
  popupMessage = '';
  popupTitle = '';
  popupOkHandler: (() => void) | null = null;
  popupCancelHandler: (() => void) | null = null;

  onPopupOk() {
    if (this.popupOkHandler) this.popupOkHandler();
  }
  onPopupCancel() {
    if (this.popupCancelHandler) this.popupCancelHandler();
  }
  showReportPopup: boolean = false;
  showTeacherModal: boolean = false;

  get examId(): number | null {
    return this.attemptId;
  }
  @Input() questions: QuestionDTO[] | null = null;
  @Input() isInMockTest: boolean = false;
  @Output() finished = new EventEmitter<void>();
  @Output() writingPartCompleted = new EventEmitter<void>();

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

  questionStates: Map<number, WritingQuestionStateData> = new Map();

  // Total time for all questions combined
  totalTime: number = 0;

  showQuotaModal = false;
  quotaMessage =
    'Kỹ năng Writing chỉ dành cho tài khoản Premium. Vui lòng nâng cấp để sử dụng tính năng này!';

  navigatorLegendItems: NavigatorLegendItem[] = [
    { color: 'bg-gray-200', label: 'Chưa làm' },
    { color: 'bg-orange-500', label: 'Đã làm' },
    { color: 'bg-purple-500', label: 'Đã nộp' },
    { color: 'bg-yellow-500', label: 'Đang chấm', animated: true },
    { color: 'bg-green-600', label: 'Đã chấm xong' },
    { color: 'bg-blue-600', label: 'Đang làm' },
  ];

  getQuestionStatus = (questionId: number, index: number): string => {
    if (this.hasQuestionFeedback(questionId)) return 'answered-green-600';
    if (this.isQuestionSubmitting(questionId)) return 'submitting';
    if (this.isQuestionSubmitted(questionId)) return 'submitted';
    if (this.hasAnswer(questionId)) return 'has-answer';
    if (index === this.currentIndex) return 'current';
    return 'unanswered';
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private writingExamPartOneService: WritingExamPartOneService,
    private pictureCaptioningService: PictureCaptioningService,
    private examAttemptService: ExamAttemptService,
    private writingService: WritingExamPartOneService,
    private toastService: ToastService,
    private quotaService: QuotaService,
    private cdr: ChangeDetectorRef,
    private writingStateService: WritingQuestionStateService,
    private sidebarService: SidebarService
  ) {
    this.startAutoSave();
  }

  onReportPopupClose(): void {
    console.log('[WritingComponent] Report popup close received');
    this.showReportPopup = false;
    this.cdr.detectChanges();
  }

  showHint() {
    this.isShowHint = !this.isShowHint;
  }
  ngOnInit(): void {
    this.clearPreviousWritingAnswers();
    this.loadSavedData();
    this.loadAttemptId();
    this.checkQuotaAccess();
    this.sidebarService.hideSidebar(); // Ẩn sidebar khi bắt đầu làm bài
    if (this.questions && this.questions.length > 0) {
      // Calculate total time from all questions
      this.totalTime = this.questions.reduce((sum, q) => sum + (q.time || 0), 0);
      this.preloadAllCaptions();
      this.questions.forEach((q) => {
        this.writingStateService.initializeQuestion(q.questionId);
      });
    }

    this.writingStateService.getStates().subscribe((states) => {
      this.questionStates = states;
      this.cdr.markForCheck();

      console.log('[Writing] Question states updated:', {
        totalStates: states.size,
        scoringCount: Array.from(states.values()).filter(
          (s) => s.state === 'scoring'
        ).length,
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions'] && this.questions) {
      // Recalculate total time when questions change
      this.totalTime = this.questions.reduce((sum, q) => sum + (q.time || 0), 0);
      this.loadSavedData();
      this.preloadAllCaptions();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoSave();
    this.clearAllWritingData();
    this.sidebarService.showSidebar();
  }

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

  private clearAllWritingData(): void {
    try {
      const answersKey = this.getStorageKey();
      const feedbackKey = this.getFeedbackStorageKey();
      const submittedKey = this.getSubmittedStorageKey();

      if (answersKey) localStorage.removeItem(answersKey);
      if (feedbackKey) localStorage.removeItem(feedbackKey);
      if (submittedKey) localStorage.removeItem(submittedKey);

      this.writingStateService.clearAllStates();
    } catch (error) {
      console.error('[Writing] Error clearing writing data:', error);
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
        console.error('[Writing] No attemptId found');

        if (this.isInMockTest) {
          console.warn(
            '[Writing] In mock test mode - waiting for mock test to create attempt'
          );
        }
      } else {
        console.log('[Writing] Loaded attemptId:', this.attemptId);
      }
    } catch (error) {
      console.error('[Writing] Error loading attemptId:', error);
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
        console.error(' Failed to check quota:', err);
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

      const result: Record<string, WritingResponseDTO> = {};
      for (const key in parsed) {
        const data = parsed[key];
        if (data && typeof data === 'object' && data.feedback) {
          result[key] = data.feedback;
        } else {
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

      const newFormat: Record<string, any> = {};
      for (const qId in map) {
        newFormat[qId] = {
          questionId: Number(qId),
          feedback: map[qId],
          savedAt: new Date().toISOString(),
        };
      }

      console.log('[Writing] Saving feedback map:', {
        key,
        questionIds: Object.keys(newFormat),
        count: Object.keys(newFormat).length
      });

      localStorage.setItem(key, JSON.stringify(newFormat));
    } catch { }
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

      if (Array.isArray(parsed)) {
        this.savedAnswers = parsed
          .map((x: any) => ({
            questionId: Number(x?.questionId),
            answer: String(x?.answer || ''),
          }))
          .filter((x: any) => Number.isFinite(x.questionId));
      } else if (parsed && typeof parsed === 'object') {
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
    } catch { }
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

  onAnswerSubmitted(questionId: number, score: number): void {
    this.totalScore += typeof score === 'number' ? score : 0;
  }

  generateCaption(questionIndex: number): void {
    if (!this.questions || questionIndex >= this.questions.length) return;

    const question = this.questions[questionIndex];
    if (!question.prompt?.referenceImageUrl) {
      this.captions[question.questionId] = '';
      this.captionLoading[question.questionId] = false;
      return;
    }

    this.captionLoading[question.questionId] = true;
    this.pictureCaptioningService
      .GetCaptionOfPicture(question.prompt.referenceImageUrl)
      .subscribe({
        next: (response) => {
          this.captions[question.questionId] =
            response.caption || '';
          this.captionLoading[question.questionId] = false;
        },
        error: (error) => {
          this.captions[question.questionId] = '';
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
                  response.caption || '';
                this.captionLoading[q.questionId] = false;
                console.log(`[Writing] Caption loaded for Q${q.questionId}`);
              },
              error: (error) => {
                this.captions[q.questionId] = '';
                this.captionLoading[q.questionId] = false;
                console.warn(`[Writing] Caption failed for Q${q.questionId}:`, error);
              },
            });
        }
      } else {
        this.captions[q.questionId] = '';
        this.captionLoading[q.questionId] = false;
      }
    }
  }

  nextQuestion(): void {
    if (this.questions && this.currentIndex < this.questions.length - 1) {
      this.currentIndex += 1;
      this.showExplain = false;
      this.isShowHint = false;

      this.cdr.detectChanges();
    } else {
      this.finishExam();
    }
  }

  previousQuestion(): void {
    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
      this.showExplain = false;
      this.isShowHint = false;

      this.cdr.detectChanges();
    }
  }

  navigateToQuestion(index: number): void {
    if (this.questions && index >= 0 && index < this.questions.length) {
      this.currentIndex = index;
      this.showExplain = false;
      this.isShowHint = false;

      this.cdr.detectChanges();

      console.log(
        `[WritingComponent] 📍 Navigated to question index ${index}, questionId: ${this.questions[index].questionId}`
      );
    }
  }

  finishExam(): void {
    if (this.isInMockTest) {
      console.log(
        '[Writing] Writing part completed in mock test - emitting event'
      );
      this.writingPartCompleted.emit();
      return;
    }

    this.isFinished = true;
    this.showExplain = true;
    this.callEndExamAPI();

    this.clearSavedData();

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
        score: this.totalScore,
        status: 'Completed',
      };

      this.examAttemptService.endExam(endExamRequest).subscribe({
        next: (response) => {
          console.log('Exam ended successfully:', response);
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
          this.totalScore += resp.totalScore || 0;
          this.feedbackDone++;
          pending--;
          this.cdr.detectChanges();
          console.log(
            `[WritingComponent] Question ${qid} feedback received, score: ${resp.totalScore}`
          );
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
    const question = this.questions[this.currentIndex];
    // Debug log để kiểm tra stemText
    if (question && !question.stemText) {
      console.log('[Writing] Question stemText is empty:', {
        questionId: question.questionId,
        stemText: question.stemText,
        promptTitle: question.prompt?.title,
        promptContent: question.prompt?.contentText?.substring(0, 50),
      });
    }
    return question;
  }

  getSavedAnswer(questionId: number): string {
    const saved = this.savedAnswers.find((x) => x.questionId === questionId);
    return saved?.answer || '';
  }

  get submittedCount(): number {
    if (!this.questions) return 0;

    // Count from feedbackMap (questions that have been scored)
    try {
      const feedbackMap = this.loadFeedbackMap();
      let count = 0;

      console.log('[Writing] Counting submitted questions:', {
        totalQuestions: this.questions.length,
        feedbackMapKeys: Object.keys(feedbackMap),
      });

      for (const q of this.questions) {
        const qid = String(q.questionId);
        // Check if this question has feedback
        if (feedbackMap[qid]) {
          count++;
        } else if (this.isQuestionSubmitted(q.questionId)) {
          // Also count questions that are submitted but not yet scored
          count++;
        }
      }

      console.log('[Writing] Final submitted count:', count);
      return count;
    } catch {
      // Fallback: count submitted questions only
      return this.questions.filter(q => this.isQuestionSubmitted(q.questionId)).length;
    }
  }

  get percentCorrect(): number {
    const total = this.questions?.length ?? 0;
    if (total === 0) return 0;
    // For Writing, calculate based on submitted questions, not correctCount
    return Math.round((this.submittedCount / total) * 100);
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
    this.sidebarService.showSidebar(); // Hiển thị lại sidebar
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
      // Only clear draft answers, keep feedback and submitted status for displaying results
      if (answersKey) localStorage.removeItem(answersKey);
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
    // Check both old mechanism and new state service
    const stateData = this.questionStates.get(questionId);
    return (
      this.submittingQuestions.has(questionId) || stateData?.state === 'scoring'
    );
  }

  isAnyQuestionSubmitting(): boolean {
    // Check both old mechanism and new state service
    if (this.submittingQuestions.size > 0) return true;

    for (const state of this.questionStates.values()) {
      if (state.state === 'scoring') return true;
    }
    return false;
  }

  /**
   * Check if a question has feedback (đã chấm xong)
   * Trạng thái này chỉ áp dụng cho Speaking và Writing
   */
  hasQuestionFeedback(questionId: number): boolean {
    // Check state service first, then fallback to localStorage
    const stateData = this.questionStates.get(questionId);
    if (stateData?.state === 'scored' && stateData.feedback) {
      return true;
    }

    try {
      const feedbackMap = this.loadFeedbackMap();
      return !!feedbackMap[String(questionId)];
    } catch {
      return false;
    }
  }

  onSubmitStart(questionId: number): void {
    this.submittingQuestions.add(questionId);
    // Force change detection để Navigator cập nhật trạng thái ngay
    this.cdr.detectChanges();
    console.log(`[WritingComponent] Question ${questionId} submitting started`);
  }

  onSubmitEnd(questionId: number): void {
    this.submittingQuestions.delete(questionId);
    // Force change detection để Navigator cập nhật trạng thái ngay
    this.cdr.detectChanges();
    console.log(
      `[WritingComponent] 🟣 Question ${questionId} submitting ended`
    );
  }

  finishWritingExam(): void {
    const totalQuestions = this.questions?.length || 0;

    // Nếu trong mock test, trực tiếp finish mà KHÔNG check
    if (this.isInMockTest) {
      this.finishExam();
      return;
    }

    // Chỉ check questions in progress khi thi standalone
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

    // Nếu thi standalone, hiển thị confirm như cũ
    this.showPopup = true;
    this.popupTitle = 'Xác nhận nộp bài';
    this.popupMessage =
      'Bạn có chắc chắn muốn nộp bài thi Writing không?\n\nSố câu đã nộp: ' +
      submittedCount +
      '/' +
      totalQuestions;
    this.popupOkHandler = () => {
      this.showPopup = false;
      this.finishExam();
    };
    this.popupCancelHandler = () => {
      this.showPopup = false;
    };
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (!this.isFinished && this.attemptId) {
      $event.returnValue = 'Dữ liệu nháp sẽ bị mất. Bạn có chắc muốn thoát?';
    }
  }

  confirmExit(): void {
    this.showPopup = true;
    this.popupTitle = 'Xác nhận thoát';
    this.popupMessage =
      'Bạn có chắc chắn muốn thoát?\n\n⚠️ Dữ liệu nháp sẽ KHÔNG được lưu lại.';
    this.popupOkHandler = () => {
      this.showPopup = false;
      this.exitWithoutSaving();
    };
    this.popupCancelHandler = () => {
      this.showPopup = false;
    };
  }

  private exitWithoutSaving(): void {
    this.clearAllWritingData();
    this.router.navigate(['homepage/user-dashboard/exams']);
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

  // Open teacher contact modal
  openTeacherModal(): void {
    this.showTeacherModal = true;
  }

  // Close teacher contact modal
  closeTeacherModal(): void {
    this.showTeacherModal = false;
  }
}
