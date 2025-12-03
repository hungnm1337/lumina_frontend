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

export interface SpeakingQuestionTiming {
  questionNumber: number;
  partNumber: number;
  preparationTime: number; // seconds
  recordingTime: number; // seconds
  showInfoPhase?: boolean; // Part 4 Q8 only
  infoReadTime?: number; // Part 4 Q8 only (5 seconds)
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

  /**
   * Get timing configuration for a specific question number (1-11)
   * Maps question numbers to their preparation and recording times per TOEIC specs
   */
  getQuestionTiming(questionNumber: number): SpeakingQuestionTiming {
    const timings: Record<number, SpeakingQuestionTiming> = {
      // Part 1: Read aloud (Q1-2)
      1: { questionNumber: 1, partNumber: 1, preparationTime: 10, recordingTime: 10 },
      2: { questionNumber: 2, partNumber: 1, preparationTime: 10, recordingTime: 10 },

      // Part 2: Describe picture (Q3-4)
      3: { questionNumber: 3, partNumber: 2, preparationTime: 45, recordingTime: 30 },
      4: { questionNumber: 4, partNumber: 2, preparationTime: 45, recordingTime: 30 },

      // Part 3: Respond to questions (Q5-7)
      5: { questionNumber: 5, partNumber: 3, preparationTime: 3, recordingTime: 15 },
      6: { questionNumber: 6, partNumber: 3, preparationTime: 3, recordingTime: 15 },
      7: { questionNumber: 7, partNumber: 3, preparationTime: 3, recordingTime: 30 },

      // Part 4: Respond using information (Q8-10)
      8: {
        questionNumber: 8,
        partNumber: 4,
        preparationTime: 3,
        recordingTime: 15,
        showInfoPhase: true,
        infoReadTime: 5,
      },
      9: { questionNumber: 9, partNumber: 4, preparationTime: 3, recordingTime: 15 },
      10: { questionNumber: 10, partNumber: 4, preparationTime: 3, recordingTime: 30 },

      // Part 5: Express an opinion (Q11)
      11: { questionNumber: 11, partNumber: 5, preparationTime: 30, recordingTime: 60 },
    };

    const timing = timings[questionNumber];
    if (!timing) {
      console.warn(
        `[SpeakingStateService] No timing config for question ${questionNumber}, using defaults`
      );
      return {
        questionNumber,
        partNumber: 0,
        preparationTime: 0,
        recordingTime: 0,
      };
    }

    return timing;
  }


  // Submit recording and persist state even if component is destroyed
  async submitAnswerAndStore(
    questionId: number,
    audioBlob: Blob,
    attemptId?: number // ✅ THÊM: attemptId parameter
  ): Promise<SpeakingScoringResult> {
    // ✅ FIX: Validate audioBlob before processing
    if (!audioBlob) {
      console.error(`[SpeakingStateService] ❌ audioBlob is null for question ${questionId}`);
      throw new Error('No audio recording available');
    }
    
    if (audioBlob.size === 0) {
      console.error(`[SpeakingStateService] ❌ audioBlob is empty (0 bytes) for question ${questionId}`);
      throw new Error('Audio recording is empty');
    }
    
    console.log(`[SpeakingStateService] 📤 submitAnswerAndStore called:`, {
      questionId,
      attemptId,
      blobSize: audioBlob.size,
      blobType: audioBlob.type,
    });
    
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
      `[SpeakingStateService] 🔄 Submitting answer for question ${questionId}, attemptId: ${attemptId}`
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
