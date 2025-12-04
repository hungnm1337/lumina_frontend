import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { ExamAttemptRequestDTO } from '../../Interfaces/ExamAttempt/ExamAttemptRequestDTO.interface';
import { ExamAttemptResponseDTO } from '../../Interfaces/ExamAttempt/ExamAttemptResponseDTO.interface';
import { ExamAttemptDetailResponseDTO } from '../../Interfaces/ExamAttempt/ExamAttemptDetailResponseDTO.interface';
import { ReadingAnswerRequestDTO } from '../../Interfaces/ReadingAnswer/ReadingAnswerRequestDTO.interface';
import { WritingAnswerRequestDTO } from '../../Interfaces/WritingAnswer/WritingAnswerRequestDTO.interface';

export interface SubmitAnswerResponse {
  success: boolean;
  isCorrect: boolean;
  score: number;
  message: string;
}

export interface FinalizeAttemptResponse {
  success: boolean;
  examAttemptId: number;
  totalScore: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  percentCorrect: number;
  startTime: string;
  endTime: string;
  duration: string;
}

export interface SaveProgressResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExamAttemptService {
  private baseUrl = `${environment.apiUrl}/ExamAttempt`;

  constructor(private http: HttpClient) {}

  startExam(model: ExamAttemptRequestDTO): Observable<ExamAttemptRequestDTO> {
    return this.http.post<ExamAttemptRequestDTO>(
      `${this.baseUrl}/start-exam`,
      model
    );
  }

  endExam(model: ExamAttemptRequestDTO): Observable<ExamAttemptRequestDTO> {
    return this.http.patch<ExamAttemptRequestDTO>(
      `${this.baseUrl}/end-exam`,
      model
    );
  }

  getUserAttempts(userId: number): Observable<ExamAttemptResponseDTO[]> {
    return this.http.get<ExamAttemptResponseDTO[]>(
      `${this.baseUrl}/user-attempts/${userId}`
    );
  }

  getAttemptDetails(
    attemptId: number
  ): Observable<ExamAttemptDetailResponseDTO> {
    return this.http.get<ExamAttemptDetailResponseDTO>(
      `${this.baseUrl}/attempt-details/${attemptId}`
    );
  }

  submitWritingAnswer(model: WritingAnswerRequestDTO): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.baseUrl}/save-writing-answer`,
      model
    );
  }

  submitListeningAnswer(model: {
    examAttemptId: number;
    questionId: number;
    selectedOptionId: number;
  }): Observable<SubmitAnswerResponse> {
    return this.http.post<SubmitAnswerResponse>(
      `${environment.apiUrl}/Listening/submit-answer`,
      model
    );
  }

  submitReadingAnswerNew(model: {
    examAttemptId: number;
    questionId: number;
    selectedOptionId: number;
  }): Observable<SubmitAnswerResponse> {
    return this.http.post<SubmitAnswerResponse>(
      `${environment.apiUrl}/Reading/submit-answer`,
      model
    );
  }

  finalizeAttempt(attemptId: number): Observable<FinalizeAttemptResponse> {
    return this.http.post<FinalizeAttemptResponse>(`${this.baseUrl}/finalize`, {
      examAttemptId: attemptId,
    });
  }

  saveProgress(model: {
    examAttemptId: number;
    currentQuestionIndex?: number;
  }): Observable<SaveProgressResponse> {
    return this.http.put<SaveProgressResponse>(
      `${this.baseUrl}/save-progress`,
      model
    );
  }
}