import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../Services/Auth/auth.service';
import { WritingExamPartOneService } from '../../../../Services/Exam/Writing/writing-exam-part-one.service';
import { QuestionDTO } from '../../../../Interfaces/exam.interfaces';
import { Router } from '@angular/router';
import { WritingAnswerBoxComponent } from "../../writing-answer-box/writing-answer-box.component";
import { TimeComponent } from '../../time/time.component';
import { PictureCaptioningService } from '../../../../Services/PictureCaptioning/picture-captioning.service';

@Component({
  selector: 'app-writing',
  standalone: true,
  imports: [CommonModule, FormsModule, WritingAnswerBoxComponent, TimeComponent],
  templateUrl: './writing.component.html',
  styleUrl: './writing.component.scss',
})
export class WritingComponent implements OnChanges, OnDestroy, OnInit {

  @Input() questions: QuestionDTO[] | null = null;
  @Output() finished = new EventEmitter<void>();

  isShowHint: boolean = false;
  currentIndex = 0;
  pictureCaption: string = '';
  isLoading: boolean = false;
  showExplain = false;
  isFinished = false;
  totalScore = 0;
  correctCount = 0;
  savedAnswers: { questionId: number; answer: string }[] = [];
  savedTimeRemaining: number = 0;
  private autoSaveInterval: any = null;
  private readonly AUTO_SAVE_INTERVAL = 10000; // 10 seconds

  constructor(
    private router: Router,
    private authService: AuthService,
    private writingExamPartOneService: WritingExamPartOneService,
    private pictureCaptioningService: PictureCaptioningService

  ) {
    this.startAutoSave();
  }

   showHint() {
    this.isShowHint = !this.isShowHint;
  }
  ngOnInit(): void {
    this.loadSavedData();
    // Load caption for the first question
    if (this.questions && this.questions.length > 0) {
      this.generateCaption(this.currentIndex);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['questions'] && this.questions) {
      console.log('WritingComponent - Questions changed:', this.questions);
      this.loadSavedData();
      // Load caption for the current question when questions change
      this.generateCaption(this.currentIndex);
    }
  }

  ngOnDestroy(): void {
    this.stopAutoSave();
    this.saveCurrentState();
  }

  private getStorageKey(): string | null {
    const userId = this.authService.getCurrentUser()?.id;
    if (userId === undefined || userId === null) return null;
    return `Writing_Exam_${userId}`;
  }

  private getTimeStorageKey(): string | null {
    const userId = this.authService.getCurrentUser()?.id;
    if (userId === undefined || userId === null) return null;
    return `Writing_Time_${userId}`;
  }

  private getTimeStorageKeyForQuestion(questionId: number): string | null {
    const userId = this.authService.getCurrentUser()?.id;
    if (userId === undefined || userId === null) return null;
    return `Writing_Time_${userId}_Q${questionId}`;
  }

  private loadSavedData(): void {
    this.loadSavedAnswers();
    this.loadSavedTime();
    this.initializeTimeForFirstQuestion();
  }

