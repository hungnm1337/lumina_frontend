import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { WrittingRequestDTO } from '../../../Interfaces/WrittingExam/WrittingRequestDTO.interface';
import { WrittingResponseDTO } from '../../../Interfaces/WrittingExam/WrittingResponseDTO.interface';
@Injectable({
  providedIn: 'root'
})
export class WrittingExamPartOneService {

 private apiUrl = environment.apiUrl;

  constructor(private httpClient: HttpClient) { }

  public GetFeedbackOfWritingPartOne(request : WrittingRequestDTO): Observable<WrittingResponseDTO> {
    return this.httpClient.post<WrittingResponseDTO>(`${this.apiUrl}/WrittingExam/feedback`, request);
  }
}
