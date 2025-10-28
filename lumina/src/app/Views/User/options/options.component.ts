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
  templateUrl: './options.component.html',
})
export class OptionsComponent implements OnChanges {
  @Input() options: OptionDTO[] = [];
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Input() preSelectedOptionId: number | null = null;
  selectedOption: OptionDTO | null = null;
  @Output() answered = new EventEmitter<boolean>();

  constructor(public authService: AuthService) {}

  private correctAudio = new Audio('/correct.mp3');
  private wrongAudio = new Audio('/wrong.mp3');

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 ngOnChanges triggered:', {
      hasResetAtChange: !!changes['resetAt'],
      hasOptionsChange: !!changes['options'],
      hasPreSelectedChange: !!changes['preSelectedOptionId'],
      currentSelectedOption: this.selectedOption?.optionId,
      newPreSelectedOptionId: this.preSelectedOptionId,
    });

    // ✅ FIX: Đơn giản hóa - chỉ sync theo preSelectedOptionId
    // Bỏ logic reset, chỉ cần check preSelectedOptionId

    if (this.preSelectedOptionId && this.options && this.options.length > 0) {
      // Có preSelectedOptionId → tìm và set
      const preSelected = this.options.find(
        (opt) => opt.optionId === this.preSelectedOptionId
      );
      if (preSelected) {
        this.selectedOption = preSelected;
        console.log('✅ Set selectedOption from preSelectedOptionId:', {
          optionId: preSelected.optionId,
          content: preSelected.content,
        });
      } else {
        console.warn('⚠️ preSelectedOptionId not found in options:', {
          preSelectedOptionId: this.preSelectedOptionId,
          availableOptionIds: this.options.map((o) => o.optionId),
        });
        this.selectedOption = null;
      }
    } else {
      // Không có preSelectedOptionId → clear selection
      if (this.selectedOption !== null) {
        console.log('🔄 Clear selectedOption - no preSelectedOptionId');
        this.selectedOption = null;
      }
    }
  }

  // ✅ Cho phép re-select option
  onSelect(option: OptionDTO): void {
    // Chỉ block khi disabled
    if (this.disabled) {
      console.log('❌ Selection blocked - component is disabled');
      return;
    }

    console.log('✅ Option selected:', {
      optionId: option.optionId,
      content: option.content,
      isCorrect: option.isCorrect,
    });

    // Cho phép chọn lại option khác
    this.selectedOption = option;
    this.saveAnswer(option);
    const isCorrect = option.isCorrect === true;
    this.playFeedback(isCorrect);
    this.answered.emit(isCorrect);
  }

  private saveAnswer(option: OptionDTO): void {
    // ✅ KHÔNG CẦN localStorage - parent component sẽ quản lý state
    // Chỉ giữ logic này để backward compatibility với Reading component
    try {
      const storageKey =
        'Answer_Reading_' + this.authService.getCurrentUser()?.id;
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
                optionId: Number((x as any).optionId),
              }))
              .filter(
                (x) =>
                  Number.isFinite(x.questionId) && Number.isFinite(x.optionId)
              );
          }
        } catch {
          store = [];
        }
      }
      const idx = store.findIndex((x) => x.questionId === option.questionId);
      if (idx >= 0) {
        store[idx] = {
          questionId: option.questionId,
          optionId: option.optionId,
        };
      } else {
        store.push({
          questionId: option.questionId,
          optionId: option.optionId,
        });
      }
      localStorage.setItem(storageKey, JSON.stringify(store));
      console.log('💾 Saved to localStorage (backward compatibility):', {
        questionId: option.questionId,
        optionId: option.optionId,
      });
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  }

  private playFeedback(isCorrect: boolean): void {
    const audio = isCorrect ? this.correctAudio : this.wrongAudio;
    try {
      audio.currentTime = 0;
      void audio.play();
    } catch (e) {
      // best-effort only; ignore audio errors
    }
  }
}
