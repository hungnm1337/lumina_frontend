import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../Services/Auth/auth.service';
import { WritingRequestP1DTO } from '../../../Interfaces/WrittingExam/WritingRequestP1DTO.interface';
import { WritingResponseDTO } from '../../../Interfaces/WrittingExam/WritingResponseDTO.interface';
import { WritingAnswerRequestDTO } from '../../../Interfaces/WritingAnswer/WritingAnswerRequestDTO.interface';
import { ToastService } from '../../../Services/Toast/toast.service';
import { FeedbackComponent } from './Feedback/feedback/feedback.component';
import { WritingExamPartOneService } from '../../../Services/Exam/Writing/writing-exam.service';
import { ExamAttemptService } from '../../../Services/ExamAttempt/exam-attempt.service';
import { forkJoin } from 'rxjs';
import { WritingRequestP23DTO } from '../../../Interfaces/WrittingExam/WritingRequestP23DTO.interface';
import { WritingQuestionStateService } from '../../../Services/Exam/Writing/writing-question-state.service';
@Component({
  selector: 'app-writing-answer-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './writing-answer-box.component.html',
  styleUrl: './writing-answer-box.component.scss',
})
export class WritingAnswerBoxComponent implements OnInit, OnChanges, OnDestroy {
  @Input() questionId: number = 0;
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Input() contentText: string | undefined;
  @Input() pictureCaption: string | undefined;
  @Output() answered = new EventEmitter<boolean>();
  @Output() answerChange = new EventEmitter<{
    questionId: number;
    answer: string;
  }>();
  @Output() submitStart = new EventEmitter<number>(); // ✅ Emit when submission starts
  @Output() submitEnd = new EventEmitter<number>(); // ✅ Emit when submission ends

  writingRequest: WritingRequestP1DTO | undefined;
  userAnswer: string = '';
  isLoadingFeedback: boolean = false;

  // ✅ Track which questionId this component is currently displaying
  private currentDisplayedQuestionId: number = 0;

  // ✅ Track if THIS specific question is being actively submitted by THIS component instance
  private isActivelySubmitting: boolean = false;

  // ✅ Cache submitted status to avoid repeated localStorage reads
  private _isSubmittedCache: boolean = false;
  private _isSubmittedCacheQuestionId: number = -1;

  constructor(
    private authService: AuthService,
    private writingExamPartOneService: WritingExamPartOneService,
    private toast: ToastService,
    private examAttemptService: ExamAttemptService,
    private writingStateService: WritingQuestionStateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentDisplayedQuestionId = this.questionId;
    this.writingStateService.initializeQuestion(this.questionId);
    this.loadQuestionData();
    this._checkAndCacheSubmittedStatus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questionId'] && !changes['questionId'].firstChange) {
      // Question changed - sync state
      const oldId = changes['questionId'].previousValue;
      const newId = changes['questionId'].currentValue;

      console.log(`[WritingAnswerBox] 🔄 Question changed: ${oldId} -> ${newId}`);

      // ✅ IMPORTANT: Reset flags and answer FIRST before loading data
      this.isActivelySubmitting = false;
      this.isLoadingFeedback = false;
      this.userAnswer = ''; // Clear answer immediately for instant UI update

      this.currentDisplayedQuestionId = newId;
      this.writingStateService.initializeQuestion(newId);

      // ✅ Reset cache for new question
      this._isSubmittedCacheQuestionId = -1;
      this._checkAndCacheSubmittedStatus();

      // ✅ Force immediate change detection to show blank/loading state
      this.cdr.detectChanges();

      // ✅ Use setTimeout to load actual data without blocking
      // This allows navigation to complete instantly
      setTimeout(() => {
        this.loadQuestionData();
        this.cdr.detectChanges();
        console.log(`[WritingAnswerBox] ✅ Data loaded for question ${newId}`);
      }, 0);
    }

