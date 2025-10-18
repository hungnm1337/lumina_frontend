import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../Services/Auth/auth.service';
import { BaseQuestionService } from '../../../../Services/Question/base-question.service';
import { WritingRequestDTO } from '../../../../Interfaces/WrittingExam/WritingRequestDTO.interface';
import { FeedbackComponent } from '../../writing-answer-box/Feedback/feedback/feedback.component';
import { WritingResponseDTO } from '../../../../Interfaces/WrittingExam/WritingResponseDTO.interface';
import { WritingExamPartOneService } from '../../../../Services/Exam/Writing/writing-exam-part-one.service';
import {
  ExamPartDTO,
  QuestionDTO,
} from '../../../../Interfaces/exam.interfaces';
import { TimeComponent } from '../../time/time.component';
import { PromptComponent } from '../../prompt/prompt.component';

@Component({
  selector: 'app-writing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TimeComponent,
    PromptComponent,
  ],
  templateUrl: './writing.component.html',
  styleUrl: './writing.component.scss',
})
export class WritingComponent implements OnChanges, OnInit, OnDestroy {
  @Input() questions: QuestionDTO[] = [];
  @Input() partInfo: ExamPartDTO | null = null;
  @Output() writingAnswered = new EventEmitter<boolean>();

  // Legacy inputs for backward compatibility
  @Input() questionId: number = 0;
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Input() contentText: string | undefined;
  @Input() pictureCaption: string | undefined;
  @Output() answered = new EventEmitter<boolean>();

  // State management
  currentIndex = 0;
  showExplain = false;
  totalScore = 0;
  correctCount = 0;
  finished = false;
  latestPictureCaption: string = '';
  private advanceTimer: any = null;

  // Writing-specific properties
  feedbackResponse: WritingResponseDTO | null = null;
  writingRequest: WritingRequestDTO | undefined;
  userAnswer: string = '';
  isLoadingFeedback: boolean = false;
  private autoSaveInterval: any = null;
  private readonly AUTO_SAVE_INTERVAL = 10000; // 10 seconds

  constructor(
    private router: Router,
    private authService: AuthService,
    private baseQuestionService: BaseQuestionService,
    private writingExamPartOneService: WritingExamPartOneService
  ) {
    this.startAutoSave();
  }
  ngOnInit(): void {
    this.loadSavedAnswer();
  }

  ngOnDestroy(): void {
    this.stopAutoSave();
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions'] && this.questions && this.questions.length > 0) {
      console.log('✅ WritingComponent - Questions changed:', this.questions);
      console.log(
        '✅ WritingComponent - Questions length:',
        this.questions.length
      );

      // ✅ Debug từng câu hỏi
      this.questions.forEach((q, index) => {
        console.log(`Question ${index}:`, {
          questionId: q.questionId,
          stemText: q.stemText,
          questionType: q.questionType,
          hasPrompt: !!q.prompt,
          promptContentText: q.prompt?.contentText,
          promptTitle: q.prompt?.title,
        });
      });

      this.resetQuiz();
    }

    if (changes['resetAt'] || changes['questionId']) {
      this.loadSavedAnswer();
      this.feedbackResponse = null;
      this.isLoadingFeedback = false;
    }
  }

  // Navigation methods
  markAnswered(isCorrect: boolean): void {
    if (isCorrect) {
      const q = this.questions[this.currentIndex];
      this.totalScore += q?.scoreWeight ?? 0;
      this.correctCount += 1;
    }
    this.revealExplainAndQueueNext();
  }

  onTimeout(): void {
    this.showExplain = true;
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
    }
  }

  next(): void {
    if (this.finished) return;
    if (this.currentIndex >= this.questions.length - 1) {
      this.finished = true;
      this.showExplain = true;
      return;
    }
    this.nextQuestion();
  }

  private nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex += 1;
      this.showExplain = false;
      this.latestPictureCaption = '';
      this.feedbackResponse = null;
      this.isLoadingFeedback = false;
      this.loadSavedAnswer();
    } else {
      this.showExplain = true;
      this.finished = true;
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
    }, 300000); // 5 minutes auto-advance
  }

  // Legacy support
  onWritingAnswered(isCorrect: boolean): void {
    this.markAnswered(isCorrect);
    this.writingAnswered.emit(isCorrect);
    this.answered.emit(isCorrect);
  }

  // LocalStorage methods
  private getStorageKey(): string | null {
    const userId = this.authService.getCurrentUser()?.id;
    if (userId === undefined || userId === null) return null;
    return `Answer_Writting_${userId}`;
  }

  private loadSavedAnswer(): void {
    try {
      const key = this.getStorageKey();
      if (!key) return;

      const raw = localStorage.getItem(key);
      if (!raw) return;

      const savedAnswers = JSON.parse(raw);
      if (savedAnswers && typeof savedAnswers === 'object') {
        const currentQuestionId =
          this.questions[this.currentIndex]?.questionId || this.questionId;
        this.userAnswer = savedAnswers[currentQuestionId] || '';
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
      let savedAnswers: Record<string, string> = {};

      if (raw) {
        try {
          savedAnswers = JSON.parse(raw);
        } catch {
          savedAnswers = {};
        }
      }

      const currentQuestionId =
        this.questions[this.currentIndex]?.questionId || this.questionId;
      savedAnswers[currentQuestionId] = this.userAnswer;
      localStorage.setItem(key, JSON.stringify(savedAnswers));
    } catch {
      // Best-effort only; ignore storage errors
    }
  }

  onAnswerChange(): void {
    // No auto-save on typing - only manual save and 10s interval
  }

  onSubmit(): void {
    if (this.disabled || !this.userAnswer.trim()) return;
    const currentQuestion = this.questions[this.currentIndex];
    const vocabularyRequest =
      currentQuestion?.prompt?.contentText || this.contentText || '';
    const pictureCaption =
      this.latestPictureCaption || this.pictureCaption || '';

    this.writingRequest = {
      pictureCaption: pictureCaption,
      vocabularyRequest: vocabularyRequest,
      userAnswer: this.userAnswer,
    };

    console.log('WritingRequestDTO:', this.writingRequest);

    this.isLoadingFeedback = true;
    this.writingExamPartOneService
      .GetFeedbackOfWritingPartOne(this.writingRequest)
      .subscribe({
        next: (response: WritingResponseDTO) => {
          this.feedbackResponse = response;
          console.log('WritingFeedbackResponseDTO:', response);
          this.isLoadingFeedback = false;
          this.markAnswered(true); // Assume correct for now
        },
        error: (error: any) => {
          console.error('Error fetching writing feedback:', error);
          this.isLoadingFeedback = false;
          this.markAnswered(false);
        },
      });
  }

  onSave(): void {
    this.saveAnswer();
  }

  private startAutoSave(): void {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(() => {
      this.saveAnswer();
    }, this.AUTO_SAVE_INTERVAL);
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // Summary helpers
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

  // Actions
  resetQuiz(): void {
    this.currentIndex = 0;
    this.showExplain = false;
    this.totalScore = 0;
    this.correctCount = 0;
    this.finished = false;
    this.latestPictureCaption = '';
    this.feedbackResponse = null;
    this.isLoadingFeedback = false;
  }

  goToExams(): void {
    this.router.navigate(['homepage/user-dashboard/exams']);
  }

  onPictureCaption(caption: string): void {
    this.latestPictureCaption = caption || '';
  }
}
