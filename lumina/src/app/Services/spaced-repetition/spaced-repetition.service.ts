import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface SpacedRepetition {
  userSpacedRepetitionId: number;
  userId: number;
  vocabularyId?: number | null; // Null = folder level, Not null = word level
  vocabularyListId: number;
  vocabularyListName: string;
  vocabularyWord?: string | null; // Word text if vocabularyId is set
  lastReviewedAt: string;
  nextReviewAt: string | null;
  reviewCount: number;
  intervals: number;
  status: string;
  isDue: boolean;
  daysUntilReview: number;
  // Quiz score fields (only used when vocabularyId is null)
  bestQuizScore?: number;
  lastQuizScore?: number;
  lastQuizCompletedAt?: string;
  totalQuizAttempts?: number;
}

export interface ReviewVocabularyRequest {
  // Option 1: Use existing userSpacedRepetitionId (backward compatible)
  userSpacedRepetitionId?: number | null;
  // Option 2: Create new record with vocabularyId and vocabularyListId (new way)
  vocabularyId?: number | null;
  vocabularyListId?: number | null;
  quality: number; // 0-5: 0 = không nhớ, 5 = nhớ rất tốt
}

export interface ReviewVocabularyResponse {
  success: boolean;
  message: string;
  updatedRepetition?: SpacedRepetition;
  nextReviewAt?: string | null;
  newIntervals: number;
}

@Injectable({
  providedIn: 'root'
})
export class SpacedRepetitionService {
  private apiUrl = `${environment.apiUrl}/spaced-repetition`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Lấy danh sách từ vựng cần review hôm nay
  getDueForReview(): Observable<SpacedRepetition[]> {
    return this.http.get<SpacedRepetition[]>(`${this.apiUrl}/due`, {
      headers: this.getHeaders()
    });
  }

  // Lấy tất cả tiến độ học tập của user
  getAllRepetitions(): Observable<SpacedRepetition[]> {
    return this.http.get<SpacedRepetition[]>(`${this.apiUrl}/all`, {
      headers: this.getHeaders()
    });
  }

  // Đánh giá từ vựng sau khi học
  reviewVocabulary(request: ReviewVocabularyRequest): Observable<ReviewVocabularyResponse> {
    return this.http.post<ReviewVocabularyResponse>(`${this.apiUrl}/review`, request, {
      headers: this.getHeaders()
    });
  }

  // Lấy thông tin Spaced Repetition theo vocabulary list
  getByList(listId: number): Observable<SpacedRepetition> {
    return this.http.get<SpacedRepetition>(`${this.apiUrl}/by-list/${listId}`, {
      headers: this.getHeaders()
    });
  }

  // Tạo bản ghi Spaced Repetition mới cho một vocabulary list
  createRepetition(listId: number): Observable<SpacedRepetition> {
    return this.http.post<SpacedRepetition>(`${this.apiUrl}/create/${listId}`, {}, {
      headers: this.getHeaders()
    });
  }
}