  private initializeTimeForFirstQuestion(): void {
    // Initialize time for first question if no saved time exists
    if (this.questions && this.questions.length > 0) {
      this.loadTimeForCurrentQuestion();
    }
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
      } else {
        this.savedAnswers = [];
      }
    } catch {
      this.savedAnswers = [];
    }
  }

  private loadSavedTime(): void {
    try {
      // First try to load time for current question
      const currentQuestion = this.getCurrentQuestion();
      if (currentQuestion) {
        const questionKey = this.getTimeStorageKeyForQuestion(currentQuestion.questionId);
        if (questionKey) {
          const raw = localStorage.getItem(questionKey);
          if (raw) {
            this.savedTimeRemaining = Number(raw) || 0;
            console.log('[WritingComponent] Loaded saved time for question:', currentQuestion.questionId, this.savedTimeRemaining);
            return;
          }
        }
      }

      // Fallback to general time storage
      const key = this.getTimeStorageKey();
      if (!key) return;
      const raw = localStorage.getItem(key);
      if (raw) {
        this.savedTimeRemaining = Number(raw) || 0;
        console.log('[WritingComponent] Loaded saved time:', this.savedTimeRemaining);
      }
    } catch {
      this.savedTimeRemaining = 0;
    }
  }

  private saveCurrentState(): void {
    this.saveAnswers();
    this.saveTime();
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

  private saveTime(): void {
    try {
      // Save time for current question
      const currentQuestion = this.getCurrentQuestion();
      if (currentQuestion) {
        const questionKey = this.getTimeStorageKeyForQuestion(currentQuestion.questionId);
        if (questionKey) {
          localStorage.setItem(questionKey, this.savedTimeRemaining.toString());
          console.log('[WritingComponent] Saved time for question:', currentQuestion.questionId, this.savedTimeRemaining);
        }
      }

      // Also save general time
      const key = this.getTimeStorageKey();
      if (!key) return;
      localStorage.setItem(key, this.savedTimeRemaining.toString());
      console.log('[WritingComponent] Saved time:', this.savedTimeRemaining);
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
    console.log('[WritingComponent] Timer timeout');
    this.showExplain = true;
    this.finishExam();
  }

  onTimeUpdate(remainingTime: number): void {
    this.savedTimeRemaining = remainingTime;
  }

  onAnswerChange(questionId: number, answer: string): void {
    const existingIndex = this.savedAnswers.findIndex(x => x.questionId === questionId);
    if (existingIndex >= 0) {
      this.savedAnswers[existingIndex].answer = answer;
    } else {
      this.savedAnswers.push({ questionId, answer });
    }
  }

  onAnswerSubmitted(questionId: number, isCorrect: boolean): void {
    if (isCorrect) {
      const question = this.questions?.find(q => q.questionId === questionId);
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
      this.pictureCaption = '';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;

    this.pictureCaptioningService.GetCaptionOfPicture(question.prompt.referenceImageUrl)
      .subscribe({
        next: (response) => {
          this.pictureCaption = response.caption || '';
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error generating caption:', error);
          this.pictureCaption = '';
          this.isLoading = false;
        }
      });
  }

  nextQuestion(): void {
    if (this.questions && this.currentIndex < this.questions.length - 1) {
      this.currentIndex += 1;
      this.showExplain = false;
      this.pictureCaption = '';
      this.loadTimeForCurrentQuestion();
      this.generateCaption(this.currentIndex);
    } else {
      this.finishExam();
    }
  }

  previousQuestion(): void {
    if (this.currentIndex > 0) {
      this.currentIndex -= 1;
      this.showExplain = false;
      this.pictureCaption = '';
      this.loadTimeForCurrentQuestion();
      this.generateCaption(this.currentIndex);
    }
  }

  navigateToQuestion(index: number): void {
    if (this.questions && index >= 0 && index < this.questions.length) {
      this.currentIndex = index;
      this.showExplain = false;
      this.pictureCaption = '';
      this.loadTimeForCurrentQuestion();
      this.generateCaption(this.currentIndex);
    }
  }

  private loadTimeForCurrentQuestion(): void {
    const currentQuestion = this.getCurrentQuestion();
    if (currentQuestion) {
      const questionKey = this.getTimeStorageKeyForQuestion(currentQuestion.questionId);
      if (questionKey) {
        const raw = localStorage.getItem(questionKey);
        if (raw) {
          this.savedTimeRemaining = Number(raw) || 0;
          console.log('[WritingComponent] Loaded time for question:', currentQuestion.questionId, this.savedTimeRemaining);
        } else {
          // No saved time for this question, use the question's default time
          this.savedTimeRemaining = currentQuestion.time || 0;
          this.saveTime();
        }
      }
    }
  }


  finishExam(): void {
    this.isFinished = true;
    this.showExplain = true;
    this.saveCurrentState();
    this.finished.emit();
  }

  getCurrentQuestion(): QuestionDTO | null {
    if (!this.questions || this.currentIndex >= this.questions.length) return null;
    return this.questions[this.currentIndex];
  }

  getSavedAnswer(questionId: number): string {
    const saved = this.savedAnswers.find(x => x.questionId === questionId);
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
    this.isFinished = false;
    this.totalScore = 0;
    this.correctCount = 0;
    this.savedAnswers = [];
    this.savedTimeRemaining = 0;
    this.pictureCaption = '';
    this.clearSavedData();
  }

  clearSavedData(): void {
    try {
      const answersKey = this.getStorageKey();
      const timeKey = this.getTimeStorageKey();
      if (answersKey) localStorage.removeItem(answersKey);
      if (timeKey) localStorage.removeItem(timeKey);
    } catch {
      // ignore
    }
  }

  canNavigateToQuestion(index: number): boolean {
    return this.questions ? index >= 0 && index < this.questions.length : false;
  }

  isCurrentQuestion(index: number): boolean {
    return index === this.currentIndex;
  }
}
