import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ScoringMilestoneDTO {
  milestoneId: number;
  name: string;
  minScore: number;
  maxScore: number;
  message: string;
  notificationType: string;
  isActive: boolean;
  createAt?: string | null;
  updateAt?: string | null;
}

export interface CreateScoringMilestoneDTO {
  name: string;
  minScore: number;
  maxScore: number;
  message: string;
  notificationType: string;
  isActive: boolean;
}

export interface UpdateScoringMilestoneDTO extends CreateScoringMilestoneDTO {}

export interface UserMilestoneNotificationDTO {
  notificationId: number;
  userId: number;
  milestoneId: number;
  currentScore: number;
  message: string;
  isRead: boolean;
  createdAt: string;
  userFullName: string;
  milestoneName: string;
}

export interface ScoringRuleDTO {
  ruleId: number;
  ruleName: string;
  description: string;
  baseScore: number;
  difficultyMultiplier: number;
  timeBonusMultiplier: number;
  accuracyMultiplier: number;
  maxTimeSeconds: number;
  isActive: boolean;
  createAt?: string | null;
  updateAt?: string | null;
}

export interface PracticeSessionScoreDTO {
  sessionId: number;
  userId: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  timeSpentSeconds: number;
  baseScore: number;
  difficultyBonus: number;
  timeBonus: number;
  accuracyBonus: number;
  finalScore: number;
  completedAt: string;
  userFullName: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private baseUrl = `${environment.apiUrl}/ScoringMilestone`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('lumina_token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });
  }

  // Milestone management
  getAllMilestones(): Observable<ScoringMilestoneDTO[]> {
    return this.http.get<ScoringMilestoneDTO[]>(`${this.baseUrl}`, { headers: this.getAuthHeaders() });
  }

  getMilestoneById(id: number): Observable<ScoringMilestoneDTO> {
    return this.http.get<ScoringMilestoneDTO>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  createMilestone(body: CreateScoringMilestoneDTO): Observable<number> {
    return this.http.post<number>(`${this.baseUrl}`, body, { headers: this.getAuthHeaders() });
  }

  updateMilestone(id: number, body: UpdateScoringMilestoneDTO): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, body, { headers: this.getAuthHeaders() });
  }

  deleteMilestone(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  // User notifications
  getUserNotifications(userId: number): Observable<UserMilestoneNotificationDTO[]> {
    return this.http.get<UserMilestoneNotificationDTO[]>(`${this.baseUrl}/user/${userId}/notifications`, { headers: this.getAuthHeaders() });
  }

  markNotificationAsRead(notificationId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/notifications/${notificationId}/read`, {}, { headers: this.getAuthHeaders() });
  }

  checkMilestones(userId: number, currentScore: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/check-milestones/${userId}`, currentScore, { headers: this.getAuthHeaders() });
  }

  initializeDefaultMilestones(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/initialize-defaults`, {}, { headers: this.getAuthHeaders() });
  }

  // Scoring rules
  getAllScoringRules(): Observable<ScoringRuleDTO[]> {
    return this.http.get<ScoringRuleDTO[]>(`${environment.apiUrl}/ScoringRule`, { headers: this.getAuthHeaders() });
  }

  calculateSessionScore(userId: number, totalQuestions: number, correctAnswers: number, timeSpentSeconds: number, difficulty: string = 'medium'): Observable<number> {
    const body = { totalQuestions, correctAnswers, timeSpentSeconds, difficulty };
    return this.http.post<number>(`${environment.apiUrl}/ScoringRule/calculate/${userId}`, body, { headers: this.getAuthHeaders() });
  }

  getUserSessionScores(userId: number, page: number = 1, pageSize: number = 10): Observable<PracticeSessionScoreDTO[]> {
    return this.http.get<PracticeSessionScoreDTO[]>(`${environment.apiUrl}/ScoringRule/user/${userId}/scores?page=${page}&pageSize=${pageSize}`, { headers: this.getAuthHeaders() });
  }
}


