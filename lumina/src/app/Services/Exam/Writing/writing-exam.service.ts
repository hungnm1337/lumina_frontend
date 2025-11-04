import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { WritingRequestP1DTO } from '../../../Interfaces/WrittingExam/WritingRequestP1DTO.interface';
import { WritingResponseDTO } from '../../../Interfaces/WrittingExam/WritingResponseDTO.interface';
import { WritingAnswerRequestDTO } from '../../../Interfaces/WritingAnswer/WritingAnswerRequestDTO.interface';
import { WritingRequestP23DTO } from '../../../Interfaces/WrittingExam/WritingRequestP23DTO.interface';
@Injectable({
  providedIn: 'root'
})
export class WritingExamPartOneService {

  private apiUrl = environment.apiUrl;

  constructor(private httpClient: HttpClient) { }

  public GetFeedbackOfWritingPartOne(request: WritingRequestP1DTO): Observable<WritingResponseDTO> {
    return this.httpClient.post<WritingResponseDTO>(`${this.apiUrl}/Writing/p1-get-feedback`, request);
  }

  public GetFeedbackOfWritingPartTwoAndThree(request: WritingRequestP23DTO): Observable<WritingResponseDTO> {
    return this.httpClient.post<WritingResponseDTO>(`${this.apiUrl}/Writing/p23-get-feedback`, request);
  }

  public SaveWritingAnswer(request: WritingAnswerRequestDTO): Observable<boolean> {
    return this.httpClient.post<boolean>(`${this.apiUrl}/Writing/save-answer`, request);
  }
}
