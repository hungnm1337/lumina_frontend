import { Component, Input, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OptionsComponent } from "../options/options.component";
import { PromptComponent } from "../prompt/prompt.component";
import { TimeComponent } from "../time/time.component";
import { QuestionDTO, OptionDTO } from '../../../Interfaces/exam.interfaces';
import { Router } from '@angular/router';
import { AuthService } from '../../../Services/Auth/auth.service';
import { WritingAnswerBoxComponent } from "../writing-answer-box/writing-answer-box.component";
@Component({
  selector: 'app-question',
  standalone: true,
  imports: [CommonModule, OptionsComponent, PromptComponent, TimeComponent, WritingAnswerBoxComponent],
  templateUrl: './question.component.html'
})
export class QuestionComponent {

  @Input() questions: QuestionDTO[] = [];
  currentIndex = 0;
  showExplain = false;
  totalScore = 0;
  correctCount = 0;
  finished = false;
  savedAnswers: { questionId: number; optionId: number }[] = [];
  latestPictureCaption: string = '';

  markAnswered(isCorrect: boolean): void {
    if (isCorrect) {
      const q = this.questions[this.currentIndex];
      this.totalScore += q?.scoreWeight ?? 0;
      this.correctCount += 1;
    }
    this.revealExplainAndQueueNext();
  }

  onTimeout(): void {
    this.revealExplainAndQueueNext();
  }

  private revealExplainAndQueueNext(): void {
    if (this.showExplain) return;
    this.showExplain = true;
  }

  private nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex += 1;
      this.showExplain = false;
      this.latestPictureCaption = '';
    } else {
      this.finished = true;
      this.showExplain = true;
      this.loadSavedAnswers();
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
  constructor(private router: Router, private authService: AuthService) {
    console.log('Questions:', this.questions);
  }

  onPictureCaption(caption: string): void {
    this.latestPictureCaption = caption || '';
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

  resetQuiz(): void {
    this.currentIndex = 0;
    this.showExplain = false;
    this.totalScore = 0;
    this.correctCount = 0;
    this.finished = false;
    this.latestPictureCaption = '';
  }

  goToExams() {
    this.router.navigate(['homepage/user-dashboard/exams']);
  }

  private getStorageKey(): string | null {
    const userId = this.authService.getCurrentUser()?.id;
    if (userId === undefined || userId === null) return null;
    return `Answer_Reading_${userId}`;
  }

  private loadSavedAnswers(): void {
    try {
      const key = this.getStorageKey() || "Answer_Reading_undefined";
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
          .map((x: any) => ({ questionId: Number(x?.questionId), optionId: Number(x?.optionId) }))
          .filter((x: any) => Number.isFinite(x.questionId) && Number.isFinite(x.optionId));
      } else {
        this.savedAnswers = [];
      }
    } catch {
      this.savedAnswers = [];
    }
  }

  clearSavedAnswers(): void {
    try {
      const key = this.getStorageKey() || "Answer_Reading_undefined";
      if (!key) return;
      localStorage.removeItem(key);
      this.savedAnswers = [];
    } catch {
      // ignore
    }
  }

  isAnswerOptionCorrect(questionId: number, optionId: number): boolean | null {
    const q = this.questions.find(x => x.questionId === questionId);
    if (!q) return null;
    const opt = q.options?.find(o => o.optionId === optionId);
    if (!opt || typeof opt.isCorrect !== 'boolean') return null;
    return opt.isCorrect === true;
  }
}
