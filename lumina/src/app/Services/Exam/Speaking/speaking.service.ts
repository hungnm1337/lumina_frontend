import { SpeakingScoringResult } from './../../../Interfaces/exam.interfaces';
import { environment } from './../../../../environments/environment.development';
// File: src/app/Services/Speaking/speaking.service.ts
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Export type để các component khác có thể import (sử dụng export type cho isolatedModules)
export type { SpeakingScoringResult };

@Injectable({
  providedIn: 'root',
})
export class SpeakingService {
  private apiUrl = `${environment.apiUrl}/Speaking`; // Lấy URL API từ environment

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/json',
    });
  }

  submitSpeakingAnswer(
    audioBlob: Blob,
    questionId: number
  ): Observable<SpeakingScoringResult> {
    const formData = new FormData();
    // Gửi đúng phần mở rộng webm theo định dạng MediaRecorder
    formData.append('audio', audioBlob, 'user-recording.webm');
    formData.append('questionId', questionId.toString());

    return this.http.post<SpeakingScoringResult>(
      `${this.apiUrl}/submit-answer`,
      formData,
      { headers: this.getAuthHeaders() }
    );
  }
}
