import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams ,HttpHeaders} from '@angular/common/http';
import { ExamDTO, ExamPartDTO } from '../../Interfaces/exam.interfaces';
@Injectable({
  providedIn: 'root'
})
export class ExamService {

  private apiUrl = environment.apiUrl;

  constructor(private httpClient: HttpClient) { }

    private getAuthHeaders(): HttpHeaders {
      const token = localStorage.getItem('lumina_token');
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
      });
    }

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

  public getAllExamsWithParts(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.apiUrl}/exam/all-with-parts`);
  }

createExamForMonth(fromSetKey: string, toSetKey: string) {
  const params = new HttpParams()
    .set('fromExamSetKey', fromSetKey)
    .set('toExamSetKey', toSetKey);

  return this.httpClient.post<any>(`${this.apiUrl}/exam/CreateExam`, null, {
    headers: this.getAuthHeaders(), 
    params: params
  });
}


  public toggleExamStatus(examId: number): Observable<any> {
    const params = new HttpParams().set('examId', examId.toString());
    return this.httpClient.post<any>(`${this.apiUrl}/exam/toggle-status`, {}, { params });
  }


}




