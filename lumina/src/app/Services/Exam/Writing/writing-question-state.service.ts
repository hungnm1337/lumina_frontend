import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WritingResponseDTO } from '../../../Interfaces/WrittingExam/WritingResponseDTO.interface';
import { WritingExamPartOneService } from './writing-exam.service';
import { WritingAnswerRequestDTO } from '../../../Interfaces/WritingAnswer/WritingAnswerRequestDTO.interface';
import { WritingRequestP1DTO } from '../../../Interfaces/WrittingExam/WritingRequestP1DTO.interface';
import { WritingRequestP23DTO } from '../../../Interfaces/WrittingExam/WritingRequestP23DTO.interface';

export type WritingQuestionState =
  | 'not_started'
  | 'in_progress'
  | 'has_answer'
  | 'submitted'
  | 'scoring'
  | 'scored';

export interface WritingQuestionStateData {
  questionId: number;
  state: WritingQuestionState;
  userAnswer: string;
  feedback: WritingResponseDTO | null;
  errorMessage: string;
}

@Injectable({
  providedIn: 'root',
})
export class WritingQuestionStateService {
  private questionStates = new Map<number, WritingQuestionStateData>();
  private statesSubject = new BehaviorSubject<
    Map<number, WritingQuestionStateData>
  >(new Map());

  // ✅ Track pending requests để prevent duplicates
  private pendingSubmissions = new Map<number, Promise<WritingResponseDTO>>();

  constructor(private writingApi: WritingExamPartOneService) {}

  // Get observable for state changes
  getStates(): Observable<Map<number, WritingQuestionStateData>> {
    return this.statesSubject.asObservable();
  }

  // Get current states map
  getCurrentStates(): Map<number, WritingQuestionStateData> {
    return new Map(this.questionStates);
  }

  // Initialize question state
  initializeQuestion(questionId: number): void {
    if (!this.questionStates.has(questionId)) {
      this.questionStates.set(questionId, {
        questionId,
        state: 'not_started',
        userAnswer: '',
        feedback: null,
        errorMessage: '',
      });
      this.emitStates();
    }
  }

  // Update question state
  updateQuestionState(
    questionId: number,
    updates: Partial<WritingQuestionStateData>
  ): void {
    const currentState = this.questionStates.get(questionId);
    if (currentState) {
      const updatedState = { ...currentState, ...updates };
      this.questionStates.set(questionId, updatedState);

      console.log(
        `[WritingStateService] 🔄 State updated for Q${questionId}:`,
        {
          oldState: currentState.state,
          newState: updatedState.state,
          hasAnswer: !!updatedState.userAnswer,
          hasFeedback: !!updatedState.feedback,
        }
      );

      this.emitStates();
    } else {
      console.warn(
        `[WritingStateService] ⚠️ Question ${questionId} not initialized`
      );
    }
  }

  // Get specific question state
  getQuestionState(questionId: number): WritingQuestionStateData | undefined {
    return this.questionStates.get(questionId);
  }

  // Save answer data
  saveAnswer(questionId: number, userAnswer: string): void {
    this.updateQuestionState(questionId, {
      userAnswer,
      state: userAnswer.trim() ? 'has_answer' : 'in_progress',
    });
  }

  // Mark as submitted
  markAsSubmitted(questionId: number): void {
    this.updateQuestionState(questionId, {
      state: 'submitted',
    });
  }

  // Mark as scoring
  markAsScoring(questionId: number): void {
    this.updateQuestionState(questionId, {
      state: 'scoring',
    });
  }

  // Mark as scored
  markAsScored(questionId: number, feedback: WritingResponseDTO): void {
    this.updateQuestionState(questionId, {
      state: 'scored',
      feedback,
    });
  }

  // Set error
  setError(questionId: number, errorMessage: string): void {
    this.updateQuestionState(questionId, {
      state: 'has_answer',
      errorMessage,
    });
  }

  // Clear answer (for retry)
  clearAnswer(questionId: number): void {
    this.updateQuestionState(questionId, {
      userAnswer: '',
      state: 'not_started',
      feedback: null,
      errorMessage: '',
    });
  }

  // Get questions ready for scoring (submitted but not scored)
  getQuestionsReadyForScoring(): number[] {
    const readyQuestions: number[] = [];
    this.questionStates.forEach((state, questionId) => {
      if (state.state === 'submitted') {
        readyQuestions.push(questionId);
      }
    });
    return readyQuestions;
  }

