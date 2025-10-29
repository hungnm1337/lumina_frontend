import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OptionDTO } from '../../../Interfaces/exam.interfaces';

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

  // ✅ FIX: Emit optionId thay vì boolean
  @Output() answered = new EventEmitter<number>();

//   private correctAudio = new Audio('/correct.mp3');
//   private wrongAudio = new Audio('/wrong.mp3');

  ngOnChanges(changes: SimpleChanges): void {
    // Reset khi câu hỏi thay đổi
    if (changes['resetAt']) {
      this.selectedOption = null;
    }

    // ✅ Restore selected option khi navigate
    if (changes['preSelectedOptionId'] || changes['options']) {
      if (this.preSelectedOptionId && this.options?.length > 0) {
        this.selectedOption =
          this.options.find((o) => o.optionId === this.preSelectedOptionId) ||
          null;
      }
    }
  }

  onSelect(option: OptionDTO): void {
    if (this.disabled || this.selectedOption) {
      return;
    }

    this.selectedOption = option;
    const isCorrect = option.isCorrect === true;
    this.playFeedback(isCorrect);

    // ✅ FIX: Emit optionId thay vì boolean
    this.answered.emit(option.optionId);
  }

  private playFeedback(isCorrect: boolean): void {
    try {
      const audio = isCorrect ? this.correctAudio : this.wrongAudio;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {}
  }
}
