import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { ExamAttemptRequestDTO } from '../../Interfaces/ExamAttempt/ExamAttemptRequestDTO.interface';
import { ExamAttemptResponseDTO } from '../../Interfaces/ExamAttempt/ExamAttemptResponseDTO.interface';
import { ExamAttemptDetailResponseDTO } from '../../Interfaces/ExamAttempt/ExamAttemptDetailResponseDTO.interface';
import { ReadingAnswerRequestDTO } from '../../Interfaces/ReadingAnswer/ReadingAnswerRequestDTO.interface';
import { WritingAnswerRequestDTO } from '../../Interfaces/WritingAnswer/WritingAnswerRequestDTO.interface';

@Injectable({
  providedIn: 'root'
})
export class ExamAttemptService {
  private baseUrl = `${environment.apiUrl}/ExamAttempt`;

  constructor(private http: HttpClient) { }

  /**
   * Start a new exam attempt
   * @param model Request data containing UserID and ExamID
   * @returns Observable of ExamAttemptResponseDTO
   */
  startExam(model: ExamAttemptRequestDTO): Observable<ExamAttemptRequestDTO> {
    return this.http.post<ExamAttemptRequestDTO>(`${this.baseUrl}/start-exam`, model);
  }

  /**
   * End an exam attempt
   * @param model Request data containing AttemptID
   * @returns Observable of ExamAttemptResponseDTO
   */
  endExam(model: ExamAttemptRequestDTO): Observable<ExamAttemptRequestDTO> {
    return this.http.patch<ExamAttemptRequestDTO>(`${this.baseUrl}/end-exam`, model);
  }

  /**
   * Get all exam attempts for a specific user
   * @param userId The ID of the user
   * @returns Observable of ExamAttemptResponseDTO array
   */
  getUserAttempts(userId: number): Observable<ExamAttemptResponseDTO[]> {
    return this.http.get<ExamAttemptResponseDTO[]>(`${this.baseUrl}/user-attempts/${userId}`);
  }

  /**
   * Get detailed information about a specific exam attempt
   * @param attemptId The ID of the exam attempt
   * @returns Observable of ExamAttemptDetailResponseDTO
   */
  getAttemptDetails(attemptId: number): Observable<ExamAttemptDetailResponseDTO> {
    return this.http.get<ExamAttemptDetailResponseDTO>(`${this.baseUrl}/attempt-details/${attemptId}`);
  }

  submitReadingAnswer(model: ReadingAnswerRequestDTO): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/save-reading-answer`, model);
  }

  submitWritingAnswer(model: WritingAnswerRequestDTO): Observable<boolean> {
    return this.http.post<boolean>(`${this.baseUrl}/save-writing-answer`, model);
  }
}
