import { SpeakingScoringResult } from './../../../Interfaces/exam.interfaces';
import { environment } from './../../../../environments/environment.development';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type { SpeakingScoringResult };

@Injectable({
  providedIn: 'root',
})
export class SpeakingService {
  private apiUrl = `${environment.apiUrl}/Speaking`;

  constructor(private http: HttpClient) { }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/json',
    });
  }

  submitSpeakingAnswer(
    audioBlob: Blob,
    questionId: number,
    attemptId?: number
  ): Observable<SpeakingScoringResult> {
    console.log(`[SpeakingService] 🌐 Preparing HTTP request - QuestionId: ${questionId}, AttemptId: ${attemptId}`);
    console.log(`[SpeakingService] 🎵 Audio Details - Size: ${(audioBlob.size / 1024).toFixed(2)}KB, Type: ${audioBlob.type}`);

    const formData = new FormData();
    // Gửi đúng phần mở rộng webm theo định dạng MediaRecorder
    formData.append('audio', audioBlob, 'user-recording.webm');
    formData.append('questionId', questionId.toString());

    if (attemptId && attemptId > 0) {
      formData.append('attemptId', attemptId.toString());
      console.log(`[SpeakingService] 📋 AttemptId included in request: ${attemptId}`);
    } else {
      console.log(`[SpeakingService] ⚠️ No AttemptId provided - backend will auto-create`);
    }

    console.log(`[SpeakingService] 📤 Sending POST to: ${this.apiUrl}/submit-answer`);
    const startTime = Date.now();

    return new Observable<SpeakingScoringResult>(observer => {
      this.http.post<SpeakingScoringResult>(
        `${this.apiUrl}/submit-answer`,
        formData,
        { headers: this.getAuthHeaders() }
      ).subscribe({
        next: (result) => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`[SpeakingService] ✅ Response received in ${elapsed}s - Score: ${result.overallScore}`);
          observer.next(result);
          observer.complete();
        },
        error: (error) => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          console.error(`[SpeakingService] ❌ Request failed after ${elapsed}s`);
          console.error(`[SpeakingService] 📡 Error Details:`, error);
          observer.error(error);
        }
      });
    });
  }
}
