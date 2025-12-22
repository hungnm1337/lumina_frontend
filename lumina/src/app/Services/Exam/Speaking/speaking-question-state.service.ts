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
  preparationTime: number;
  recordingTime: number;
  showInfoPhase?: boolean;
  infoReadTime?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SpeakingQuestionStateService {
  private questionStates = new Map<number, QuestionRecordingState>();
  private statesSubject = new BehaviorSubject<
    Map<number, QuestionRecordingState>
  >(new Map());

  private pendingSubmissions = new Map<
    number,
    Promise<SpeakingScoringResult>
  >();

  constructor(private speakingApi: SpeakingService) {}

  getStates(): Observable<Map<number, QuestionRecordingState>> {
    return this.statesSubject.asObservable();
  }

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

  getQuestionState(questionId: number): QuestionRecordingState | undefined {
    return this.questionStates.get(questionId);
  }

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

  markAsSubmitted(questionId: number): void {
    this.updateQuestionState(questionId, {
      state: 'submitted',
    });
  }

  markAsScoring(questionId: number): void {
    this.updateQuestionState(questionId, {
      state: 'scoring',
    });
  }

  markAsScored(questionId: number, result: SpeakingScoringResult): void {
    this.updateQuestionState(questionId, {
      state: 'scored',
      result,
    });
  }

  setError(questionId: number, errorMessage: string): void {
    this.updateQuestionState(questionId, {
      state: 'not_started',
      errorMessage,
    });
  }

  clearRecording(questionId: number): void {
    this.updateQuestionState(questionId, {
      audioBlob: null,
      recordingTime: 0,
      state: 'not_started',
      result: null,
      errorMessage: '',
    });
  }

  resetAllStates(): void {
    this.questionStates.clear();
    this.emitStates();
  }

  getQuestionTiming(questionNumber: number): SpeakingQuestionTiming {
    const timings: Record<number, SpeakingQuestionTiming> = {
      1: {
        questionNumber: 1,
        partNumber: 1,
        preparationTime: 45,
        recordingTime: 45,
      },
      2: {
        questionNumber: 2,
        partNumber: 1,
        preparationTime: 45,
        recordingTime: 45,
      },
      3: {
        questionNumber: 3,
        partNumber: 2,
        preparationTime: 45,
        recordingTime: 30,
      },
      4: {
        questionNumber: 4,
        partNumber: 2,
        preparationTime: 45,
        recordingTime: 30,
      },
      5: {
        questionNumber: 5,
        partNumber: 3,
        preparationTime: 3,
        recordingTime: 15,
      },
      6: {
        questionNumber: 6,
        partNumber: 3,
        preparationTime: 3,
        recordingTime: 15,
      },
      7: {
        questionNumber: 7,
        partNumber: 3,
        preparationTime: 3,
        recordingTime: 30,
      },
      8: {
        questionNumber: 8,
        partNumber: 4,
        preparationTime: 3,
        recordingTime: 15,
        showInfoPhase: true,
        infoReadTime: 45,
      },
      9: {
        questionNumber: 9,
        partNumber: 4,
        preparationTime: 3,
        recordingTime: 15,
      },
      10: {
        questionNumber: 10,
        partNumber: 4,
        preparationTime: 3,
        recordingTime: 30,
      },
      11: {
        questionNumber: 11,
        partNumber: 5,
        preparationTime: 30,
        recordingTime: 60,
      },
    };

    const timing = timings[questionNumber];
    if (!timing) {
      return {
        questionNumber,
        partNumber: 0,
        preparationTime: 0,
        recordingTime: 0,
      };
    }

    return timing;
  }

  async submitAnswerAndStore(
    questionId: number,
    audioBlob: Blob,
    attemptId?: number
  ): Promise<SpeakingScoringResult> {
    if (!audioBlob) {
      throw new Error('No audio recording available');
    }

    if (audioBlob.size === 0) {
      throw new Error('Audio recording is empty');
    }

    const existingSubmission = this.pendingSubmissions.get(questionId);
    if (existingSubmission) {
      return existingSubmission;
    }

    this.markAsScoring(questionId);

    const submissionPromise = this.executeSubmission(
      questionId,
      audioBlob,
      attemptId
    );

    this.pendingSubmissions.set(questionId, submissionPromise);

    try {
      const result = await submissionPromise;
      return result;
    } finally {
      this.pendingSubmissions.delete(questionId);
    }
  }

  private async executeSubmission(
    questionId: number,
    audioBlob: Blob,
    attemptId?: number
  ): Promise<SpeakingScoringResult> {
    try {
      const submissionPromise = this.speakingApi
        .submitSpeakingAnswer(audioBlob, questionId, attemptId)
        .toPromise();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Submission timeout after 60s')),
          60000
        )
      );

      const result = await Promise.race([submissionPromise, timeoutPromise]);

      if (result) {
        this.markAsScored(questionId, result);
        return result;
      }

      throw new Error('No result received from speaking scoring API');
    } catch (error: any) {
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
  }
}