    if (changes['resetAt']) {
      this.loadQuestionData();
      this.cdr.detectChanges();
    }
  }

  private loadQuestionData(): void {
    // Try to load from state service first
    const savedState = this.writingStateService.getQuestionState(
      this.questionId
    );

    if (savedState && savedState.userAnswer) {
      // Has data in state service - use it
      this.userAnswer = savedState.userAnswer;
      console.log('[WritingAnswerBox] Loaded answer from state service:', {
        questionId: this.questionId,
        answerLength: savedState.userAnswer.length,
        state: savedState.state,
      });
    } else {
      // No data in state service - try localStorage
      this.loadSavedAnswer();
      console.log('[WritingAnswerBox] Loaded answer from localStorage:', {
        questionId: this.questionId,
        answerLength: this.userAnswer.length,
      });
    }
  }

  private restoreStateFromService(): void {
    const savedState = this.writingStateService.getQuestionState(
      this.questionId
    );
    if (savedState) {
      this.userAnswer = savedState.userAnswer;

      console.log('[WritingAnswerBox] Restored state from service:', {
        questionId: this.questionId,
        state: savedState.state,
        hasAnswer: !!savedState.userAnswer,
        hasFeedback: !!savedState.feedback,
      });
    }
  }

  ngOnDestroy(): void {
    // Component cleanup - auto-save is handled by parent WritingComponent
  }

  private getStorageKey(): string | null {
    localStorage.getItem('currentExamAttempt');
    const attemptId = this.getAttemptIdFromLocalStorage();
    if (attemptId === undefined || attemptId === null) return null;
    return `Answer_Writting_${attemptId}`;
  }

  private getSubmittedStorageKey(): string | null {
    const attemptId = this.getAttemptIdFromLocalStorage();
    if (attemptId === undefined || attemptId === null) return null;
    return `Submitted_Writting_${attemptId}`;
  }

  // ✅ Cache submitted status to avoid repeated localStorage access
  private _checkAndCacheSubmittedStatus(): void {
    if (this._isSubmittedCacheQuestionId === this.questionId) {
      return; // Already cached for this question
    }

    try {
      const key = this.getSubmittedStorageKey();
      if (!key) {
        this._isSubmittedCache = false;
        this._isSubmittedCacheQuestionId = this.questionId;
        return;
      }

      const raw = localStorage.getItem(key);
      if (!raw) {
        this._isSubmittedCache = false;
        this._isSubmittedCacheQuestionId = this.questionId;
        return;
      }

      const submittedQuestions = JSON.parse(raw);
      if (submittedQuestions && typeof submittedQuestions === 'object') {
        this._isSubmittedCache =
          submittedQuestions[String(this.questionId)] === true;
        this._isSubmittedCacheQuestionId = this.questionId;
      } else {
        this._isSubmittedCache = false;
        this._isSubmittedCacheQuestionId = this.questionId;
      }
    } catch {
      this._isSubmittedCache = false;
      this._isSubmittedCacheQuestionId = this.questionId;
    }
  }

  isQuestionSubmitted(): boolean {
    // Use cached value if available for current question
    if (this._isSubmittedCacheQuestionId === this.questionId) {
      return this._isSubmittedCache;
    }

    // Otherwise, check and cache
    this._checkAndCacheSubmittedStatus();
    return this._isSubmittedCache;
  }

  private markQuestionAsSubmitted(questionId: number): void {
    try {
      const key = this.getSubmittedStorageKey();
      if (!key) return;

      const raw = localStorage.getItem(key);
      let submittedQuestions: Record<string, boolean> = {};

      if (raw) {
        try {
          submittedQuestions = JSON.parse(raw);
        } catch {
          submittedQuestions = {};
        }
      }

      submittedQuestions[String(questionId)] = true;
      localStorage.setItem(key, JSON.stringify(submittedQuestions));

      // ✅ Update cache
      this._isSubmittedCache = true;
      this._isSubmittedCacheQuestionId = questionId;
    } catch {
      // Best-effort only; ignore storage errors
    }
  }

  private loadSavedAnswer(): void {
    try {
      const key = this.getStorageKey();
      if (!key) return;

      const raw = localStorage.getItem(key);
      if (!raw) return;

      const savedAnswers = JSON.parse(raw);
      if (savedAnswers && typeof savedAnswers === 'object') {
        const answerData = savedAnswers[String(this.questionId)];
        if (answerData && typeof answerData === 'object') {
          // New format: {questionId, answer}
          this.userAnswer = answerData.answer || '';
        } else if (typeof answerData === 'string') {
          // Old format: just string
          this.userAnswer = answerData;
        } else {
          this.userAnswer = '';
        }
      }
    } catch {
      this.userAnswer = '';
    }
  }

  private saveAnswer(): void {
    try {
      const key = this.getStorageKey();
      if (!key) return;

      const raw = localStorage.getItem(key);
      let savedAnswers: Record<string, any> = {};

      if (raw) {
        try {
          savedAnswers = JSON.parse(raw);
        } catch {
          savedAnswers = {};
        }
      }

      // Save with questionId included
      savedAnswers[String(this.questionId)] = {
        questionId: this.questionId,
        answer: this.userAnswer,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(savedAnswers));

      // ✅ Also save to state service
      this.writingStateService.saveAnswer(this.questionId, this.userAnswer);

      console.log('💾 Saved answer for question:', this.questionId);
    } catch {
      // Best-effort only; ignore storage errors
    }
  }

  onAnswerChange(): void {
    // ✅ Update state service when answer changes
    this.writingStateService.saveAnswer(this.questionId, this.userAnswer);

    // Emit answer change event for parent component
    this.answerChange.emit({
      questionId: this.questionId,
      answer: this.userAnswer,
    });
  }

  onSubmit(): void {
    this.onSave();
    if (this.disabled || !this.userAnswer.trim() || this.isQuestionSubmitted())
      return;

    const attemptId = this.getAttemptIdFromLocalStorage();
    if (!attemptId) {
      this.toast.error('Exam information not found');
      return;
    }

    // ✅ Get part code
    const partCodeRaw = localStorage.getItem('PartCodeStorage');
    const partCode = Number(partCodeRaw) || 1;

    // ✅ CRITICAL FIX: Capture questionId and displayIndex at submit time
    // Don't rely on component state when async callback runs
    const submittedQuestionId = this.questionId;
    const submittedDisplayIndex = (this.resetAt || 0) + 1;

    // ✅ Mark as actively submitting by THIS component
    this.isActivelySubmitting = true;
    this.isLoadingFeedback = true;
    this.submitStart.emit(submittedQuestionId);

    console.log(
      `[WritingAnswerBox] 🚀 Submitting question ${submittedQuestionId} via state service`
    );

    // ✅ Use state service for parallel scoring
    this.writingStateService
      .submitAnswerAndStore(
        submittedQuestionId,
        this.userAnswer,
        attemptId,
        partCode,
        this.contentText,
        this.pictureCaption
      )
      .then((feedback) => {
        console.log(
          `[WritingAnswerBox] ✅ Question ${submittedQuestionId} scored successfully`
        );

        // Save feedback to localStorage for backward compatibility
        this.saveFeedbackToLocalStorage(submittedQuestionId, feedback);

        // Mark as submitted - use captured questionId
        this.markQuestionAsSubmitted(submittedQuestionId);

        // ✅ Only clear loading if still on this question
        if (this.currentDisplayedQuestionId === submittedQuestionId) {
          this.isLoadingFeedback = false;
        }
        this.isActivelySubmitting = false;
        this.submitEnd.emit(submittedQuestionId);

        // ✅ Show success message with captured displayIndex
        this.toast.success(`Nộp câu thành công (Câu ${submittedDisplayIndex})`);

        // Emit event
        this.answered.emit(true);
      })
      .catch((error) => {
        console.error(
          `[WritingAnswerBox] ❌ Question ${submittedQuestionId} submission failed:`,
          error
        );

        // ✅ Only clear loading if still on this question
        if (this.currentDisplayedQuestionId === submittedQuestionId) {
          this.isLoadingFeedback = false;
        }
        this.isActivelySubmitting = false;
        this.submitEnd.emit(submittedQuestionId);

        this.toast.error('Lỗi khi chấm bài. Vui lòng thử lại!');
      });
  }

  onSave(): void {
    if (this.isQuestionSubmitted()) return;
    this.saveAnswer();
  }

  private getAttemptIdFromLocalStorage(): number | null {
    try {
      const raw = localStorage.getItem('currentExamAttempt');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const id = parsed?.attemptID ?? parsed?.attemptId;
      return typeof id === 'number' ? id : Number(id) || null;
    } catch {
      return null;
    }
  }

  private getFeedbackStorageKey(): string | null {
    //lấy attempt id
    localStorage.getItem('currentExamAttempt');
    const attemptId = this.getAttemptIdFromLocalStorage();
    return `Writing_Feedback_${attemptId}`;
  }

  private saveFeedbackToLocalStorage(
    questionId: number,
    feedback: WritingResponseDTO
  ): void {
    try {
      const key = this.getFeedbackStorageKey();
      if (!key) return;
      const raw = localStorage.getItem(key);
      let map: Record<string, any> = {};
      if (raw) {
        try {
          map = JSON.parse(raw);
        } catch {
          map = {};
        }
      }

      // Save with questionId included
      map[String(questionId)] = {
        questionId: questionId,
        feedback: feedback,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(map));

      console.log('💾 Saved feedback for question:', questionId);
    } catch {
      // ignore storage error
    }
  }
}
