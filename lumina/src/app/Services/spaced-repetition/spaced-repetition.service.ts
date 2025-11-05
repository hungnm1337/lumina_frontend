import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface SpacedRepetition {
  userSpacedRepetitionId: number;
  userId: number;
  vocabularyListId: number;
  vocabularyListName: string;
  lastReviewedAt: string;
  nextReviewAt: string | null;
  reviewCount: number;
  intervals: number;
  status: string;
  isDue: boolean;
  daysUntilReview: number;
}

export interface ReviewVocabularyRequest {
  userSpacedRepetitionId: number;
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

