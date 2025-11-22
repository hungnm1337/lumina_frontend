import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  MockTestAttemptRequest,
  MockTestAttemptResponse,
  PartAnswersSubmission,
  MockTestResultDTO
} from '../../Interfaces/mocktest.interface';
import { ExamPartDTO } from '../../Interfaces/exam.interfaces';

@Injectable({
  providedIn: 'root'
})
export class MockTestService {
  private apiUrl = `${environment.apiUrl}/mocktest`;

  constructor(private http: HttpClient) {}

  getMocktestQuestions(): Observable<ExamPartDTO[]> {
    return this.http.get<ExamPartDTO[]>(`${this.apiUrl}/questions`);
  }
}
