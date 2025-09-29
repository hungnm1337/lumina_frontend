import { Component } from '@angular/core';
import { Input } from '@angular/core';
import { OnChanges, SimpleChanges } from '@angular/core';
import { Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OptionDTO } from '../../../Services/Exam/exam.service';
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

  private correctAudio = new Audio('/correct.mp3');
  private wrongAudio = new Audio('/wrong.mp3');

  onSelect(option: OptionDTO): void {
    if (this.disabled || this.selectedOption) {
      return;
    }
    this.selectedOption = option;
    const isCorrect = option.isCorrect === true;
    this.playFeedback(isCorrect);
    this.answered.emit(isCorrect);
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
