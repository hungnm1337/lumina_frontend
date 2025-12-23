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

  constructor(private speakingApi: SpeakingService) { }

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
    console.log(`[SpeakingState] 🎤 Recording saved - QuestionId: ${questionId}, Size: ${(audioBlob.size / 1024).toFixed(2)}KB, Duration: ${recordingTime}s, Type: ${audioBlob.type}`);
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
        preparationTime: 10,
        recordingTime: 45,
      },
      2: {
        questionNumber: 2,
        partNumber: 1,
        preparationTime: 10,
        recordingTime: 45,
      },
      3: {
        questionNumber: 3,
        partNumber: 2,
        preparationTime: 10,
        recordingTime: 30,
      },
      4: {
        questionNumber: 4,
        partNumber: 2,
        preparationTime: 10,
        recordingTime: 30,
      },
      5: {
        questionNumber: 5,
        partNumber: 3,
        preparationTime: 5,
        recordingTime: 15,
      },
      6: {
        questionNumber: 6,
        partNumber: 3,
        preparationTime: 5,
        recordingTime: 15,
      },
      7: {
        questionNumber: 7,
        partNumber: 3,
        preparationTime: 5,
        recordingTime: 30,
      },
      8: {
        questionNumber: 8,
        partNumber: 4,
        preparationTime: 5,
        recordingTime: 15,
        showInfoPhase: true,
        infoReadTime: 10,
      },
      9: {
        questionNumber: 9,
        partNumber: 4,
        preparationTime: 5,
        recordingTime: 15,
      },
      10: {
        questionNumber: 10,
        partNumber: 4,
        preparationTime: 5,
        recordingTime: 30,
      },
      11: {
        questionNumber: 11,
        partNumber: 5,
        preparationTime: 10,
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
    console.log(`[SpeakingState] 📤 Submitting answer - QuestionId: ${questionId}, AttemptId: ${attemptId}, Audio: ${(audioBlob.size / 1024).toFixed(2)}KB`);

    if (!audioBlob) {
      console.error('[SpeakingState] ❌ No audio blob provided');
      throw new Error('No audio recording available');
    }

    if (audioBlob.size === 0) {
      console.error('[SpeakingState] ❌ Audio blob is empty (0 bytes)');
      throw new Error('Audio recording is empty');
    }

    if (audioBlob.size < 1024) {
      console.warn(`[SpeakingState] ⚠️ Audio blob very small: ${audioBlob.size} bytes - may be invalid`);
    }

    const existingSubmission = this.pendingSubmissions.get(questionId);
    if (existingSubmission) {
      console.log(`[SpeakingState] ⏳ Using existing submission for QuestionId: ${questionId}`);
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
      console.log(`[SpeakingState] ✅ Submission successful - QuestionId: ${questionId}, Score: ${result.overallScore}`);
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
    const startTime = Date.now();
    console.log(`[SpeakingState] ⏱️ Starting submission execution at ${new Date().toLocaleTimeString()}`);

    try {
      const submissionPromise = this.speakingApi
        .submitSpeakingAnswer(audioBlob, questionId, attemptId)
        .toPromise();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => {
            console.error(`[SpeakingState] ⏰ Timeout after 130s - QuestionId: ${questionId}`);
            reject(new Error('Submission timeout after 130s - Backend may still be processing. Please check results in a moment.'));
          },
          130000  // Increased from 60s to 130s to accommodate backend processing
        )
      );

      // Log every 10 seconds to track progress
      const progressInterval = setInterval(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[SpeakingState] ⏳ Still processing... ${elapsed}s elapsed`);
      }, 10000);

      try {
        const result = await Promise.race([submissionPromise, timeoutPromise]);
        clearInterval(progressInterval);

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[SpeakingState] ⏱️ Submission completed in ${totalTime}s`);

        if (result) {
          console.log(`[SpeakingState] 📊 Result received - Transcript: "${result.transcript?.substring(0, 50)}...", Score: ${result.overallScore}`);
          this.markAsScored(questionId, result);
          return result;
        }

        throw new Error('No result received from speaking scoring API');
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    } catch (error: any) {
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`[SpeakingState] ❌ Submission failed after ${totalTime}s - Error: ${error.message}`);

      if (error.status) {
        console.error(`[SpeakingState] 📡 HTTP Status: ${error.status}, Message: ${error.error?.message || error.statusText}`);
      }

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