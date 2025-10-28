import { Component } from '@angular/core';
import { Input } from '@angular/core';
import { OnChanges, SimpleChanges } from '@angular/core';
import { Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OptionDTO } from '../../../Interfaces/exam.interfaces';
import { AuthService } from '../../../Services/Auth/auth.service';
import { ExamAttemptService } from '../../../Services/ExamAttempt/exam-attempt.service';
import { ReadingAnswerRequestDTO } from '../../../Interfaces/ReadingAnswer/ReadingAnswerRequestDTO.interface';
import { ToastService } from '../../../Services/Toast/toast.service';
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

  constructor( private toastService: ToastService, public authService: AuthService, private examAttemptService: ExamAttemptService) { }

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
    if (this.disabled || this.selectedOption) {
      console.log('onSelect blocked: disabled or already selected');
      return;
    }
    console.log('onSelect called for option:', option.optionId);
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
      const stored = localStorage.getItem('currentExamAttempt');
      if (!stored) {
        return;
      }

      let attemptID: number;
      try {
        const parsed = JSON.parse(stored) as { attemptID?: number | string } | null;
        if (parsed == null || parsed.attemptID == null) {
          return;
        }
        attemptID = Number(parsed.attemptID);
        if (Number.isNaN(attemptID)) {
          return;
        }
      } catch {
        // If JSON.parse fails, abort silently
        return;
      }

      const answerDTO: ReadingAnswerRequestDTO = {
        attemptID: attemptID,
        questionId: option.questionId,
        selectedOptionId: option.optionId
      };
      console.log('Submitting reading answer:', answerDTO);
      this.examAttemptService.submitReadingAnswer(answerDTO).subscribe({
        next: (success) => {
          this.toastService.success('Answer saved successfully.');
        },
        error: (error) => {
          this.toastService.error('Error submitting reading answer.');
        }
      });

    } catch {
      // Best-effort only; ignore storage errors (e.g., private mode, quota)
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
