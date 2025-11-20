import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ViewContainerRef, ComponentRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MockTestService } from '../../../../Services/MockTest/mocktest.service';
import { AuthService } from '../../../../Services/Auth/auth.service';
import { MockTestPart, PartAnswer } from '../../../../Interfaces/mocktest.interface';
import { MocktestProgressComponent } from '../mocktest-progress/mocktest-progress.component';
import { SpeakingComponent } from '../../../User/question/speaking/speaking.component';
import { WritingComponent } from '../../../User/question/writing/writing.component';
import { ToastService } from '../../../../Services/Toast/toast.service';
import { ExamPartDTO, QuestionDTO } from '../../../../Interfaces/exam.interfaces';
import { ExamAttemptService } from '../../../../Services/ExamAttempt/exam-attempt.service';
import { ExamAttemptRequestDTO } from '../../../../Interfaces/ExamAttempt/ExamAttemptRequestDTO.interface';

@Component({
  selector: 'app-mock-exam',
  standalone: true,
  imports: [
    CommonModule,
    SpeakingComponent,
    WritingComponent
  ],
  templateUrl: './exam.component.html',
  styleUrls: ['./exam.component.scss']
})

export class ExamComponent implements OnInit, OnDestroy {
  constructor(
    private mockTestService: MockTestService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private examAttemptService: ExamAttemptService
  ) {}

  exampartDetailsAndQustions: ExamPartDTO[] = [];
  currentPartIndex: number = 0;
  currentQuestionIndex: number = 0;
  selectedAnswers: { [questionId: number]: number } = {}; // questionId -> optionId (for Listening/Reading)
  showPartCompletionMessage: boolean = false;

  // Attempt management
  attemptId: number | null = null;
  examId: number | null = null;
  isSubmitting: boolean = false;
  totalScore: number = 0;

  get currentPart(): ExamPartDTO | null {
    return this.exampartDetailsAndQustions[this.currentPartIndex] || null;
  }

  get currentQuestion() {
    return this.currentPart?.questions[this.currentQuestionIndex] || null;
  }

  // Skill type detection
  get currentSkillType(): 'listening' | 'reading' | 'speaking' | 'writing' | 'unknown' {
    if (!this.currentPart?.partCode) return 'unknown';
    const partCode = this.currentPart.partCode.toUpperCase();

    if (partCode.includes('LISTENING')) return 'listening';
    if (partCode.includes('READING')) return 'reading';
    if (partCode.includes('SPEAKING')) return 'speaking';
    if (partCode.includes('WRITING') || partCode.includes('WRITTING')) return 'writing';

    return 'unknown';
  }

  get isMultipleChoicePart(): boolean {
    return this.currentSkillType === 'listening' || this.currentSkillType === 'reading';
  }

  get isSpeakingPart(): boolean {
    return this.currentSkillType === 'speaking';
  }

  get isWritingPart(): boolean {
    return this.currentSkillType === 'writing';
  }

  ngOnInit(): void {
    // Get examId from route params
    this.route.params.subscribe(params => {
      this.examId = +params['examId'] || null;
    });

    this.loadMocktestQuestions();
    this.createExamAttempt();
  }

