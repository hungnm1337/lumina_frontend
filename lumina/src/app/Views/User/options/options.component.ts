import { Component } from '@angular/core';
import { Input } from '@angular/core';
import { OnChanges, SimpleChanges } from '@angular/core';
import { Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OptionDTO } from '../../../Interfaces/exam.interfaces';
import { AuthService } from '../../../Services/Auth/auth.service';
@Component({
  selector: 'app-options',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './options.component.html'
})
export class OptionsComponent implements OnChanges {
  @Input() options: OptionDTO[] = [];
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  selectedOption: OptionDTO | null = null;
  @Output() answered = new EventEmitter<boolean>();

  constructor(public authService: AuthService) { }

  private correctAudio = new Audio('/correct.mp3');
  private wrongAudio = new Audio('/wrong.mp3');

  onSelect(option: OptionDTO): void {
    if (this.disabled || this.selectedOption) {
      return;
    }
    this.selectedOption = option;
    this.saveAnswer(option);
    const isCorrect = option.isCorrect === true;
    this.playFeedback(isCorrect);
    this.answered.emit(isCorrect);
  }

  private saveAnswer(option: OptionDTO): void {
    try {
      const storageKey = 'Answer_Reading_'+ this.authService.getCurrentUser()?.id;
      const raw = localStorage.getItem(storageKey);
      type AnswerItem = { questionId: number; optionId: number };
      let store: AnswerItem[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            store = parsed
              .map((x) => ({
                questionId: Number((x as any).questionId),
                optionId: Number((x as any).optionId)
              }))
              .filter((x) => Number.isFinite(x.questionId) && Number.isFinite(x.optionId));
          }
        } catch {
          store = [];
        }
      }
      const idx = store.findIndex((x) => x.questionId === option.questionId);
      if (idx >= 0) {
        store[idx] = { questionId: option.questionId, optionId: option.optionId };
      } else {
        store.push({ questionId: option.questionId, optionId: option.optionId });
      }
      localStorage.setItem(storageKey, JSON.stringify(store));
    } catch {
      // Best-effort only; ignore storage errors (e.g., private mode, quota)
    }
  }
  private playFeedback(isCorrect: boolean): void {
    const audio = isCorrect ? this.correctAudio : this.wrongAudio;
    try {
      // Restart from beginning in case of rapid selections
      audio.currentTime = 0;
      void audio.play();
    } catch (e) {
      // best-effort only; ignore audio errors
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetAt'] || changes['options']) {
      this.selectedOption = null;
    }
  }

}

