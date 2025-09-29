import { Component, Input, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OptionsComponent } from "../options/options.component";
import { PromptComponent } from "../prompt/prompt.component";
import { TimeComponent } from "../time/time.component";
import { QuestionDTO } from '../../../Services/Exam/exam.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-question',
  standalone: true,
  imports: [CommonModule, OptionsComponent, PromptComponent, TimeComponent],
  templateUrl: './question.component.html'
})
export class QuestionComponent {

  @Input() questions: QuestionDTO[] = [];
  currentIndex = 0;
  showExplain = false;
  private advanceTimer: any = null;
  totalScore = 0;
  correctCount = 0;
  finished = false;

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
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
    }
    this.advanceTimer = setTimeout(() => {
      this.nextQuestion();
    },1500);
  }

  private nextQuestion(): void {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex += 1;
      this.showExplain = false;
    } else {
      this.finished = true;
      this.showExplain = true;
    }
  }
  constructor(private router: Router) {
    console.log('Questions:', this.questions);
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
    if (this.advanceTimer) {
      clearTimeout(this.advanceTimer);
      this.advanceTimer = null;
    }
    this.currentIndex = 0;
    this.showExplain = false;
    this.totalScore = 0;
    this.correctCount = 0;
    this.finished = false;
  }

  goToExams() {
    this.router.navigate(['homepage/user-dashboard/exams']);
  }
}
