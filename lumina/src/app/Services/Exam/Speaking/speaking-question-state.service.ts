import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SpeakingScoringResult } from '../../../Interfaces/exam.interfaces';
import { SpeakingService } from './speaking.service';
export type QuestionState =
  | 'not_started'
  | 'in_progress'
  | 'has_recording'
  | 'submitted'
  | 'scoring'
  | 'scored';

export interface QuestionRecordingState {
  questionId: number;
  state: QuestionState;
  audioBlob: Blob | null;
  recordingTime: number;
  result: SpeakingScoringResult | null;
  errorMessage: string;
}

@Injectable({
  providedIn: 'root',
})
export class SpeakingQuestionStateService {
  private questionStates = new Map<number, QuestionRecordingState>();
  private statesSubject = new BehaviorSubject<
    Map<number, QuestionRecordingState>
  >(new Map());

  // ✅ FIX Bug #11: Track pending requests để prevent duplicates
  private pendingSubmissions = new Map<
    number,
    Promise<SpeakingScoringResult>
  >();

  constructor(private speakingApi: SpeakingService) {}

  // Get observable for state changes
  getStates(): Observable<Map<number, QuestionRecordingState>> {
    return this.statesSubject.asObservable();
  }

  // Get current states map
  getCurrentStates(): Map<number, QuestionRecordingState> {
    return new Map(this.questionStates);
  }

  // Initialize question state
  initializeQuestion(questionId: number): void {
    if (!this.questionStates.has(questionId)) {
      this.questionStates.set(questionId, {
        questionId,
        state: 'not_started',
        audioBlob: null,
        recordingTime: 0,
        result: null,
        errorMessage: '',
      });
      this.emitStates();
    }
  }

  // Update question state
  updateQuestionState(
    questionId: number,
    updates: Partial<QuestionRecordingState>
  ): void {
    const currentState = this.questionStates.get(questionId);
    if (currentState) {
      const updatedState = { ...currentState, ...updates };
      this.questionStates.set(questionId, updatedState);

      // ✅ Log state changes for debugging
      console.log(
        `[SpeakingStateService] 🔄 State updated for Q${questionId}:`,
        {
          oldState: currentState.state,
          newState: updatedState.state,
          hasAudio: !!updatedState.audioBlob,
          hasResult: !!updatedState.result,
        }
      );

      this.emitStates();
    } else {
      console.warn(
        `[SpeakingStateService] ⚠️ Question ${questionId} not initialized`
      );
    }
  }

  // Get specific question state
  getQuestionState(questionId: number): QuestionRecordingState | undefined {
    return this.questionStates.get(questionId);
  }

  // Save recording data
  saveRecording(
    questionId: number,
    audioBlob: Blob,
    recordingTime: number
  ): void {
    this.updateQuestionState(questionId, {
      audioBlob,
      recordingTime,
      state: 'has_recording',
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
  markAsScored(questionId: number, result: SpeakingScoringResult): void {
    this.updateQuestionState(questionId, {
      state: 'scored',
      result,
    });
  }

  // Set error
  setError(questionId: number, errorMessage: string): void {
    this.updateQuestionState(questionId, {
      state: 'not_started',
      errorMessage,
    });
  }

  // Clear recording (for retry)
  clearRecording(questionId: number): void {
    this.updateQuestionState(questionId, {
      audioBlob: null,
      recordingTime: 0,
      state: 'not_started',
      result: null,
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

  // Submit recording and persist state even if component is destroyed
  async submitAnswerAndStore(
    questionId: number,
    audioBlob: Blob,
    attemptId?: number // ✅ THÊM: attemptId parameter
  ): Promise<SpeakingScoringResult> {
    // ✅ FIX Bug #11: Check if already submitting
    const existingSubmission = this.pendingSubmissions.get(questionId);
    if (existingSubmission) {
      console.warn(
        `[SpeakingStateService] ⚠️ Question ${questionId} already submitting, returning existing promise`
      );
      return existingSubmission;
    }

    // Mark as scoring immediately
    this.markAsScoring(questionId);

    console.log(
      `[SpeakingStateService] Submitting answer for question ${questionId}, attemptId: ${attemptId}`
    );

    // ✅ FIX Bug #11: Create promise với timeout và error handling
    const submissionPromise = this.executeSubmission(
      questionId,
      audioBlob,
      attemptId
    );

    // Track pending submission
    this.pendingSubmissions.set(questionId, submissionPromise);

    try {
      const result = await submissionPromise;
      return result;
    } finally {
      // ✅ FIX: Always clean up pending submission
      this.pendingSubmissions.delete(questionId);
    }
  }

  // ✅ FIX Bug #11: Separate method với timeout và error handling
  private async executeSubmission(
    questionId: number,
    audioBlob: Blob,
    attemptId?: number
  ): Promise<SpeakingScoringResult> {
    try {
      // Create submission promise with timeout (60 seconds)
      const submissionPromise = this.speakingApi
        .submitSpeakingAnswer(audioBlob, questionId, attemptId)
        .toPromise();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Submission timeout after 60s')),
          60000
        )
      );

      // Race between submission and timeout
      const result = await Promise.race([submissionPromise, timeoutPromise]);

      if (result) {
        this.markAsScored(questionId, result);
        return result;
      }

      throw new Error('No result received from speaking scoring API');
    } catch (error: any) {
      console.error(
        `[SpeakingStateService] ❌ Submission failed for question ${questionId}:`,
        error
      );

      // ✅ FIX: Rollback state to 'has_recording' để user có thể retry
      this.updateQuestionState(questionId, {
        state: 'has_recording',
        errorMessage: error.message || 'Submission failed',
      });

      throw error;
    }
  }

  private emitStates(): void {
    const statesMap = new Map(this.questionStates);
    this.statesSubject.next(statesMap);

    // ✅ Log emit for debugging
    console.log('[SpeakingStateService] 📡 States emitted:', {
      totalStates: statesMap.size,
      states: Array.from(statesMap.entries()).map(([qId, state]) => ({
        questionId: qId,
        state: state.state,
      })),
    });
  }
}