  ngOnDestroy(): void {
    this.saveProgressOnExit();
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.attemptId && !this.isSubmitting) {
      $event.returnValue = 'Bạn có chắc muốn thoát? Tiến trình sẽ được lưu lại.';
    }
  }

  private createExamAttempt(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.toastService.error('Please login to start exam');
      this.router.navigate(['/auth/login']);
      return;
    }

    // Check if there's an existing attempt
    const storedAttempt = localStorage.getItem('currentExamAttempt');
    if (storedAttempt) {
      try {
        const parsed = JSON.parse(storedAttempt);
        this.attemptId = parsed.attemptID || parsed.attemptId;
        console.log('✅ Loaded existing attemptId:', this.attemptId);
        return;
      } catch (error) {
        console.error('Error parsing stored attempt:', error);
      }
    }

    // Create new attempt
    if (!this.examId) {
      console.error('No examId available for creating attempt');
      return;
    }

    const attemptRequest: ExamAttemptRequestDTO = {
      attemptID: 0,
      userID: Number(user.id),
      examID: this.examId,
      examPartId: null,
      startTime: new Date().toISOString(),
      endTime: null,
      score: null,
      status: 'Doing'
    };

    this.examAttemptService.startExam(attemptRequest).subscribe({
      next: (response) => {
        this.attemptId = response.attemptID;
        localStorage.setItem('currentExamAttempt', JSON.stringify(response));
        console.log('✅ Created new attemptId:', this.attemptId);
      },
      error: (error) => {
        console.error('❌ Failed to create exam attempt:', error);
        this.toastService.error('Failed to start exam. Please try again.');
      }
    });
  }

  loadMocktestQuestions() {
    this.mockTestService.getMocktestQuestions().subscribe({
      next: (data: ExamPartDTO[]) => {
        this.exampartDetailsAndQustions = data;
        console.log('Mocktest questions loaded:', data);

        // Set examId from first part if not set
        if (!this.examId && data.length > 0) {
          this.examId = data[0].examId;
        }

        // Initialize at first part and first question
        this.currentPartIndex = 0;
        this.currentQuestionIndex = 0;
      },
      error: (error) => {
        console.error('Error loading mocktest questions:', error);
        this.toastService.error('Failed to load mocktest questions. Please try again later.');
      }
    });
  }

  getTotalQuestions(): number {
    return this.exampartDetailsAndQustions.reduce((total, part) => total + part.questions.length, 0);
  }

  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D, etc.
  }

  selectAnswer(optionId: number) {
    if (this.currentQuestion) {
      this.selectedAnswers[this.currentQuestion.questionId] = optionId;
      console.log('Answer selected:', { questionId: this.currentQuestion.questionId, optionId });

      // Auto-submit answer to backend for Listening/Reading
      if (this.attemptId && this.isMultipleChoicePart) {
        this.submitAnswerToBackend(this.currentQuestion.questionId, optionId);
      }
    }
  }

  private submitAnswerToBackend(questionId: number, selectedOptionId: number): void {
    if (!this.attemptId) return;

    const model = {
      examAttemptId: this.attemptId,
      questionId: questionId,
      selectedOptionId: selectedOptionId
    };

    const submitService = this.currentSkillType === 'listening'
      ? this.examAttemptService.submitListeningAnswer(model)
      : this.examAttemptService.submitReadingAnswerNew(model);

    submitService.subscribe({
      next: (response) => {
        console.log('✅ Answer submitted:', response);
        if (response.isCorrect) {
          this.totalScore += response.score;
        }
      },
      error: (error) => {
        console.error('❌ Failed to submit answer:', error);
      }
    });
  }

  isQuestionAnswered(questionId: number): boolean {
    // For Listening/Reading: check selectedAnswers
    if (this.isMultipleChoicePart) {
      return this.selectedAnswers[questionId] !== undefined;
    }

    // For Speaking/Writing: always show as not answered in pills
    // (they don't use the pills navigation)
    return false;
  }

  goToQuestion(questionIndex: number) {
    this.currentQuestionIndex = questionIndex;
    this.showPartCompletionMessage = false;
  }

  nextQuestion() {
    if (!this.currentPart || !this.currentQuestion) return;

    // For Speaking/Writing parts, don't validate answer selection (handled by their own components)
    if (this.isMultipleChoicePart) {
      // Check if answer is selected for Listening/Reading
      if (!this.selectedAnswers[this.currentQuestion.questionId]) {
        this.toastService.error('Please select an answer before proceeding.');
        return;
      }
    }

    // Check if this is the last question in the part
    if (this.isLastQuestionInPart()) {
      if (this.isLastQuestionInExam()) {
        // Finish exam
        this.finishExam();
      } else {
        // Show part completion message
        this.showPartCompletionMessage = true;
      }
    } else {
      // Move to next question in current part
      this.currentQuestionIndex++;
    }
  }

  // Speaking/Writing event handlers
  onSpeakingAnswered(isCorrect: boolean): void {
    console.log('Speaking answer submitted:', isCorrect);
    // Speaking component handles its own scoring and navigation
    // When speaking finishes all questions, it will show its own summary
  }

  onWritingFinished(): void {
    console.log('Writing part finished');
    // Writing finished all questions
    // Auto-advance to next part or finish exam
    if (this.isLastQuestionInExam()) {
      this.finishExam();
    } else {
      this.showPartCompletionMessage = true;
    }
  }

  // Check if current part needs validation before moving to next
  canProceedToNextPart(): boolean {
    if (this.isMultipleChoicePart) {
      // For Listening/Reading: check all questions answered
      return this.currentPart?.questions.every(q =>
        this.selectedAnswers[q.questionId] !== undefined
      ) || false;
    }

    // For Speaking/Writing: they handle their own completion
    // Always return true since they control their own flow
    return true;
  }

  previousQuestion() {
    if (this.currentQuestionIndex > 0) {
      // Go to previous question in current part
      this.currentQuestionIndex--;
      this.showPartCompletionMessage = false;
    } else if (this.currentPartIndex > 0) {
      // Go to last question of previous part
      this.currentPartIndex--;
      this.currentQuestionIndex = this.currentPart!.questions.length - 1;
      this.showPartCompletionMessage = false;
    }
  }

  moveToNextPart() {
    if (this.currentPartIndex < this.exampartDetailsAndQustions.length - 1) {
      this.currentPartIndex++;
      this.currentQuestionIndex = 0;
      this.showPartCompletionMessage = false;
      this.toastService.success(`Starting ${this.currentPart?.title}`);
    }
  }

  isLastQuestionInPart(): boolean {
    if (!this.currentPart) return false;
    return this.currentQuestionIndex === this.currentPart.questions.length - 1;
  }

  isLastQuestionInExam(): boolean {
    return this.isLastQuestionInPart() &&
           this.currentPartIndex === this.exampartDetailsAndQustions.length - 1;
  }

  getPartProgress(): number {
    if (!this.currentPart) return 0;
    return ((this.currentQuestionIndex + 1) / this.currentPart.questions.length) * 100;
  }

  getAnsweredCount(): number {
    return Object.keys(this.selectedAnswers).length;
  }

  finishExam() {
    if (!this.attemptId) {
      this.toastService.error('No exam attempt found');
      return;
    }

    const totalQuestions = this.getTotalQuestions();
    const answeredQuestions = this.getAnsweredCount();

    if (answeredQuestions < totalQuestions && this.isMultipleChoicePart) {
      const confirmed = confirm(
        `You have answered ${answeredQuestions} out of ${totalQuestions} questions. Do you want to submit anyway?`
      );
      if (!confirmed) return;
    }

    this.isSubmitting = true;

    // Call endExam API
    const storedAttempt = localStorage.getItem('currentExamAttempt');
    if (!storedAttempt) {
      this.toastService.error('Exam session not found');
      return;
    }

    try {
      const attemptData = JSON.parse(storedAttempt);
      const endExamRequest: ExamAttemptRequestDTO = {
        attemptID: attemptData.attemptID || attemptData.attemptId,
        userID: attemptData.userID || attemptData.userId,
        examID: attemptData.examID || attemptData.examId,
        examPartId: attemptData.examPartId || null,
        startTime: attemptData.startTime,
        endTime: new Date().toISOString(),
        score: Math.round(this.totalScore),
        status: 'Completed'
      };

      this.examAttemptService.endExam(endExamRequest).subscribe({
        next: (response) => {
          console.log('✅ Exam ended successfully:', response);

          // Finalize to calculate final score
          this.examAttemptService.finalizeAttempt(this.attemptId!).subscribe({
            next: (finalizeResponse) => {
              console.log('✅ Exam finalized:', finalizeResponse);
              this.isSubmitting = false;

              // Clean up
              localStorage.removeItem('currentExamAttempt');

              this.toastService.success(
                `Exam completed! Score: ${finalizeResponse.totalScore}/${finalizeResponse.totalQuestions}`
              );

              // Navigate to results page
              setTimeout(() => {
                this.router.navigate(['/homepage/user-dashboard/exam-attempts', this.attemptId]);
              }, 1500);
            },
            error: (error) => {
              console.error('❌ Error finalizing exam:', error);
              this.isSubmitting = false;
              this.toastService.warning('Exam submitted but failed to calculate final score');

              // Still navigate to home
              setTimeout(() => {
                this.router.navigate(['/homepage/user-dashboard/exams']);
              }, 1500);
            }
          });
        },
        error: (error) => {
          console.error('❌ Error ending exam:', error);
          this.isSubmitting = false;
          this.toastService.error('Failed to submit exam. Please try again.');
        }
      });
    } catch (error) {
      console.error('❌ Error parsing exam attempt:', error);
      this.isSubmitting = false;
      this.toastService.error('Error submitting exam');
    }
  }

  private saveProgressOnExit(): void {
    if (!this.attemptId || this.isSubmitting) return;

    const model = {
      examAttemptId: this.attemptId,
      currentQuestionIndex: this.currentQuestionIndex
    };

    this.examAttemptService.saveProgress(model).subscribe({
      next: () => console.log('✅ Progress saved'),
      error: (error) => console.error('❌ Error saving progress:', error)
    });
  }

  confirmExit(): void {
    const confirmResult = confirm(
      'Bạn có muốn lưu tiến trình và thoát không?\n\n' +
      '- Chọn "OK" để lưu và thoát\n' +
      '- Chọn "Cancel" để tiếp tục làm bài'
    );

    if (confirmResult) {
      this.saveProgressAndExit();
    }
  }

  private saveProgressAndExit(): void {
    if (!this.attemptId) {
      this.router.navigate(['/homepage/user-dashboard/exams']);
      return;
    }

    const model = {
      examAttemptId: this.attemptId,
      currentQuestionIndex: this.currentQuestionIndex
    };

    this.examAttemptService.saveProgress(model).subscribe({
      next: () => {
        console.log('✅ Progress saved successfully');
        localStorage.removeItem('currentExamAttempt');
        this.router.navigate(['/homepage/user-dashboard/exams']);
      },
      error: (error) => {
        console.error('❌ Error saving progress:', error);
        this.router.navigate(['/homepage/user-dashboard/exams']);
      }
    });
  }
}
