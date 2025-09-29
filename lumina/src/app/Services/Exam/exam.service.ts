import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
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

}

export interface ExamDTO {
  examId: number;
  examType: string;
  name: string;
  description: string;
  isActive?: boolean;
  createdBy: number;
  createdByName: string;
  updateBy?: number;
  updateByName?: string;
  createdAt: Date;
  updateAt?: Date;
  examParts?: ExamPartDTO[];
}

export interface ExamPartDTO {
  partId: number;
  examId: number;
  partCode: string;
  title: string;
  orderIndex: number;
  questions: QuestionDTO[];
}

export interface QuestionDTO {
  questionId: number;
  partId: number;
  questionType: string;
  stemText: string;
  promptId?: number;
  scoreWeight: number;
  questionExplain?: string;
  time: number;
  questionNumber: number;
  prompt: PromptDTO;
  options: OptionDTO[];
}

export interface PromptDTO {
  promptId: number;
  passageId?: number;
  skill: string;
  promptText?: string;
  referenceImageUrl?: string;
  referenceAudioUrl?: string;
  passage: PassageDTO;
}

export interface PassageDTO {
  passageId: number;
  title: string;
  contentText: string;
}

export interface OptionDTO {
  optionId: number;
  questionId: number;
  content: string;
  isCorrect?: boolean;
}
