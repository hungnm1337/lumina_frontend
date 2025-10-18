import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../Services/Auth/auth.service';
import { WritingRequestDTO } from '../../../Interfaces/WrittingExam/WritingRequestDTO.interface';
import { FeedbackComponent } from "./Feedback/feedback/feedback.component";
import { WritingResponseDTO } from '../../../Interfaces/WrittingExam/WritingResponseDTO.interface';
import { WritingExamPartOneService } from '../../../Services/Exam/Writing/writing-exam-part-one.service';
@Component({
  selector: 'app-writing-answer-box',
  standalone: true,
  imports: [CommonModule, FormsModule, FeedbackComponent],
  templateUrl: './writing-answer-box.component.html',
  styleUrl: './writing-answer-box.component.scss'
})
export class WritingAnswerBoxComponent implements OnChanges, OnDestroy {
  @Input() questionId: number = 0;
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Input() contentText: string | undefined;
  @Input() pictureCaption: string | undefined;
  @Output() answered = new EventEmitter<boolean>();
  @Output() answerChange = new EventEmitter<{questionId: number, answer: string}>();

  feedbackResponse: WritingResponseDTO | null = null;
  writingRequest: WritingRequestDTO | undefined;;
  userAnswer: string = '';
  isLoadingFeedback: boolean = false;
  private autoSaveInterval: any = null;
  private readonly AUTO_SAVE_INTERVAL = 10000; // 10 seconds

  constructor(private authService: AuthService, private writingExamPartOneService: WritingExamPartOneService) {
    this.startAutoSave();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetAt'] || changes['questionId']) {
      this.loadSavedAnswer();
      // Reset feedback state when question changes
      this.feedbackResponse = null;
      this.isLoadingFeedback = false;
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
    // Emit answer change event for parent component
    this.answerChange.emit({
      questionId: this.questionId,
      answer: this.userAnswer
    });
  }

  onSubmit(): void {
    if (this.disabled || !this.userAnswer.trim()) return;
    const vocabularyRequest = this.contentText || '';
    const pictureCaption = this.pictureCaption || '';
    this.writingRequest = {
      pictureCaption: pictureCaption,
      vocabularyRequest: vocabularyRequest,
      userAnswer: this.userAnswer
    };
    // For now, just log or emit success. You can emit the DTO via another Output if needed.
    console.log('WritingRequestDTO:', this.writingRequest);

    this.isLoadingFeedback = true;
    this.writingExamPartOneService.GetFeedbackOfWritingPartOne(this.writingRequest).subscribe({
      next: (response) => {
        this.feedbackResponse = response;
        console.log('WritingFeedbackResponseDTO:', response);
        this.isLoadingFeedback = false;
      },
      error: (error) => {
        console.error('Error fetching writing feedback:', error);
        this.isLoadingFeedback = false;
      }
    });
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
