import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { WritingRequestDTO } from '../../../Interfaces/WrittingExam/WritingRequestDTO.interface';
import { WritingResponseDTO } from '../../../Interfaces/WrittingExam/WritingResponseDTO.interface';
import { WritingAnswerRequestDTO } from '../../../Interfaces/WritingAnswer/WritingAnswerRequestDTO.interface';
@Injectable({
  providedIn: 'root'
})
export class WritingExamPartOneService {

  private apiUrl = environment.apiUrl;

  constructor(private httpClient: HttpClient) { }

  public GetFeedbackOfWritingPartOne(request: WritingRequestDTO): Observable<WritingResponseDTO> {
    return this.httpClient.post<WritingResponseDTO>(`${this.apiUrl}/Writing/get-feedback`, request);
  }

  public SaveWritingAnswer(request: WritingAnswerRequestDTO): Observable<boolean> {
    return this.httpClient.post<boolean>(`${this.apiUrl}/Writing/save-answer`, request);
  }
}