  // Check if all questions are completed (scored or submitted)
  areAllQuestionsCompleted(): boolean {
    for (const state of this.questionStates.values()) {
      if (state.state !== 'scored' && state.state !== 'submitted') {
        return false;
      }
    }
    return true;
  }

  // Reset all states
  resetAllStates(): void {
    this.questionStates.clear();
    this.emitStates();
  }

  // ✅ Submit answer and persist state even if component is destroyed
  async submitAnswerAndStore(
    questionId: number,
    userAnswer: string,
    attemptId: number,
    partCode: number,
    contentText?: string,
    pictureCaption?: string
  ): Promise<WritingResponseDTO> {
    // ✅ Check if already submitting
    const existingSubmission = this.pendingSubmissions.get(questionId);
    if (existingSubmission) {
      console.warn(
        `[WritingStateService] ⚠️ Question ${questionId} already submitting, returning existing promise`
      );
      return existingSubmission;
    }

    // Mark as scoring immediately
    this.markAsScoring(questionId);

    console.log(
      `[WritingStateService] Submitting answer for question ${questionId}, attemptId: ${attemptId}, partCode: ${partCode}`
    );

    // Create promise with timeout and error handling
    const submissionPromise = this.executeSubmission(
      questionId,
      userAnswer,
      attemptId,
      partCode,
      contentText,
      pictureCaption
    );

    // Track pending submission
    this.pendingSubmissions.set(questionId, submissionPromise);

    try {
      const result = await submissionPromise;
      return result;
    } finally {
      // ✅ Always clean up pending submission
      this.pendingSubmissions.delete(questionId);
    }
  }

  // ✅ Separate method with timeout and error handling
  private async executeSubmission(
    questionId: number,
    userAnswer: string,
    attemptId: number,
    partCode: number,
    contentText?: string,
    pictureCaption?: string
  ): Promise<WritingResponseDTO> {
    try {
      let feedbackPromise: Promise<WritingResponseDTO | undefined>;

      if (partCode === 1) {
        // Part 1
        const request: WritingRequestP1DTO = {
          pictureCaption: pictureCaption || '',
          vocabularyRequest: contentText || '',
          userAnswer: userAnswer,
        };
        feedbackPromise = this.writingApi
          .GetFeedbackOfWritingPartOne(request)
          .toPromise();
      } else {
        // Part 2 or 3
        const request: WritingRequestP23DTO = {
          partNumber: partCode,
          prompt: contentText || '',
          userAnswer: userAnswer,
        };
        feedbackPromise = this.writingApi
          .GetFeedbackOfWritingPartTwoAndThree(request)
          .toPromise();
      }

      // Timeout after 60 seconds
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Submission timeout after 60s')),
          60000
        )
      );

      // Race between submission and timeout
      const feedback = await Promise.race([feedbackPromise, timeoutPromise]);

      if (!feedback) {
        throw new Error('No feedback received from writing scoring API');
      }

      // Save to database
      const dto: WritingAnswerRequestDTO = {
        userAnswerWritingId: 0,
        attemptID: attemptId,
        questionId: questionId,
        userAnswerContent: userAnswer,
        feedbackFromAI: JSON.stringify(feedback),
      };

      const savePromise = this.writingApi.SaveWritingAnswer(dto).toPromise();
      const saveTimeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Save timeout after 30s')), 30000)
      );

      const saveSuccess = await Promise.race([savePromise, saveTimeoutPromise]);

      if (!saveSuccess) {
        throw new Error('Failed to save writing answer to database');
      }

      // Mark as scored with feedback
      this.markAsScored(questionId, feedback);
      return feedback;
    } catch (error: any) {
      console.error(
        `[WritingStateService] ❌ Submission failed for question ${questionId}:`,
        error
      );

      // ✅ Rollback state to 'has_answer' so user can retry
      this.updateQuestionState(questionId, {
        state: 'has_answer',
        errorMessage: error.message || 'Submission failed',
      });

      throw error;
    }
  }

  private emitStates(): void {
    const statesMap = new Map(this.questionStates);
    this.statesSubject.next(statesMap);

    console.log('[WritingStateService] 📡 States emitted:', {
      totalStates: statesMap.size,
      states: Array.from(statesMap.entries()).map(([qId, state]) => ({
        questionId: qId,
        state: state.state,
      })),
    });
  }
}
