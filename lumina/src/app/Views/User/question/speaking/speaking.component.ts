import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpeakingAnswerBoxComponent } from '../../speaking-answer-box/speaking-answer-box.component';
import { SpeakingScoringResult } from '../../../../Services/Speaking/speaking.service';

@Component({
  selector: 'app-speaking',
  standalone: true,
  imports: [CommonModule, SpeakingAnswerBoxComponent],
  templateUrl: './speaking.component.html',
  styleUrl: './speaking.component.scss'
})
export class SpeakingComponent implements OnChanges {
  @Input() questionId: number = 0;
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Input() questionTime: number = 0;
  @Output() answered = new EventEmitter<boolean>();
  @Output() scoringResult = new EventEmitter<SpeakingScoringResult>();
  @Output() submitting = new EventEmitter<boolean>();

  ngOnChanges(changes: SimpleChanges): void {
    // Handle changes if needed
  }

  onAnswered(isCorrect: boolean): void {
    this.answered.emit(isCorrect);
  }

  onScoringResult(result: SpeakingScoringResult): void {
    this.scoringResult.emit(result);
  }

  onSubmitting(isSubmitting: boolean): void {
    this.submitting.emit(isSubmitting);
  }
}
