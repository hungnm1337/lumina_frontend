import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../Services/Auth/auth.service';

@Component({
  selector: 'app-writing-answer-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './writing-answer-box.component.html',
  styleUrl: './writing-answer-box.component.scss'
})
export class WritingAnswerBoxComponent implements OnChanges, OnDestroy {
  @Input() questionId: number = 0;
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Output() answered = new EventEmitter<boolean>();

  userAnswer: string = '';
  private autoSaveInterval: any = null;
  private readonly AUTO_SAVE_INTERVAL = 10000; // 10 seconds

  constructor(private authService: AuthService) {
    this.startAutoSave();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetAt'] || changes['questionId']) {
      this.loadSavedAnswer();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoSave();
  }

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
        this.userAnswer = savedAnswers[this.questionId] || '';
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

      savedAnswers[this.questionId] = this.userAnswer;
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

    // For writing questions, we'll emit true if there's content
    // The actual correctness will be determined by the backend or manual grading
    this.answered.emit(true);
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

}
