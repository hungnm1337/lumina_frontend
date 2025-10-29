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
      this.emitStates();
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
    audioBlob: Blob
  ): Promise<SpeakingScoringResult> {
    // Mark as scoring immediately
    this.markAsScoring(questionId);

    // Fire the HTTP request from a long-lived service so it continues across navigation
    const result = await this.speakingApi
      .submitSpeakingAnswer(audioBlob, questionId)
      .toPromise();

    if (result) {
      this.markAsScored(questionId, result);
      return result;
    }

    // Shouldn't happen, but keep types happy
    throw new Error('No result received from speaking scoring API');
  }

  private emitStates(): void {
    this.statesSubject.next(new Map(this.questionStates));
  }
}
