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
  styleUrls: ['./writing-answer-box.component.scss'],
})
export class WritingAnswerBoxComponent implements OnInit, OnChanges, OnDestroy {
  @Input() questionId: number = 0;
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Input() contentText: string | undefined;
  @Input() pictureCaption: string | undefined;
  @Output() answered = new EventEmitter<number>();
  @Output() answerChange = new EventEmitter<{
    questionId: number;
    answer: string;
  }>();
  @Output() submitStart = new EventEmitter<number>();
  @Output() submitEnd = new EventEmitter<number>();

  writingRequest: WritingRequestP1DTO | undefined;
  userAnswer: string = '';
  isLoadingFeedback: boolean = false;

  private currentDisplayedQuestionId: number = 0;

  private isActivelySubmitting: boolean = false;

  private _isSubmittedCache: boolean = false;
  private _isSubmittedCacheQuestionId: number = -1;

  constructor(
    private authService: AuthService,
    private writingExamPartOneService: WritingExamPartOneService,
    private toast: ToastService,
    private examAttemptService: ExamAttemptService,
    private writingStateService: WritingQuestionStateService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.currentDisplayedQuestionId = this.questionId;
    this.writingStateService.initializeQuestion(this.questionId);
    this.loadQuestionData();
    this._checkAndCacheSubmittedStatus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questionId'] && !changes['questionId'].firstChange) {
      const oldId = changes['questionId'].previousValue;
      const newId = changes['questionId'].currentValue;

      this.isActivelySubmitting = false;
      this.isLoadingFeedback = false;
      this.userAnswer = '';

      this.currentDisplayedQuestionId = newId;
      this.writingStateService.initializeQuestion(newId);

      this._isSubmittedCacheQuestionId = -1;
      this._checkAndCacheSubmittedStatus();

      this.cdr.detectChanges();

      setTimeout(() => {
        this.loadQuestionData();
        this.cdr.detectChanges();
      }, 0);
    }

    if (changes['resetAt']) {
      this.loadQuestionData();
      this.cdr.detectChanges();
    }
  }

  private loadQuestionData(): void {
    const savedState = this.writingStateService.getQuestionState(
      this.questionId
    );

    if (savedState && savedState.userAnswer) {
      this.userAnswer = savedState.userAnswer;
    } else {
      this.loadSavedAnswer();
    }
  }

  private restoreStateFromService(): void {
    const savedState = this.writingStateService.getQuestionState(
      this.questionId
    );
    if (savedState) {
      this.userAnswer = savedState.userAnswer;
    }
  }

  ngOnDestroy(): void {
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

  private _checkAndCacheSubmittedStatus(): void {
    if (this._isSubmittedCacheQuestionId === this.questionId) {
      return;
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
    if (this._isSubmittedCacheQuestionId === this.questionId) {
      return this._isSubmittedCache;
    }

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

      this._isSubmittedCache = true;
      this._isSubmittedCacheQuestionId = questionId;
    } catch {
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
          this.userAnswer = answerData.answer || '';
        } else if (typeof answerData === 'string') {
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

      savedAnswers[String(this.questionId)] = {
        questionId: this.questionId,
        answer: this.userAnswer,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(savedAnswers));

      this.writingStateService.saveAnswer(this.questionId, this.userAnswer);
    } catch {
    }
  }

  onAnswerChange(): void {
    this.writingStateService.saveAnswer(this.questionId, this.userAnswer);

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

    const partCodeRaw = localStorage.getItem('PartCodeStorage');
    const partCode = Number(partCodeRaw) || 1;

    const submittedQuestionId = this.questionId;
    const submittedDisplayIndex = (this.resetAt || 0) + 1;

    // ✅ Get caption if available, use empty string if still loading or undefined
    const currentCaption = this.pictureCaption || '';

    // ✅ Log warning if caption is not available but allow submission to proceed
    if (!this.pictureCaption) {
      console.warn(
        `[WritingAnswerBox] Caption not available for Q${this.questionId}, submitting with empty caption`
      );
    }

    this.isActivelySubmitting = true;
    this.isLoadingFeedback = true;
    this.submitStart.emit(submittedQuestionId);
    this.writingStateService
      .submitAnswerAndStore(
        submittedQuestionId,
        this.userAnswer,
        attemptId,
        partCode,
        this.contentText,
        currentCaption  // ✅ Use current caption or empty string
      )
      .then((feedback) => {
        this.saveFeedbackToLocalStorage(submittedQuestionId, feedback);

        this.markQuestionAsSubmitted(submittedQuestionId);

        if (this.currentDisplayedQuestionId === submittedQuestionId) {
          this.isLoadingFeedback = false;
        }
        this.isActivelySubmitting = false;
        this.submitEnd.emit(submittedQuestionId);

        this.toast.success(`Nộp câu thành công (Câu ${submittedDisplayIndex})`);

        const score = feedback?.totalScore ?? 0;
        this.answered.emit(score);
      })
      .catch((error) => {
        if (this.currentDisplayedQuestionId === submittedQuestionId) {
          this.isLoadingFeedback = false;
        }
        this.isActivelySubmitting = false;
        this.submitEnd.emit(submittedQuestionId);

        // ✅ Improved error message with more context
        const errorMsg = error?.message || 'Lỗi khi chấm bài';
        console.error('[WritingAnswerBox] Submission error:', {
          questionId: submittedQuestionId,
          error: error,
          hasCaption: !!currentCaption,
          hasAnswer: !!this.userAnswer
        });
        this.toast.error(`${errorMsg}. Vui lòng thử lại!`);
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

      map[String(questionId)] = {
        questionId: questionId,
        feedback: feedback,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(map));
    } catch {
    }
  }
}
