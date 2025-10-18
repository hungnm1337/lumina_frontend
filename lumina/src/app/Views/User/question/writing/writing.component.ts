import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../Services/Auth/auth.service';
import { WritingRequestDTO } from '../../../../Interfaces/WrittingExam/WritingRequestDTO.interface';
import { FeedbackComponent } from '../../writing-answer-box/Feedback/feedback/feedback.component';
import { WritingResponseDTO } from '../../../../Interfaces/WrittingExam/WritingResponseDTO.interface';
import { WritingExamPartOneService } from '../../../../Services/Exam/Writing/writing-exam-part-one.service';
import { ExamPartDTO, QuestionDTO } from '../../../../Interfaces/exam.interfaces';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamService } from '../../../../Services/Exam/exam.service';
import { PartDetailComponent } from '../../part-detail/part-detail.component';

@Component({
  selector: 'app-writing',
  standalone: true,
  imports: [CommonModule, FormsModule, FeedbackComponent,PartDetailComponent],
  templateUrl: './writing.component.html',
  styleUrl: './writing.component.scss'
})
export class WritingComponent implements OnChanges {
  @Input() questionId: number = 0;
  @Input() disabled: boolean = false;
  @Input() resetAt: number = 0;
  @Input() contentText: string | undefined;
  @Input() pictureCaption: string | undefined;
  @Output() answered = new EventEmitter<boolean>();

  partId: number | null = null;
  partDetail: ExamPartDTO | null = null;
  partInfo: ExamPartDTO | null = null;
  questions: QuestionDTO[] = [];
  isLoading = true;
  examType: string = '';
  isWritingExam = false;

  feedbackResponse: WritingResponseDTO | null = null;
  writingRequest: WritingRequestDTO | undefined;
  userAnswer: string = '';
  isLoadingFeedback: boolean = false;
  private autoSaveInterval: any = null;
  private readonly AUTO_SAVE_INTERVAL = 10000; // 10 seconds

  constructor(
    private authService: AuthService,
    private writingExamPartOneService: WritingExamPartOneService,
    private route: ActivatedRoute, private examService: ExamService, private router: Router
  ) {
    this.startAutoSave();
  }
  private loadPartDetail(): void {
    if (this.partId) {
      this.examService.GetExamPartDetailAndQuestion(this.partId).subscribe({
        next: (data) => {
          this.partDetail = data;
          console.log('Part detail loaded:', this.partDetail);
          console.log('Questions count:', this.partDetail.questions?.length || 0);
          console.log('Questions data:', this.partDetail.questions);

          // Load exam detail to get exam type
          this.loadExamType();

          this.partInfo = {
            partId: this.partDetail.partId,
            examId: this.partDetail.examId,
            partCode: this.partDetail.partCode,
            title: this.partDetail.title,
            orderIndex: this.partDetail.orderIndex,
            questions: []
          };
          this.questions = this.partDetail.questions || [];
          this.isLoading = false;

          console.log('Final questions array:', this.questions);
        },
        error: (error) => {
          console.error('Error loading part detail:', error);
          this.isLoading = false;
        }
      });
    }
  }

  private loadExamType(): void {
    if (this.partDetail?.examId) {
      this.examService.GetExamDetailAndPart(this.partDetail.examId).subscribe({
        next: (examData) => {
          this.examType = examData.examType || '';
          this.isWritingExam = this.examType.toUpperCase().includes('WRITTING');
          console.log('Exam type:', this.examType);
          console.log('Is writing exam:', this.isWritingExam);
        },
        error: (error) => {
          console.error('Error loading exam type:', error);
        }
      });
    }
  }

  onWritingAnswered(isCorrect: boolean): void {
    console.log('Writing answer submitted:', isCorrect);
    // Handle writing answer submission if needed
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetAt'] || changes['questionId']) {
      this.loadSavedAnswer();
      // Reset feedback state when question changes
      this.feedbackResponse = null;
      this.isLoadingFeedback = false;
    }
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
      next: (response: WritingResponseDTO) => {
        this.feedbackResponse = response;
        console.log('WritingFeedbackResponseDTO:', response);
        this.isLoadingFeedback = false;
      },
      error: (error: any) => {
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
