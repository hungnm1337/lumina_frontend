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
  templateUrl: './options.component.html'
})
export class OptionsComponent implements OnChanges {
  @Input() options: OptionDTO[] = [];
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  selectedOption: OptionDTO | null = null;
  @Output() answered = new EventEmitter<boolean>();

  constructor( private toastService: ToastService, public authService: AuthService, private examAttemptService: ExamAttemptService) { }

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

