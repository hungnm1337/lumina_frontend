import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { QuestionDTO } from '../../Interfaces/exam.interfaces';

export interface QuestionProgress {
  currentIndex: number;
  totalScore: number;
  correctCount: number;
  finished: boolean;
  totalQuestions: number;
}

@Injectable({
  providedIn: 'root',
})
export class BaseQuestionService {
  private currentIndexSubject = new BehaviorSubject<number>(0);
  private totalScoreSubject = new BehaviorSubject<number>(0);
  private correctCountSubject = new BehaviorSubject<number>(0);
  private finishedSubject = new BehaviorSubject<boolean>(false);
  private questionsSubject = new BehaviorSubject<QuestionDTO[]>([]);

  // Getters for current state
  get currentIndex(): number {
    return this.currentIndexSubject.value;
  }

  get totalScore(): number {
    return this.totalScoreSubject.value;
  }

  get correctCount(): number {
    return this.correctCountSubject.value;
  }

  get finished(): boolean {
    return this.finishedSubject.value;
  }

  get questions(): QuestionDTO[] {
    return this.questionsSubject.value;
  }

  // Observable streams
  get currentIndex$(): Observable<number> {
    return this.currentIndexSubject.asObservable();
  }

  get totalScore$(): Observable<number> {
    return this.totalScoreSubject.asObservable();
  }

  setTotalScore(score: number): void {
    this.totalScoreSubject.next(score);
  }

  get correctCount$(): Observable<number> {
    return this.correctCountSubject.asObservable();
  }

  get finished$(): Observable<boolean> {
    return this.finishedSubject.asObservable();
  }

  get questions$(): Observable<QuestionDTO[]> {
    return this.questionsSubject.asObservable();
  }

  get progress$(): Observable<QuestionProgress> {
    return new BehaviorSubject<QuestionProgress>({
      currentIndex: this.currentIndex,
      totalScore: this.totalScore,
      correctCount: this.correctCount,
      finished: this.finished,
      totalQuestions: this.questions.length,
    }).asObservable();
  }

  // Initialize with questions
  initializeQuestions(questions: QuestionDTO[]): void {
    this.questionsSubject.next(questions);
    this.resetQuiz();
  }

  // Navigation methods
  setCurrentIndex(index: number): void {
    if (index >= 0 && index < this.questions.length) {
      this.currentIndexSubject.next(index);
    }
  }

  nextQuestion(): boolean {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndexSubject.next(this.currentIndex + 1);
      return true;
    }
    return false;
  }

  previousQuestion(): boolean {
    if (this.currentIndex > 0) {
      this.currentIndexSubject.next(this.currentIndex - 1);
      return true;
    }
    return false;
  }

  // Score management
  addScore(score: number): void {
    this.totalScoreSubject.next(this.totalScore + score);
  }

  incrementCorrectCount(): void {
    this.correctCountSubject.next(this.correctCount + 1);
  }

  // Abstract methods to be overridden by specific implementations
  calculateScore(question: QuestionDTO, isCorrect: boolean): number {
    return isCorrect ? question.scoreWeight ?? 0 : 0;
  }

  handleTimeout(): void {
    // Default implementation - can be overridden
  }

  canAdvance(): boolean {
    return !this.finished;
  }

  // Progress calculation
  getProgress(): QuestionProgress {
    return {
      currentIndex: this.currentIndex,
      totalScore: this.totalScore,
      correctCount: this.correctCount,
      finished: this.finished,
      totalQuestions: this.questions.length,
    };
  }

  get percentCorrect(): number {
    const total = this.questions.length;
    if (total === 0) return 0;
    return Math.round((this.correctCount / total) * 100);
  }

  get feedbackText(): string {
    const p = this.percentCorrect;
    if (p < 30) return 'Bạn cần cố gắng nhiều hơn';
    if (p < 60) return 'Lần sau bạn chắc chắn sẽ làm tốt hơn';
    return 'Bạn hãy tiếp tục phát huy nhé';
  }

  // Reset quiz
  resetQuiz(): void {
    this.currentIndexSubject.next(0);
    this.totalScoreSubject.next(0);
    this.correctCountSubject.next(0);
    this.finishedSubject.next(false);
  }

  // Finish quiz
  finishQuiz(): void {
    this.finishedSubject.next(true);
  }

  // Get current question
  getCurrentQuestion(): QuestionDTO | null {
    return this.questions[this.currentIndex] || null;
  }

  // Check if at first question
  isFirstQuestion(): boolean {
    return this.currentIndex === 0;
  }

  // Check if at last question
  isLastQuestion(): boolean {
    return this.currentIndex === this.questions.length - 1;
  }

  // Navigate to specific question
  navigateToQuestion(index: number): boolean {
    if (index >= 0 && index < this.questions.length) {
      this.currentIndexSubject.next(index);
      return true;
    }
    return false;
  }
}
