import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ExamDTO, ExamPartDTO } from '../../Interfaces/exam.interfaces';
@Injectable({
  providedIn: 'root'
})
export class ExamService {

  private apiUrl = environment.apiUrl;

  constructor(private httpClient: HttpClient) { }

  public GetAllExams(): Observable<ExamDTO[]> {
    return this.httpClient.get<ExamDTO[]>(`${this.apiUrl}/exam`);
  }
  public GetExamDetailAndPart(examId: number): Observable<ExamDTO> {
    return this.httpClient.get<ExamDTO>(`${this.apiUrl}/exam/${examId}`);
  }
  public GetExamPartDetailAndQuestion(partId: number): Observable<ExamPartDTO> {
    return this.httpClient.get<ExamPartDTO>(`${this.apiUrl}/exam/part/${partId}`);
  }

  public getExamsByTypeAndPart(examType?: string, partCode?: string): Observable<ExamDTO[]> {
    let params = new HttpParams();
    if (examType) params = params.set('examType', examType);
    if (partCode) params = params.set('partCode', partCode);
    return this.httpClient.get<ExamDTO[]>(`${this.apiUrl}/exam`, { params });
  }

}




