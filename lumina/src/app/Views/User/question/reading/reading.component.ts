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
import { Router } from '@angular/router';
import { OptionsComponent } from '../../options/options.component';
import { TimeComponent } from '../../time/time.component';
import { PromptComponent } from '../../prompt/prompt.component';
import { AuthService } from '../../../../Services/Auth/auth.service';
import { BaseQuestionService } from '../../../../Services/Question/base-question.service';
import {
  OptionDTO,
  ExamPartDTO,
  QuestionDTO,
} from '../../../../Interfaces/exam.interfaces';

@Component({
  selector: 'app-reading',
  standalone: true,
  imports: [CommonModule, OptionsComponent, TimeComponent, PromptComponent],
  templateUrl: './reading.component.html',
  styleUrl: './reading.component.scss',
})
export class ReadingComponent implements OnChanges, OnInit, OnDestroy {
  @Input() questions: QuestionDTO[] = [];
  @Input() partInfo: ExamPartDTO | null = null;
  @Output() readingAnswered = new EventEmitter<boolean>();

  // Legacy inputs for backward compatibility
  @Input() options: OptionDTO[] = [];
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Output() answered = new EventEmitter<boolean>();

  // State management
  currentIndex = 0;
  showExplain = false;
  totalScore = 0;
  correctCount = 0;
  finished = false;
  savedAnswers: { questionId: number; optionId: number }[] = [];
  latestPictureCaption: string = '';
  private advanceTimer: any = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private baseQuestionService: BaseQuestionService
  ) {}

  ngOnInit(): void {
    this.loadSavedAnswers();
  }

  ngOnDestroy(): void {
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions'] && this.questions && this.questions.length > 0) {
      console.log('ReadingComponent - Questions changed:', this.questions);
      console.log(
        'ReadingComponent - Questions length:',
        this.questions.length
      );
      this.resetQuiz();
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
      this.loadSavedAnswers();
      return;
    }
    this.nextQuestion();
  }

  private nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex += 1;
      this.showExplain = false;
      this.latestPictureCaption = '';
    } else {
      this.showExplain = true;
      this.loadSavedAnswers();
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
  onAnswered(isCorrect: boolean): void {
    this.markAnswered(isCorrect);
    this.readingAnswered.emit(isCorrect);
    this.answered.emit(isCorrect);
  }

  // LocalStorage methods
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

  isAnswerOptionCorrect(questionId: number, optionId: number): boolean | null {
    const q = this.questions.find((x) => x.questionId === questionId);
    if (!q) return null;
    const opt = q.options?.find((o) => o.optionId === optionId);
    if (!opt || typeof opt.isCorrect !== 'boolean') return null;
    return opt.isCorrect === true;
  }

  // Actions
  resetQuiz(): void {
    this.currentIndex = 0;
    this.showExplain = false;
    this.totalScore = 0;
    this.correctCount = 0;
    this.finished = false;
    this.latestPictureCaption = '';
  }

  goToExams(): void {
    this.router.navigate(['homepage/user-dashboard/exams']);
  }

  onPictureCaption(caption: string): void {
    this.latestPictureCaption = caption || '';
  }
}
