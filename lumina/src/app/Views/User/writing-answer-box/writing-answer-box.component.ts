import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../Services/Auth/auth.service';
import { WritingRequestP1DTO } from '../../../Interfaces/WrittingExam/WritingRequestP1DTO.interface';
import { WritingResponseDTO } from '../../../Interfaces/WrittingExam/WritingResponseDTO.interface';
import { WritingAnswerRequestDTO } from '../../../Interfaces/WritingAnswer/WritingAnswerRequestDTO.interface';
import { ToastService } from '../../../Services/Toast/toast.service';
import { FeedbackComponent } from "./Feedback/feedback/feedback.component";
import { WritingExamPartOneService } from '../../../Services/Exam/Writing/writing-exam.service';
import { ExamAttemptService } from '../../../Services/ExamAttempt/exam-attempt.service';
import { forkJoin } from 'rxjs';
import { WritingRequestP23DTO } from '../../../Interfaces/WrittingExam/WritingRequestP23DTO.interface';
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
  @Input() contentText: string | undefined;
  @Input() pictureCaption: string | undefined;
  @Output() answered = new EventEmitter<boolean>();
  @Output() answerChange = new EventEmitter<{questionId: number, answer: string}>();
  @Output() submitStart = new EventEmitter<number>(); // ✅ Emit when submission starts
  @Output() submitEnd = new EventEmitter<number>();   // ✅ Emit when submission ends

  writingRequest: WritingRequestP1DTO | undefined;;
  userAnswer: string = '';
  isLoadingFeedback: boolean = false;

  constructor(
    private authService: AuthService,
    private writingExamPartOneService: WritingExamPartOneService,
    private toast: ToastService,
    private examAttemptService: ExamAttemptService
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetAt'] || changes['questionId']) {
      this.loadSavedAnswer();
      // Reset loading state when question changes
      this.isLoadingFeedback = false;
    }
  }

  ngOnDestroy(): void {
    // Component cleanup - auto-save is handled by parent WritingComponent
  }

  private getStorageKey(): string | null {
    localStorage.getItem('currentExamAttempt');
    const attemptId = this.getAttemptIdFromLocalStorage();
    if (attemptId === undefined || attemptId === null) return null;
    return `Answer_Writting_${attemptId}`;
  }

  private getSubmittedStorageKey(): string | null {
    const attemptId = this.getAttemptIdFromLocalStorage();
    if (attemptId === undefined || attemptId === null) return null;
    return `Submitted_Writting_${attemptId}`;
  }

  isQuestionSubmitted(): boolean {
    try {
      const key = this.getSubmittedStorageKey();
      if (!key) return false;

      const raw = localStorage.getItem(key);
      if (!raw) return false;

      const submittedQuestions = JSON.parse(raw);
      if (submittedQuestions && typeof submittedQuestions === 'object') {
        const isSubmitted = submittedQuestions[String(this.questionId)] === true;
        console.log(`🔍 Checking if question ${this.questionId} is submitted:`, isSubmitted);
        console.log('📦 Submitted questions:', submittedQuestions);
        return isSubmitted;
      }
      return false;
    } catch {
      return false;
    }
  }

  private markQuestionAsSubmitted(): void {
    try {
      const key = this.getSubmittedStorageKey();
      if (!key) return;

      const raw = localStorage.getItem(key);
      let submittedQuestions: Record<string, boolean> = {};

      if (raw) {
        try {
          submittedQuestions = JSON.parse(raw);
        } catch {
          submittedQuestions = {};
        }
      }


      submittedQuestions[String(this.questionId)] = true;
      localStorage.setItem(key, JSON.stringify(submittedQuestions));

    } catch {
      // Best-effort only; ignore storage errors
    }
  }

  private loadSavedAnswer(): void {
    try {
      const key = this.getStorageKey();
      if (!key) return;

      const raw = localStorage.getItem(key);
      if (!raw) return;

      const savedAnswers = JSON.parse(raw);
      if (savedAnswers && typeof savedAnswers === 'object') {
        const answerData = savedAnswers[String(this.questionId)];
        if (answerData && typeof answerData === 'object') {
          // New format: {questionId, answer}
          this.userAnswer = answerData.answer || '';
        } else if (typeof answerData === 'string') {
          // Old format: just string
          this.userAnswer = answerData;
        } else {
          this.userAnswer = '';
        }
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
      let savedAnswers: Record<string, any> = {};

      if (raw) {
        try {
          savedAnswers = JSON.parse(raw);
        } catch {
          savedAnswers = {};
        }
      }

      // Save with questionId included
      savedAnswers[String(this.questionId)] = {
        questionId: this.questionId,
        answer: this.userAnswer,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(savedAnswers));

      console.log('💾 Saved answer for question:', this.questionId);
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
    this.onSave();
    if (this.disabled || !this.userAnswer.trim() || this.isQuestionSubmitted()) return;

    const attemptId = this.getAttemptIdFromLocalStorage();
    if (!attemptId) {
      this.toast.error('Không tìm thấy thông tin bài thi');
      return;
    }

    const vocabularyRequest = this.contentText || '';
    const pictureCaption = this.pictureCaption || '';
    this.writingRequest = {
      pictureCaption: pictureCaption,
      vocabularyRequest: vocabularyRequest,
      userAnswer: this.userAnswer
    };

    this.isLoadingFeedback = true;
    this.submitStart.emit(this.questionId); // ✅ Emit start event

    //lấy part code
    const partCodeRaw = localStorage.getItem('PartCodeStorage');
    // Bước 1: Lấy feedback từ AI
    if(Number(partCodeRaw) == 1) {
      // nếu là part 1
      this.writingExamPartOneService.GetFeedbackOfWritingPartOne(this.writingRequest).subscribe({
      next: (feedback) => {
        // Lưu feedback vào localStorage
        this.saveFeedbackToLocalStorage(this.questionId, feedback);

        // Bước 2: Tạo DTO để lưu vào database
        const dto: WritingAnswerRequestDTO = {
          userAnswerWritingId: 0,
          attemptID: attemptId,
          questionId: this.questionId,
          userAnswerContent: this.userAnswer,
          feedbackFromAI: JSON.stringify(feedback),
        };

        // Bước 3: Lưu vào database
        this.writingExamPartOneService.SaveWritingAnswer(dto).subscribe({
          next: (success) => {
            if (success) {
              // Đánh dấu câu đã nộp
              this.markQuestionAsSubmitted();

              // Tắt loading
              this.isLoadingFeedback = false;
              this.submitEnd.emit(this.questionId); // ✅ Emit end event

              // Hiển thị thông báo thành công
              const displayIndex = (this.resetAt || 0) + 1;
              this.toast.success(`Nộp câu thành công (Câu ${displayIndex})`);

              // Emit event
              this.answered.emit(true);
            } else {
              this.isLoadingFeedback = false;
              this.submitEnd.emit(this.questionId); // ✅ Emit end event on failure
              this.toast.error('Không thể lưu câu trả lời. Vui lòng thử lại!');
            }
          },
          error: (error) => {
            console.error('Error saving writing answer to database:', error);
            this.isLoadingFeedback = false;
            this.submitEnd.emit(this.questionId); // ✅ Emit end event on error
            this.toast.error('Lỗi khi lưu câu trả lời. Vui lòng thử lại!');
          }
        });
      },
      error: (error) => {
        console.error('Error fetching writing feedback:', error);
        this.isLoadingFeedback = false;
        this.submitEnd.emit(this.questionId); // ✅ Emit end event on error
        this.toast.error('Lỗi khi lấy phản hồi từ AI. Vui lòng thử lại!');
      }
    });

  }else{
    const data : WritingRequestP23DTO = {
      partNumber: Number(partCodeRaw),
      prompt: this.contentText || '',
      userAnswer: this.userAnswer
    };
    console.log('WritingRequestP23DTO data:', data);
    // nếu là part 2 hoặc 3
       this.writingExamPartOneService.GetFeedbackOfWritingPartTwoAndThree(data).subscribe({
      next: (feedback) => {

        // Lưu feedback vào localStorage
        this.saveFeedbackToLocalStorage(this.questionId, feedback);

        // Bước 2: Tạo DTO để lưu vào database
        const dto: WritingAnswerRequestDTO = {
          userAnswerWritingId: 0,
          attemptID: attemptId,
          questionId: this.questionId,
          userAnswerContent: this.userAnswer,
          feedbackFromAI: JSON.stringify(feedback),
        };

        // Bước 3: Lưu vào database
        this.writingExamPartOneService.SaveWritingAnswer(dto).subscribe({
          next: (success) => {
            if (success) {
              // Đánh dấu câu đã nộp
              this.markQuestionAsSubmitted();

              // Tắt loading
              this.isLoadingFeedback = false;
              this.submitEnd.emit(this.questionId); // ✅ Emit end event

              // Hiển thị thông báo thành công
              const displayIndex = (this.resetAt || 0) + 1;
              this.toast.success(`Nộp câu thành công (Câu ${displayIndex})`);

              // Emit event
              this.answered.emit(true);
            } else {
              this.isLoadingFeedback = false;
              this.submitEnd.emit(this.questionId); // ✅ Emit end event on failure
              this.toast.error('Không thể lưu câu trả lời. Vui lòng thử lại!');
            }
          },
          error: (error) => {
            console.error('Error saving writing answer to database:', error);
            this.isLoadingFeedback = false;
            this.submitEnd.emit(this.questionId); // ✅ Emit end event on error
            this.toast.error('Lỗi khi lưu câu trả lời. Vui lòng thử lại!');
          }
        });
      },
      error: (error) => {
        console.error('Error fetching writing feedback:', error);
        this.isLoadingFeedback = false;
        this.submitEnd.emit(this.questionId); // ✅ Emit end event on error
        this.toast.error('Lỗi khi lấy phản hồi từ AI. Vui lòng thử lại!');
      }
    });
  }
}

  onSave(): void {
    if (this.isQuestionSubmitted()) return;
    this.saveAnswer();
  }

  private getAttemptIdFromLocalStorage(): number | null {
    try {
      const raw = localStorage.getItem('currentExamAttempt');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const id = parsed?.attemptID ?? parsed?.attemptId;
      return typeof id === 'number' ? id : Number(id) || null;
    } catch {
      return null;
    }
  }

  private getFeedbackStorageKey(): string | null {
    //lấy attempt id
    localStorage.getItem('currentExamAttempt');
    const attemptId = this.getAttemptIdFromLocalStorage();
    return `Writing_Feedback_${attemptId}`;
  }

  private saveFeedbackToLocalStorage(questionId: number, feedback: WritingResponseDTO): void {
    try {
      const key = this.getFeedbackStorageKey();
      if (!key) return;
      const raw = localStorage.getItem(key);
      let map: Record<string, any> = {};
      if (raw) {
        try {
          map = JSON.parse(raw);
        } catch {
          map = {};
        }
      }

      // Save with questionId included
      map[String(questionId)] = {
        questionId: questionId,
        feedback: feedback,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(map));

      console.log('💾 Saved feedback for question:', questionId);
    } catch {
      // ignore storage error
    }
  }

}
